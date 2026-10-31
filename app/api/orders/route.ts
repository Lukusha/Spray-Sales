import { env } from 'cloudflare:workers';
import { validateOrder, payloadDigest, ValidationError, UNIT_PRICE } from '../../../lib/orders';
import { notificationInserts } from '../../../lib/order-notifications';

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: {'Cache-Control': 'no-store'} });
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({error:'მოთხოვნა უარყოფილია.'},403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({error:'არასწორი მოთხოვნა.'},415);
  if (Number(request.headers.get('content-length')) > 8192) return json({error:'მოთხოვნა ძალიან დიდია.'},413);
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({error:'ცარიელი მოთხოვნა.'},400);
    const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 8192) { try { await reader.cancel(); } catch {} return json({error:'მოთხოვნა ძალიან დიდია.'},413); }
      chunks.push(chunk.value);
    }
    const all = new Uint8Array(bytes); let offset=0;
    for (const chunk of chunks) { all.set(chunk,offset); offset += chunk.byteLength; }
    let raw; try { raw=JSON.parse(new TextDecoder().decode(all)); } catch {return json({error:'არასწორი მოთხოვნა.'},400);}
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return json({error:'არასწორი მოთხოვნა.'},400);
    const data=validateOrder(raw), hash=await payloadDigest(data), db=env.DB;
    if (!db) return json({error:'შეკვეთა ჯერ არ შენახულა. გთხოვ, სცადე მოგვიანებით.'},503);
    const previous = await db.prepare('SELECT id, payload_hash FROM orders WHERE request_key = ?').bind(data.requestKey).first<{id:string,payload_hash:string}>();
    if (previous) return previous.payload_hash===hash ? json({id:previous.id,subtotalTetri:UNIT_PRICE*data.quantity},200) : json({error:'შეკვეთა შეიცვალა. დახურე ფორმა და სცადე თავიდან.'},409);
    const recent=await db.prepare('SELECT COUNT(*) AS count FROM orders WHERE phone = ? AND created_at > ?').bind(data.phone,Date.now()-600000).first<{count:number}>();
    if (recent && recent.count >= 5) return json({error:'ამ ნომრიდან რამდენიმე მოთხოვნა უკვე მიღებულია. სცადე 10 წუთში.'},429);
    const id='CC-'+crypto.randomUUID().replace(/-/g,'').slice(0,12).toUpperCase();
    const now=Date.now();
    // The order and all three notification jobs commit together in a D1 transaction.
    await db.batch([
      db.prepare(`INSERT INTO orders (id,request_key,payload_hash,created_at,customer_name,phone,city,address,apartment,postal_code,notes,quantity,unit_price_tetri,subtotal_tetri,payment_method,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(request_key) DO NOTHING`).bind(id,data.requestKey,hash,now,data.customerName,data.phone,data.city,data.address,data.apartment,data.postalCode,data.notes,data.quantity,UNIT_PRICE,UNIT_PRICE*data.quantity,'cash_on_delivery','pending_confirmation'),
      ...notificationInserts(db,id,now),
    ]);
    const saved=await db.prepare('SELECT id,payload_hash FROM orders WHERE request_key = ?').bind(data.requestKey).first<{id:string,payload_hash:string}>();
    if (!saved || saved.payload_hash !== hash) return json({error:'შეკვეთა ვერ დადასტურდა. გთხოვ, სცადე ხელახლა.'},409);
    return json({id:saved.id,subtotalTetri:UNIT_PRICE*data.quantity},201);
  } catch(error) {
    if(error instanceof ValidationError) return json({error:error.message},400);
    console.error('Order persistence failed');
    return json({error:'შეკვეთის შენახვა ვერ დადასტურდა. სცადე ხელახლა; განმეორებითი გაგზავნა დუბლირებულ შეკვეთას არ შექმნის.'},503);
  }
}
