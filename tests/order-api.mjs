import test from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.ORDER_TEST_URL || 'http://127.0.0.1:4173';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Tests must use a local database, never production.');
const body = () => ({requestKey:crypto.randomUUID(),customerName:'TEST - LOCAL ONLY',phone:'000000001',city:'TEST CITY',address:'TEST ADDRESS - DO NOT SHIP',apartment:'',postalCode:'0000',notes:'Synthetic test record',quantity:2,website:''});
const post = (data,origin=base) => fetch(base+'/api/orders',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)});

test('cash-on-delivery subtotal uses server pricing and retry saves once',async()=>{
  const data={...body(),unitPrice:0,subtotalTetri:1};
  const first=await post(data); assert.equal(first.status,201);
  const saved=await first.json(); assert.equal(saved.subtotalTetri,4990); assert.match(saved.id,/^CC-[A-F0-9]{12}$/);
  const retry=await post(data);assert.equal(retry.status,200);assert.equal((await retry.json()).id,saved.id);
  const changed=await post({...data,quantity:3});assert.equal(changed.status,409);
});
test('rejects invalid quantities and postal codes',async()=>{
  for(const change of [{quantity:0},{quantity:1.5},{quantity:100},{postalCode:'12345'},{phone:'abcd'}]) assert.equal((await post({...body(),...change})).status,400);
});
test('rejects cross-origin and oversized submissions',async()=>{
  assert.equal((await post(body(),'https://untrusted.example')).status,403);
  assert.equal((await post({...body(),notes:'x'.repeat(9000)})).status,413);
});
test('owner inbox does not reveal orders to anonymous or unauthorized visitors',async()=>{
  const anonymous=await fetch(base+'/merchant'); const html=await anonymous.text();
  assert.equal(anonymous.status,200);assert.match(html,/Sign in as store owner/);assert.doesNotMatch(html,/TEST ADDRESS/);
  const denied=await fetch(base+'/merchant',{headers:{'oai-authenticated-user-email':'not-the-owner@example.invalid'}});assert.equal(denied.status,403);
});
