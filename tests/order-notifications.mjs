import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { notificationInserts, processPendingNotifications, sendNotification } from '../lib/order-notifications.ts';
import { ORDER_EMAILS, ORDER_SMS_NUMBER } from '../lib/order-notification-targets.ts';

// Real SQLite transactions/constraints with a thin D1 interface. No network or production data.
function fixture() {
  const sql=new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON');
  sql.exec(readFileSync(new URL('../drizzle/0000_neat_doomsday.sql',import.meta.url),'utf8'));
  sql.exec(readFileSync(new URL('../drizzle/0001_order_notifications.sql',import.meta.url),'utf8'));
  const db={prepare(query) {
    let values=[];
    const stmt={bind(...args){values=args;return stmt;},async run(){return {meta:{changes:Number(sql.prepare(query).run(...values).changes)}};},
      async first(){return sql.prepare(query).get(...values) || null;},async all(){return {results:sql.prepare(query).all(...values)};}};
    return stmt;
  },async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  const order={id:'CC-123456789ABC',created_at:Date.now(),customer_name:'LOCAL TEST',phone:'995000000001',city:'Tbilisi',address:'DO NOT SHIP - test address',apartment:'',postal_code:'0100',notes:'Test',quantity:2,subtotal_tetri:4990};
  const insert=db.prepare(`INSERT INTO orders(id,request_key,payload_hash,created_at,customer_name,phone,city,address,postal_code,quantity,subtotal_tetri) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(order.id,'local-test-request-key','digest',order.created_at,order.customer_name,order.phone,order.city,order.address,order.postal_code,2,4990);
  return {db,sql,order,insert};
}
const configured={RESEND_API_KEY:'test-only',ORDER_EMAIL_FROM:'orders@example.invalid',TWILIO_ACCOUNT_SID:'AC'+'0'.repeat(32),TWILIO_AUTH_TOKEN:'test-only',TWILIO_MESSAGING_SERVICE_SID:'MG'+'0'.repeat(32)};
const notices=f=>f.sql.prepare('SELECT * FROM order_notifications ORDER BY channel,recipient').all();

test('order and all three destinations commit atomically and repeated enqueue is deduplicated',async()=>{
  const f=fixture();
  await f.db.batch([f.insert,...notificationInserts(f.db,f.order.id,f.order.created_at)]);
  await f.db.batch(notificationInserts(f.db,f.order.id,f.order.created_at));
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM orders').get().n,1);
  assert.equal(notices(f).length,3);
  assert.deepEqual(new Set(notices(f).map(n=>n.recipient)),new Set([...ORDER_EMAILS,ORDER_SMS_NUMBER]));
  const g=fixture();
  await assert.rejects(g.db.batch([g.insert,...notificationInserts(g.db,g.order.id,g.order.created_at),g.db.prepare('INSERT INTO nonexistent VALUES (1)')]));
  assert.equal(g.sql.prepare('SELECT COUNT(*) n FROM orders').get().n,0);
  assert.equal(notices(g).length,0);
});

test('unconfigured alerts are visibly blocked while the order is retained',async()=>{
  const f=fixture();await f.db.batch([f.insert,...notificationInserts(f.db,f.order.id,Date.now())]);
  await processPendingNotifications({DB:f.db});
  assert.ok(notices(f).every(n=>n.status==='blocked' && n.attempts===0));
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM orders').get().n,1);
});

test('independent recipients, claims, and reprocessing do not duplicate accepted sends',async t=>{
  const f=fixture();await f.db.batch([f.insert,...notificationInserts(f.db,f.order.id,Date.now())]);
  const calls=[];
  t.mock.method(globalThis,'fetch',async(url,opts)=>{
    calls.push({url,opts});
    return Response.json(url.includes('resend')?{id:'email-test'}:{sid:'sms-test'},{status:201});
  });
  await Promise.all([processPendingNotifications({...configured,DB:f.db}),processPendingNotifications({...configured,DB:f.db})]);
  await processPendingNotifications({...configured,DB:f.db});
  assert.equal(calls.length,3);assert.ok(notices(f).every(n=>n.status==='submitted'));
  const emails=calls.filter(c=>c.url.includes('resend'));
  assert.equal(emails.length,2);
  assert.ok(emails.every(c=>c.opts.headers['Idempotency-Key']));
  const message=JSON.parse(emails[0].opts.body);assert.match(message.text,/49.90 GEL/);assert.match(message.text,/DO NOT SHIP/);
  const sms=new URLSearchParams(calls.find(c=>c.url.includes('twilio')).opts.body);
  assert.equal(sms.get('To'),ORDER_SMS_NUMBER);assert.doesNotMatch(sms.get('Body'),/DO NOT SHIP/);
});

test('a rejected recipient does not prevent other alerts or remove the order',async t=>{
  const f=fixture();await f.db.batch([f.insert,...notificationInserts(f.db,f.order.id,Date.now())]);
  t.mock.method(globalThis,'fetch',async(url,opts)=>{
    if(url.includes('resend') && JSON.parse(opts.body).to[0]===ORDER_EMAILS[0]) return new Response('private provider details',{status:429});
    return Response.json(url.includes('resend')?{id:'email-test'}:{sid:'sms-test'});
  });
  await processPendingNotifications({...configured,DB:f.db});
  assert.equal(notices(f).filter(n=>n.status==='submitted').length,2);
  assert.equal(notices(f).find(n=>n.recipient===ORDER_EMAILS[0]).last_error,'Provider HTTP 429');
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM orders').get().n,1);
});

test('ambiguous SMS and expired leases require review rather than duplicate sends',async()=>{
  const f=fixture();await f.db.batch([f.insert,...notificationInserts(f.db,f.order.id,Date.now())]);
  const notice=notices(f).find(n=>n.channel==='sms');
  const failure=await sendNotification(notice,f.order,configured,async()=>{throw new Error('secret-looking provider error');});
  assert.equal(failure.status,'uncertain');assert.doesNotMatch(failure.error,/secret-looking/);
  f.sql.prepare("UPDATE order_notifications SET status='sending',locked_until=0 WHERE id=?").run(notice.id);
  await processPendingNotifications({DB:f.db});
  assert.equal(notices(f).find(n=>n.channel==='sms').status,'uncertain');
});

test('unauthorized recipients are rejected without a network request',async()=>{
  const f=fixture();let called=false;
  const result=await sendNotification({id:'test',channel:'email',recipient:'attacker@example.invalid'},f.order,configured,async()=>{called=true;throw new Error();});
  assert.equal(result.status,'failed');assert.equal(called,false);
});
