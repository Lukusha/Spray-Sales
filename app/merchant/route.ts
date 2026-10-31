import { env } from 'cloudflare:workers';
import { isOrderAdmin, escapeHtml as e } from '../../lib/orders';
import { verifyMerchantPassword } from '../../lib/standalone-auth';

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'};
  if(env.AUTH_PROVIDER==='cloudflare') {
    if(!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length<20) return new Response('Merchant access is locked. Set the ADMIN_PASSWORD Worker secret to a strong password of at least 20 characters.',{status:503,headers});
    if(!await verifyMerchantPassword(request,env.ADMIN_PASSWORD)) return new Response('Owner login required',{status:401,headers:{...headers,'WWW-Authenticate':'Basic realm="Crystal Care orders", charset="UTF-8"'}});
  } else {
    if(!request.headers.get('oai-authenticated-user-email')) return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Order inbox</title><body style="font:16px system-ui;padding:50px"><h1>Order inbox</h1><p>Only the store owner can view customer orders.</p><a href="/signin-with-chatgpt?return_to=%2Fmerchant" target="_top">Sign in as store owner</a></body></html>',{headers});
    if(!isOrderAdmin(request,env.ORDER_ADMIN_EMAIL)) return new Response('Access denied',{status:403,headers:{'Cache-Control':'no-store'}});
  }
  if(!env.DB) return new Response('Order database unavailable',{status:503,headers});
  const rows=(await env.DB.prepare('SELECT id,created_at,customer_name,phone,city,address,apartment,postal_code,notes,quantity,subtotal_tetri,status FROM orders ORDER BY created_at DESC LIMIT 200').all()).results;
  const cards=rows.map(r=>`<article><div class="top"><h2>${e(r.id)}</h2><time>${e(new Date(Number(r.created_at)).toLocaleString('en-GB',{timeZone:'Asia/Tbilisi'}))} · Tbilisi time</time></div><p class="status">Awaiting phone confirmation · Cash on delivery</p><h3>${e(r.customer_name)}</h3><a href="tel:+${e(r.phone)}">+${e(r.phone)}</a><p>${e(r.city)}, ${e(r.address)}${r.apartment ? ', '+e(r.apartment) : ''}<br>Postal code: ${e(r.postal_code)}</p>${r.notes?'<p>Note: '+e(r.notes)+'</p>':''}<strong>${e(r.quantity)} × YYLFD 100ml · ${(Number(r.subtotal_tetri)/100).toFixed(2)} GEL</strong><p class="hint">Product subtotal. Confirm delivery fee, total and delivery date by phone before dispatch.</p></article>`).join('');
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Crystal Care — Order inbox</title><style>body{font:14px system-ui;background:#f7f7f7;color:#151515;max-width:980px;margin:40px auto;padding:0 20px}header{display:flex;justify-content:space-between;align-items:center;gap:20px}h1{font-size:30px}a{color:#0b1f3a}article{background:white;border:1px solid #ddd;padding:24px;margin:18px 0;border-radius:7px}.top{display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap}.top h2{font-size:17px;margin:0}time,.hint{font-size:12px;color:#777}.status{color:#0b1f3a;font-size:12px}p{line-height:1.7}h3{margin-bottom:10px}.hint{margin-bottom:0}.empty{padding:45px;border:1px solid #ddd;background:white}</style></head><body><header><div><p>CRYSTAL CARE / PRIVATE</p><h1>Order inbox</h1></div><a href="/">View storefront </a></header><p>${rows.length} most recent orders. Refresh to load new submissions. These are order requests, pending your phone confirmation.</p>${cards || '<p class="empty">No orders yet.</p>'}<p class="hint">Customer information is restricted to the store owner. No automatic order email or courier dispatch is configured.</p></body></html>`,{headers});
}
