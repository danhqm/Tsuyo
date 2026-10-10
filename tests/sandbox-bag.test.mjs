import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeCommerce,hash} from '../supabase/functions/_shared/commerce.mjs';
import {makePaymentTools} from '../supabase/functions/_shared/payments.mjs';
const key='20000000-0000-4000-8000-000000000001';
const items=[{product_id:'sample-tee',size:'M',quantity:2,price_minor:1}];
const rows=[{id:key,product_id:'sample-tee',size:'M',price_minor:14900,products:{name:'Sample tee',color:'Onyx',is_demo:true,status:'draft'}}];
const req=body=>new Request('https://api.example/store-api',{method:'POST',headers:{apikey:'public-key',Origin:'https://tsuyo.example'},body:JSON.stringify(body)});
function store(options={}){
 let writes=0,calls=0;
 const db={from(){return {select(){return this;},in(){return this;},eq:async()=>({data:rows,error:null})};},rpc:async(name)=>{assert.equal(name,'store_rate_limit');return {data:true,error:null};}};
 const commerce=makeCommerce({db,stripe:{},storeURL:'https://tsuyo.example',publishableKey:'public-key',paymentMode:'test',webhookConfigured:true,sandboxBagEnabled:true,payments:{storefrontCheckout:async(data,k,token)=>{calls++;assert.equal(data[0].unit_price_minor,14900);assert.notEqual(token,'a'.repeat(64));return {session_id:'cs_test_fixture',url:'https://checkout.stripe.com/c/pay/cs_test_fixture'};}},...options});
 return {commerce,calls:()=>calls};
}
test('sample bag quote uses stored prices and never writes inventory/orders',async()=>{
 const {commerce}=store();const response=await commerce.handle(req({action:'sandbox-quote',items}));assert.equal(response.status,200);
 const quote=await response.json();assert.equal(quote.total_minor,29800);assert.equal(quote.shipping_minor,0);assert.equal(quote.sandbox,true);
});
test('public sandbox checkout is disabled outside its explicit flag and test mode',async()=>{
 for(const options of [{paymentMode:'live'},{sandboxBagEnabled:false}])assert.equal((await store(options).commerce.handle(req({action:'sandbox-quote',items}))).status,409);
});
test('invalid sizes, duplicates and real merchandise cannot use sandbox bag checkout',async()=>{
 const {commerce}=store();
 for(const value of [[{...items[0],size:'missing'}],[items[0],items[0]],[{...items[0],quantity:11}]])assert.ok([400,409].includes((await commerce.handle(req({action:'sandbox-quote',items:value}))).status));
 rows[0].products.is_demo=false;assert.equal((await commerce.handle(req({action:'sandbox-quote',items}))).status,409);rows[0].products.is_demo=true;
});
test('changing the trusted total is rejected before contacting Stripe',async()=>{
 const s=store();const body={action:'sandbox-checkout',items,key,access_token:'a'.repeat(64),email:'test@example.com'};
 assert.equal((await s.commerce.handle(req({...body,expected_total_minor:1}))).status,409);assert.equal(s.calls(),0);
 assert.equal((await s.commerce.handle(req({...body,expected_total_minor:29800}))).status,200);assert.equal(s.calls(),1);
});
test('storefront Stripe session contains test marker, stored MYR prices and stable idempotency',async()=>{
 let parameters,options;
 const stripe={accounts:{retrieve:async()=>({id:'acct_fixture'})},balance:{retrieve:async()=>({livemode:false})},checkout:{sessions:{retrieve:async()=>({id:'cs_test_fixture',status:'open',livemode:false,url:'https://checkout.stripe.com/c/pay/cs_test_fixture',metadata:parameters.metadata}),create:async(p,o)=>{parameters=p;options=o;return {id:'cs_test_fixture',url:'https://checkout.stripe.com/c/pay/cs_test_fixture',livemode:false};}}}};
 const payments=makePaymentTools({stripe,mode:'test',storeURL:'https://tsuyo.example',expectedAccount:'acct_fixture',webhookConfigured:true});
 await payments.storefrontCheckout([{product_id:'sample-tee',size:'M',name:'Sample tee',quantity:2,unit_price_minor:14900}],key,await hash('a'.repeat(64)),'test@example.com');
 assert.equal(parameters.metadata.staff_id,'storefront');assert.equal(parameters.metadata.order_id,undefined);assert.equal(parameters.line_items[0].price_data.unit_amount,14900);
 assert.equal(parameters.line_items[0].price_data.currency,'myr');assert.equal(parameters.line_items[0].quantity,2);assert.match(parameters.integration_identifier,/^tsuyo-bag-[a-z]{8}$/);
 assert.equal(options.idempotencyKey,`tsuyo-bag-${key}`);
});
test('storefront receipt rejects incorrect guest token before reading line items',async()=>{
 let calls=0;
 const stripe={checkout:{sessions:{retrieve:async()=>({id:'cs_test_fixture',livemode:false,status:'complete',payment_status:'paid',amount_total:29800,currency:'myr',metadata:{staff_id:'storefront',tsuyo_payment_test:'true',guest_access_hash:'correct'}}),listLineItems:async()=>{calls++;return {data:[{quantity:2,price:{product:{metadata:{product_id:'sample-tee',size:'M'}}}}]};}}}};
 const p=makePaymentTools({stripe,mode:'test',storeURL:'https://tsuyo.example'});
 await assert.rejects(p.testResult('cs_test_fixture','storefront','wrong'),/not available/);assert.equal(calls,0);
 const receipt=await p.testResult('cs_test_fixture','storefront','correct');assert.equal(receipt.payment_status,'paid');assert.deepEqual(receipt.items,[{product_id:'sample-tee',size:'M',quantity:2}]);
});

test('sandbox retries keep identical provider parameters as time advances',async()=>{
 const requests=[];
 const stripe={accounts:{retrieve:async()=>({id:'acct_fixture'})},balance:{retrieve:async()=>({livemode:false})},checkout:{sessions:{retrieve:async()=>({id:'cs_test_fixture',status:'open',livemode:false,url:'https://checkout.stripe.com/c/pay/cs_test_fixture',metadata:requests.at(-1).metadata}),create:async(p)=>{requests.push(p);return {id:'cs_test_fixture',url:'https://checkout.stripe.com/c/pay/cs_test_fixture',livemode:false};}}}};
 const p=makePaymentTools({stripe,mode:'test',storeURL:'https://tsuyo.example',webhookConfigured:true});
 const original=Date.now;
 try {
  Date.now=()=>1000000;await p.storefrontCheckout([{product_id:'sample-tee',size:'M',name:'Tee',quantity:1,unit_price_minor:14900}],key,'hash','test@example.com');
  Date.now=()=>1003000;await p.storefrontCheckout([{product_id:'sample-tee',size:'M',name:'Tee',quantity:1,unit_price_minor:14900}],key,'hash','test@example.com');
 }finally{Date.now=original;}
 assert.deepEqual(requests[0],requests[1]);
});

test('expired cached sessions rotate through a 409 while completed sessions route to confirmation',async()=>{
 let parameters,status='expired';
 const stripe={accounts:{retrieve:async()=>({id:'acct_fixture'})},balance:{retrieve:async()=>({livemode:false})},checkout:{sessions:{create:async(p)=>{parameters=p;return {id:'cs_test_fixture',url:null,livemode:false};},retrieve:async()=>({id:'cs_test_fixture',status,livemode:false,url:null,metadata:parameters.metadata})}}};
 const p=makePaymentTools({stripe,mode:'test',storeURL:'https://tsuyo.example',webhookConfigured:true});
 const items=[{product_id:'sample-tee',size:'M',name:'Tee',quantity:1,unit_price_minor:14900}];
 await assert.rejects(p.storefrontCheckout(items,key,'hash','test@example.com'),e=>e.status===409&&/expired/.test(e.message));
 status='complete';const done=await p.storefrontCheckout(items,key,'hash','test@example.com');assert.equal(done.completed,true);assert.equal(done.session_id,'cs_test_fixture');
});
