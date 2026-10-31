import test from 'node:test';
import assert from 'node:assert/strict';
import { emailJsReady,sendEmailJs } from '../lib/emailjs.ts';
import { sendNotification } from '../lib/order-notifications.ts';
const env={ORDER_EMAIL_PROVIDER:'emailjs',EMAILJS_SERVICE_ID:'service_test',EMAILJS_PUBLIC_KEY:'public_test',EMAILJS_TEMPLATE_LUCKY:'template_lucky',EMAILJS_TEMPLATE_EKA:'template_eka'};

test('EmailJS selects a fixed template per authorized recipient and submits canonical order text',async()=>{
  for(const [to,template] of [['luckysaba37@gmail.com','template_lucky'],['ekatibua1974@gmail.com','template_eka']]) {
    const result=await sendEmailJs(to,'CC-TEST','ქართული details',env,async(url,options)=>{
      assert.equal(url,'https://api.emailjs.com/api/v1.0/email/send');
      const body=JSON.parse(options.body);assert.equal(body.template_id,template);assert.equal(body.service_id,env.EMAILJS_SERVICE_ID);
      assert.deepEqual(body.template_params,{order_id:'CC-TEST',order_details:'ქართული details'});assert.equal('to_email' in body.template_params,false);
      return new Response('OK');
    });assert.equal(result.status,'submitted');
  }
});
test('unconfigured or unauthorized EmailJS sends do not make network requests',async()=>{
  assert.equal(emailJsReady(env),true);assert.equal(emailJsReady({...env,EMAILJS_TEMPLATE_EKA:''}),false);
  const never=async()=>assert.fail('must not send');
  assert.equal((await sendEmailJs('attacker@example.invalid','CC-TEST','details',env,never)).status,'failed');
  assert.equal((await sendEmailJs('luckysaba37@gmail.com','CC-TEST','details',{},never)).status,'failed');
});
test('rate limits can retry while ambiguous responses require review and errors are sanitized',async()=>{
  const send=response=>sendEmailJs('luckysaba37@gmail.com','CC-TEST','details',env,async()=>response);
  assert.equal((await send(new Response('quota',{status:429}))).status,'retry');
  const denied=await send(new Response('private response data',{status:403}));assert.equal(denied.error,'EmailJS HTTP 403');
  assert.equal((await send(new Response('server issue',{status:500}))).status,'uncertain');
  assert.equal((await sendEmailJs('luckysaba37@gmail.com','CC-TEST','details',env,async()=>{throw new Error('private data');})).status,'uncertain');
});
test('email notification dispatcher uses EmailJS without contacting Gmail SMTP or Resend',async()=>{
  const order={id:'CC-TEST',created_at:Date.now(),customer_name:'Test',phone:'995000000001',city:'Test',address:'Test address',postal_code:'0000',quantity:1,subtotal_tetri:2495};
  const result=await sendNotification({id:'notice',channel:'email',recipient:'ekatibua1974@gmail.com'},order,env,
    async(url,options)=>{assert.equal(url,'https://api.emailjs.com/api/v1.0/email/send');assert.match(JSON.parse(options.body).template_params.order_details,/24.95 GEL/);return new Response('OK');},
    async()=>assert.fail('must not use SMTP'));
  assert.equal(result.status,'submitted');
});
