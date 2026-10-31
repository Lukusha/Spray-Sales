import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyMerchantPassword } from '../lib/standalone-auth.ts';

const password='Synthetic-only-password-12345';
const request=(credential,extra={})=>new Request('https://store.example/merchant',{headers:{...extra,...(credential?{Authorization:'Basic '+Buffer.from(credential).toString('base64')}: {})}});
test('standalone owner inbox accepts only the configured admin password',async()=>{
  assert.equal(await verifyMerchantPassword(request('admin:'+password),password),true);
  assert.equal(await verifyMerchantPassword(request('admin:wrong'),password),false);
  assert.equal(await verifyMerchantPassword(request('other:'+password),password),false);
  assert.equal(await verifyMerchantPassword(request(null,{'oai-authenticated-user-email':'owner@example.com'}),password),false);
  assert.equal(await verifyMerchantPassword(request('admin:short'),'short'),false);
  assert.equal(await verifyMerchantPassword(request('admin:'+password),''),false);
});
test('malformed credentials fail closed and UTF-8 credentials work',async()=>{
  const malformed=new Request('https://store.example/merchant',{headers:{Authorization:'Basic %not-base64'}});
  assert.equal(await verifyMerchantPassword(malformed,password),false);
  const unicode=password+'é';
  assert.equal(await verifyMerchantPassword(request('admin:'+unicode),unicode),true);
});
