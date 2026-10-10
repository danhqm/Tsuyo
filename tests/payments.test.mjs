import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stripeConfiguration,makePaymentTools} from '../supabase/functions/_shared/payments.mjs';
const actor='10000000-0000-4000-8000-000000000001';
function provider(overrides={}){
 return {accounts:{retrieve:async()=>({id:'acct_fixture'})},balance:{retrieve:async()=>({livemode:false})},checkout:{sessions:{create:async()=>({id:'cs_test_fixture',url:'https://checkout.stripe.com/c/pay/cs_test_fixture',livemode:false}),retrieve:async()=>({id:'cs_test_fixture',livemode:false,status:'complete',payment_status:'paid',currency:'myr',amount_total:14900,metadata:{tsuyo_payment_test:'true',staff_id:actor}})}},...overrides};
}
const tools=stripe=>makePaymentTools({stripe,mode:'test',storeURL:'https://tsuyo.example',expectedAccount:'acct_fixture',webhookConfigured:true});
test('test mode rejects live/missing keys and invalid configured modes',()=>{
 assert.equal(stripeConfiguration('sk_live_fixture','test').valid,false);
 assert.equal(stripeConfiguration(undefined).valid,false);
 assert.equal(stripeConfiguration('sk_test_fixture').valid,true);
 assert.equal(stripeConfiguration('sk_live_fixture','live').valid,true);
 assert.equal(stripeConfiguration('sk_test_fixture','unknown').valid,false);
});
test('sandbox checkout uses actual stored price and does not expose a normal order id',async()=>{
 let parameters;
 const stripe=provider();stripe.checkout.sessions.create=async(p)=>{parameters=p;return {id:'cs_test_fixture',url:'https://checkout.stripe.com/c/pay/cs_test_fixture',livemode:false};};
 await tools(stripe).testCheckout({id:'variant',size:'M',price_minor:14900,products:{name:'Core Tee'}},actor,crypto.randomUUID());
 assert.equal(parameters.line_items[0].price_data.unit_amount,14900);
 assert.equal(parameters.line_items[0].price_data.currency,'myr');
 assert.equal(parameters.metadata.tsuyo_payment_test,'true');
 assert.equal(parameters.metadata.order_id,undefined);
 assert.equal(parameters.success_url,'https://tsuyo.example/admin?payment_test={CHECKOUT_SESSION_ID}');
});
test('sandbox cannot connect to live balance, a different account, or an unsigned webhook setup',async()=>{
 const variant={price_minor:14900,products:{name:'Tee'},size:'M'};
 for(const stripe of [provider({balance:{retrieve:async()=>({livemode:true})}}),provider({accounts:{retrieve:async()=>({id:'acct_wrong'})}})])await assert.rejects(tools(stripe).testCheckout(variant,actor,'key'),/configured sandbox/);
 await assert.rejects(makePaymentTools({stripe:provider(),mode:'live',storeURL:'https://tsuyo.example'}).testCheckout(variant,actor,'key'),/test mode/);
 await assert.rejects(makePaymentTools({stripe:provider(),storeURL:'https://tsuyo.example'}).testCheckout(variant,actor,'key'),/webhook signing secret/);
});
test('sandbox result verifies owner metadata, test mode and session id before revealing payment',async()=>{
 const payment=await tools(provider()).testResult('cs_test_fixture',actor);assert.equal(payment.payment_status,'paid');
 await assert.rejects(tools(provider()).testResult('cs_test_fixture','other-staff'),/not available/);
 await assert.rejects(tools(provider()).testResult('cs_live_fixture',actor),/not available/);
 const stripe=provider();stripe.checkout.sessions.retrieve=async()=>({livemode:true,metadata:{tsuyo_payment_test:'true',staff_id:actor}});
 await assert.rejects(tools(stripe).testResult('cs_test_fixture',actor),/not available/);
});
