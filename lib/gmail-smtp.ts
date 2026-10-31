export const GMAIL_SENDER = 'luka.beraia808@gmail.com';
type Socket = {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  close(): Promise<void>;
};
type Connect = () => Promise<Socket>;
type Result = {status:'submitted'|'retry'|'failed'|'uncertain'; providerId?:string; error?:string};
class SmtpError extends Error {
  code: number;
  constructor(code: number) {super(`Gmail SMTP ${code}`);this.code=code;}
}
const base64 = (value: string) => btoa(Array.from(new TextEncoder().encode(value), b=>String.fromCharCode(b)).join(''));
const openGmail: Connect = async () => {
  const {connect}=await import('cloudflare:sockets');
  return connect({hostname:'smtp.gmail.com',port:465},{secureTransport:'on',allowHalfOpen:false});
};

/** Gmail only, with TLS from the first byte. Never accepts a custom SMTP host or logs responses. */
export async function sendGmailSmtp(
  to: string, subject: string, text: string, messageKey: string, appPassword: string,
  connect: Connect = openGmail, timeoutMs = 9000,
): Promise<Result> {
  if(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(to)) return {status:'failed',error:'Invalid email recipient.'};
  const password=appPassword.replace(/\s/g,'');
  if(!/^[a-zA-Z0-9]{16}$/.test(password)) return {status:'failed',error:'Gmail App Password must contain 16 characters.'};
  let socket: Socket | undefined, dataStarted=false, stopped=false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deliver=async (): Promise<Result> => {
    socket=await connect();
    if(stopped) {await socket.close();throw new Error('Timed out');}
    const reader=socket.readable.getReader(), writer=socket.writable.getWriter();
    const encoder=new TextEncoder(), decoder=new TextDecoder();
    let buffered='';
    const response=async (expected: number) => {
      let code=0, lines=0, total=0;
      while(true) {
        while(!buffered.includes('\r\n')) {
          const chunk=await reader.read();
          if(chunk.done) throw new Error('SMTP connection closed');
          buffered+=decoder.decode(chunk.value,{stream:true});
          if(buffered.length>65536) throw new Error('Invalid SMTP response');
        }
        const end=buffered.indexOf('\r\n'), line=buffered.slice(0,end);buffered=buffered.slice(end+2);
        const match=/^(\d{3})([ -])/.exec(line);
        total+=line.length;
        if(!match || ++lines>100 || total>65536 || code && code!==Number(match[1])) throw new Error('Invalid SMTP response');
        code=Number(match[1]);
        if(match[2]===' ') {
          if(code!==expected) throw new SmtpError(code);
          return;
        }
      }
    };
    const command=async (line: string, code: number) => {await writer.write(encoder.encode(line+'\r\n'));await response(code);};
    await response(220);
    await command('EHLO spray-sales.etnrepschool.workers.dev',250);
    await command('AUTH PLAIN '+base64('\0'+GMAIL_SENDER+'\0'+password),235);
    await command(`MAIL FROM:<${GMAIL_SENDER}>`,250);
    await command(`RCPT TO:<${to}>`,250);
    await command('DATA',354);
    const digest=await crypto.subtle.digest('SHA-256',encoder.encode(messageKey));
    const id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const messageId=`crystal-care.${id}@gmail.com`;
    const body=base64(text).match(/.{1,76}/g)?.join('\r\n') || '';
    const mime=[`From: Crystal Care <${GMAIL_SENDER}>`,`To: <${to}>`,
      `Subject: =?UTF-8?B?${base64(subject)}?=`,`Date: ${new Date().toUTCString()}`,`Message-ID: <${messageId}>`,
      'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',body,''].join('\r\n');
    // Once DATA starts, a lost acknowledgment is ambiguous. Gmail SMTP has no idempotency-key API.
    dataStarted=true;
    await writer.write(encoder.encode(mime+'.\r\n'));
    await response(250);
    return {status:'submitted',providerId:messageId};
  };
  try {
    return await Promise.race([deliver(),new Promise<never>((_,reject)=>{
      timer=setTimeout(()=>{stopped=true;void socket?.close().catch(()=>{});reject(new Error('SMTP timeout'));},timeoutMs);
    })]);
  } catch(error) {
    if(error instanceof SmtpError) return {status:error.code>=400 && error.code<500?'retry':'failed',error:error.message};
    return {status:dataStarted?'uncertain':'retry',error:dataStarted?'Gmail acceptance could not be confirmed; review Sent mail before retrying.':'Gmail connection could not be completed.'};
  } finally {
    stopped=true;
    if(timer) clearTimeout(timer);
    await socket?.close().catch(()=>{});
  }
}
