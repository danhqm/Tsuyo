import { test } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { cart,delivery,checkoutParameters,billingCustomerParameters,makeCommerce } from '../supabase/functions/_shared/commerce.mjs';
import { makeWebhook } from '../supabase/functions/_shared/webhook.mjs';
const id='20000000-0000-4000-8000-000000000001';
const request=(body,headers={})=>new Request('https://api.example/store-api',{method:'POST',headers:{apikey:'public-key',...headers},body:JSON.stringify(body)});
test('cart and address normalization reject malformed data and discard prices',()=>{
  assert.deepEqual(cart([{variant_id:id,quantity:2,price_minor:1,discount:9999}]),[{variant_id:id,quantity:2}]);
  for(const quantity of [0,-1,1.5,11,'2'])assert.throws(()=>cart([{variant_id:id,quantity}]));
  assert.throws(()=>cart([{variant_id:id,quantity:1},{variant_id:id,quantity:1}]));
  assert.throws(()=>delivery({line1:'X',city:'Y',region:'Z',country:'MY',postal_code:'abc'}));
});
test('Stripe parameters use the stored snapshot, configured origin and integer MYR amounts',()=>{
  const order={id,email:'test@example.com',shipping_name:'Test delivery',shipping_minor:800,tax_mode:'inclusive',created_at:'2026-10-06T00:00:00Z'};
  const params=checkoutParameters(order,[{name:'Tee',size:'M',color:'Onyx',quantity:2,unit_price_minor:14900}],'https://tsuyo.example');
  assert.equal(params.line_items[0].price_data.unit_amount,14900);assert.equal(params.line_items[0].quantity,2);
  assert.deepEqual(params.payment_method_types,['card']);assert.equal(params.shipping_options[0].shipping_rate_data.fixed_amount.amount,800);
  assert.equal(params.success_url,`https://tsuyo.example/checkout/complete?order=${id}`);
  const customer=billingCustomerParameters({...order,recipient:'Test Customer',shipping_address:{line1:'1 Test Street',city:'Test City',region:'Selangor',country:'MY',postal_code:'50000'}});
  assert.equal(customer.shipping.address.state,'Selangor');assert.equal(customer.shipping.address.country,'MY');
  const snapshot=checkoutParameters(order,[],'https://tsuyo.example',null,'cus_fixture');assert.equal(snapshot.customer,'cus_fixture');assert.equal(snapshot.customer_email,undefined);
});
test('staff authorization ignores user-editable metadata; public clients cannot call admin actions',async()=>{
  let writes=0;
  const commerce=makeCommerce({storeURL:'https://tsuyo.example',publishableKey:'public-key',stripe:null,
    db:{rpc(){writes++;throw new Error('Unexpected write');}},auth:{auth:{getUser:async()=>({data:{user:{id,user_metadata:{admin:true,role:'owner'}}},error:null})}},
    scopedClient:()=>({rpc:async()=>({data:false,error:null})})});
  assert.equal((await commerce.handle(request({action:'admin.overview'}))).status,401);
  assert.equal((await commerce.handle(request({action:'admin.stock',variant_id:id,delta:999,reason:'Forged role'},{Authorization:'Bearer forged-metadata'}))).status,403);
  assert.equal(writes,0);
  assert.equal((await commerce.handle(request({action:'quote',items:[]}))).status,400);
  assert.equal((await commerce.handle(request({action:'checkout'}))).status,503);
  assert.equal((await commerce.handle(request({action:'newsletter',email:'test@example.com',consent:false}))).status,400);
  assert.equal((await commerce.handle(request({action:'quote'},{Origin:'https://evil.example'}))).status,403);
  assert.equal((await commerce.handle(request({action:'quote',unused:'a'.repeat(40000)}))).status,413);
});
test('webhook verifies the raw-body signature, ignores unrelated sessions and retries failed writes',async()=>{
  const stripe=new Stripe('sk_test_local_fixture_only');const secret='whsec_local_fixture_only';let settled=0;
  const commerce={settle:async()=>{settled++;}};
  let handler=makeWebhook({stripe,secret,cryptoProvider:Stripe.createSubtleCryptoProvider(),commerce,db:{}});
  const payload=JSON.stringify({id:'evt_test',type:'checkout.session.completed',data:{object:{id:'cs_test',metadata:{order_id:id},payment_status:'paid'}}});
  const signed=value=>new Request('https://api.example/stripe-webhook',{method:'POST',headers:{'stripe-signature':stripe.webhooks.generateTestHeaderString({payload:value,secret})},body:value});
  assert.equal((await handler(new Request('https://api.example/stripe-webhook',{method:'POST',body:payload}))).status,400);assert.equal(settled,0);
  assert.equal((await handler(signed(payload))).status,200);assert.equal(settled,1);
  const unrelated=JSON.stringify({id:'evt_other',type:'checkout.session.completed',data:{object:{metadata:{}}}});
  assert.equal((await handler(signed(unrelated))).status,200);assert.equal(settled,1);
  handler=makeWebhook({stripe,secret,cryptoProvider:Stripe.createSubtleCryptoProvider(),commerce:{settle:async()=>{throw new Error('Unavailable');}},db:{}});
  assert.equal((await handler(signed(payload))).status,500);
});
