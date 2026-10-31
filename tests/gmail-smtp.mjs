import test from 'node:test';
import assert from 'node:assert/strict';
import { sendGmailSmtp, GMAIL_SENDER } from '../lib/gmail-smtp.ts';
import { sendNotification } from '../lib/order-notifications.ts';

const password='abcdefghijklmnop';
function smtpFixture({auth='235 2.7.0 accepted\r\n',rcpt='250 accepted\r\n',afterData='250 2.0.0 queued\r\n',hang=false}={}) {
  let controller,closed=false,step=0;
  const writes=[];
  const enqueue=text=>{for(let i=0;i<text.length;i+=7)controller.enqueue(new TextEncoder().encode(text.slice(i,i+7)));};
  const replies=['250-smtp.gmail.com\r\n250-AUTH LOGIN PLAIN\r\n250 SIZE 35882577\r\n',auth,'250 sender\r\n',rcpt,'354 send data\r\n',afterData];
  const socket={readable:new ReadableStream({start(c){controller=c;if(!hang)enqueue('220 smtp.gmail.com ready\r\n');}}),
    writable:new WritableStream({write(chunk){writes.push(new TextDecoder().decode(chunk));const reply=replies[step++];if(reply)enqueue(reply);else {controller.close();closed=true;}}}),
    async close(){if(!closed){closed=true;controller.close();}}};
  return {writes,socket,connect:async()=>socket};
}

test('Gmail authenticates as the requested sender and safely encodes Georgian order details',async()=>{
  const f=smtpFixture();
  const result=await sendGmailSmtp('luckysaba37@gmail.com','Crystal Care order CC-TEST','სახელი\nAddress: test','order-key',password,f.connect);
  assert.equal(result.status,'submitted');
  assert.equal(f.writes[2],`MAIL FROM:<${GMAIL_SENDER}>\r\n`);
  assert.equal(f.writes[3],'RCPT TO:<luckysaba37@gmail.com>\r\n');
  const credential=Buffer.from(f.writes[1].split(' ')[2].trim(),'base64').toString();
  assert.equal(credential,`\0${GMAIL_SENDER}\0${password}`);
  const mime=f.writes[5];assert.match(mime,/Content-Transfer-Encoding: base64/);
  const body=mime.split('\r\n\r\n')[1].replace(/\.\r\n$/,'');
  assert.equal(Buffer.from(body,'base64').toString(),'სახელი\nAddress: test');
  assert.doesNotMatch(mime,new RegExp(password));
});

test('SMTP auth rejection is sanitized and does not send customer content',async()=>{
  const f=smtpFixture({auth:'535 5.7.8 private server response\r\n'});
  const result=await sendGmailSmtp('test@example.invalid','Order','PRIVATE CUSTOMER DATA','key',password,f.connect);
  assert.deepEqual(result,{status:'failed',error:'Gmail SMTP 535'});
  assert.equal(f.writes.length,2);
});

test('definitive temporary rejection can retry; lost DATA acknowledgment needs review',async()=>{
  const rejected=smtpFixture({rcpt:'451 temporary error\r\n'});
  assert.equal((await sendGmailSmtp('test@example.invalid','Order','Text','key',password,rejected.connect)).status,'retry');
  const lost=smtpFixture({afterData:''});
  assert.equal((await sendGmailSmtp('test@example.invalid','Order','Text','key',password,lost.connect)).status,'uncertain');
});

test('hung connection is bounded and invalid credentials/recipients never connect',async()=>{
  const f=smtpFixture({hang:true});
  assert.equal((await sendGmailSmtp('test@example.invalid','Order','Text','key',password,f.connect,20)).status,'retry');
  const never=async()=>{assert.fail('must not connect');};
  assert.equal((await sendGmailSmtp('test@example.invalid\r\nBcc:attacker@example.invalid','Order','Text','key',password,never)).status,'failed');
  assert.equal((await sendGmailSmtp('test@example.invalid','Order','Text','key','ordinary-password',never)).status,'failed');
});

test('Gmail provider bypasses Resend and uses the configured Gmail secret',async()=>{
  const notice={id:'notice-key',channel:'email',recipient:'ekatibua1974@gmail.com'};
  const order={id:'CC-TEST',created_at:Date.now(),customer_name:'Test',phone:'995000000001',city:'Test',address:'Test address',postal_code:'0000',quantity:1,subtotal_tetri:2495};
  let called=false;
  const result=await sendNotification(notice,order,{ORDER_EMAIL_PROVIDER:'gmail',GMAIL_APP_PASSWORD:password},async()=>assert.fail('must not use Resend'),async(to,subject,text,key,secret)=>{
    called=true;assert.equal(to,notice.recipient);assert.equal(secret,password);assert.match(text,/24.95 GEL/);assert.equal(key,notice.id);return {status:'submitted',providerId:'smtp-test'};
  });
  assert.equal(called,true);assert.equal(result.status,'submitted');
});
