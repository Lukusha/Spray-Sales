import { ORDER_EMAILS, ORDER_SMS_NUMBER, ORDER_INBOX_URL } from './order-notification-targets.ts';

export interface NotificationEnv {
  DB?: D1Database;
  ORDER_EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_MESSAGING_SERVICE_SID?: string;
}
type Order = {
  id: string; created_at: number; customer_name: string; phone: string;
  city: string; address: string; apartment: string; postal_code: string;
  notes: string; quantity: number; subtotal_tetri: number;
};
type Notice = {id:string; order_id:string; channel:'email'|'sms'; recipient:string; attempts:number; created_at:number};
type Outcome = {status:'submitted'|'retry'|'failed'|'uncertain'; providerId?:string; error?:string};

export function notificationInserts(db: D1Database, orderId: string, now: number) {
  return [...ORDER_EMAILS.map(recipient => ({channel:'email',recipient})), {channel:'sms',recipient:ORDER_SMS_NUMBER}]
    .map(({channel,recipient}) => db.prepare(`INSERT INTO order_notifications (id,order_id,channel,recipient,created_at)
      SELECT ?,id,?,?,? FROM orders WHERE id=? ON CONFLICT(order_id,channel,recipient) DO NOTHING`)
      .bind(`${orderId}:${channel}:${recipient}`,channel,recipient,now,orderId));
}

function missingConfiguration(channel: Notice['channel'], env: NotificationEnv) {
  if(channel==='email') return !env.RESEND_API_KEY || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(env.ORDER_EMAIL_FROM || '')
    ? 'Email service not configured: set RESEND_API_KEY and a verified ORDER_EMAIL_FROM.' : null;
  return !/^AC[0-9a-f]{32}$/i.test(env.TWILIO_ACCOUNT_SID || '') || !env.TWILIO_AUTH_TOKEN || !/^MG[0-9a-f]{32}$/i.test(env.TWILIO_MESSAGING_SERVICE_SID || '')
    ? 'SMS service not configured: set Twilio account, auth token and Messaging Service.' : null;
}

export function emailText(order: Order) {
  return [
    `New Crystal Care order: ${order.id}`,
    `Received: ${new Date(order.created_at).toLocaleString('en-GB',{timeZone:'Asia/Tbilisi'})} (Tbilisi)`,
    `Customer: ${order.customer_name}`, `Phone: +${order.phone}`,
    `City: ${order.city}`, `Address: ${order.address}`, `Apartment / floor: ${order.apartment || '-'}`,
    `Postal code: ${order.postal_code}`, `Notes: ${order.notes || '-'}`,
    `Product: YYLFD chandelier cleaner, 100ml`, `Quantity: ${order.quantity}`,
    `Product subtotal: ${(order.subtotal_tetri / 100).toFixed(2)} GEL`,
    'Payment: cash on delivery. Confirm the delivery fee, final total and date by phone before dispatch.',
    `Private order inbox: ${ORDER_INBOX_URL}`,
  ].join('\n');
}

// Provider acceptance is recorded as submitted; it is not proof of inbox/handset delivery.
export async function sendNotification(notice: Notice, order: Order, env: NotificationEnv, send: typeof fetch = fetch): Promise<Outcome> {
  if(notice.channel==='email' && !(ORDER_EMAILS as readonly string[]).includes(notice.recipient) || notice.channel==='sms' && notice.recipient!==ORDER_SMS_NUMBER)
    return {status:'failed',error:'Recipient is not authorized.'};
  const email=notice.channel==='email';
  try {
    const response = email
      ? await send('https://api.resend.com/emails', {
        method:'POST', signal:AbortSignal.timeout(10000),
        headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':notice.id},
        body:JSON.stringify({from:env.ORDER_EMAIL_FROM,to:[notice.recipient],subject:`Crystal Care order ${order.id}`,text:emailText(order)}),
      })
      : await send(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method:'POST', signal:AbortSignal.timeout(10000),
        headers:{Authorization:'Basic '+btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`),'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({To:notice.recipient,MessagingServiceSid:env.TWILIO_MESSAGING_SERVICE_SID!,
          Body:`Crystal Care: new order ${order.id}. ${order.quantity} x 100ml; ${(order.subtotal_tetri/100).toFixed(2)} GEL. Cash on delivery. View: ${ORDER_INBOX_URL}`}),
      });
    // Never persist a provider's raw response: it may contain customer data or credentials.
    if(!response.ok) return {status:response.status===429 ? 'retry' : response.status>=500 ? (email?'retry':'uncertain') : 'failed',error:`Provider HTTP ${response.status}`};
    const result = await response.json() as {id?:string;sid?:string};
    const providerId=email?result.id:result.sid;
    return providerId ? {status:'submitted',providerId} : {status:email?'retry':'uncertain',error:'Provider response did not confirm acceptance.'};
  } catch {
    // Resend deduplicates within 24h. An ambiguous SMS response needs review, not an automatic second text.
    return {status:email?'retry':'uncertain',error:'Provider request timed out or could not be confirmed.'};
  }
}

export async function processPendingNotifications(env: NotificationEnv) {
  const db=env.DB; if(!db) return;
  const now=Date.now();
  // An interrupted send may have reached the provider. Do not resend after its lease expires.
  await db.prepare(`UPDATE order_notifications SET status='uncertain',last_error='Send interrupted; review provider before retrying.'
    WHERE status='sending' AND locked_until < ?`).bind(now).run();
  const pending=(await db.prepare(`SELECT id,order_id,channel,recipient,attempts,created_at FROM order_notifications
    WHERE status IN ('pending','retry','blocked') AND next_attempt_at <= ? ORDER BY created_at,id LIMIT 12`).bind(now).all<Notice>()).results;
  for(const notice of pending) {
    if(Date.now()-now>15000) break; // Leave headroom within the request background-work lifetime.
    const missing=missingConfiguration(notice.channel,env);
    if(missing) {
      await db.prepare(`UPDATE order_notifications SET status='blocked',last_error=?,next_attempt_at=?
        WHERE id=? AND status IN ('pending','retry','blocked')`).bind(missing,now+300000,notice.id).run();
      continue;
    }
    // Stay well inside Resend's 24h idempotency window. Older unsent alerts remain visible for manual review.
    if(notice.attempts>=6 || notice.attempts>0 && now-notice.created_at>20*3600000) {
      await db.prepare(`UPDATE order_notifications SET status='failed',last_error='Automatic retry limit reached.'
        WHERE id=? AND status IN ('pending','retry','blocked')`).bind(notice.id).run();
      continue;
    }
    const token=crypto.randomUUID();
    const claim=await db.prepare(`UPDATE order_notifications SET status='sending',claim_token=?,locked_until=?,attempts=attempts+1
      WHERE id=? AND status IN ('pending','retry','blocked') AND next_attempt_at<=?`).bind(token,now+120000,notice.id,now).run();
    if(claim.meta.changes!==1) continue;
    const order=await db.prepare('SELECT * FROM orders WHERE id=?').bind(notice.order_id).first<Order>();
    const result=order ? await sendNotification(notice,order,env) : {status:'failed',error:'Order not found.'} as Outcome;
    await db.prepare(`UPDATE order_notifications SET status=?,provider_id=?,last_error=?,submitted_at=?,locked_until=0,claim_token=NULL,next_attempt_at=?
      WHERE id=? AND claim_token=? AND status='sending'`).bind(result.status,result.providerId || null,result.error || null,
      result.status==='submitted'?Date.now():null,now+300000*Math.pow(2,notice.attempts),notice.id,token).run();
  }
}
