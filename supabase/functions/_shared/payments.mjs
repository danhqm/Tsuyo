export class PaymentError extends Error {
  constructor(message,status=409){super(message);this.status=status;}
}
export function stripeConfiguration(key,mode='test') {
  if(!['test','live'].includes(mode)) return {mode:'test',valid:false};
  const keyMode=/^(sk|rk)_test_/.test(key||'')?'test':/^(sk|rk)_live_/.test(key||'')?'live':null;
  return {mode,valid:keyMode===mode};
}
export function makePaymentTools({stripe,mode='test',storeURL,expectedAccount,webhookConfigured=false}) {
  async function connection() {
    if(!stripe)return {mode,connected:false,webhook_configured:webhookConfigured};
    try {
      const [account,balance]=await Promise.all([stripe.accounts.retrieve(),stripe.balance.retrieve()]);
      const matches=balance.livemode===(mode==='live')&&(!expectedAccount||account.id===expectedAccount);
      return {mode,connected:matches,account_id:account.id,webhook_configured:webhookConfigured};
    } catch {return {mode,connected:false,webhook_configured:webhookConfigured};}
  }
  async function requireTest() {
    if(mode!=='test'||!stripe)throw new PaymentError('Connect Stripe test mode before starting a sandbox checkout.');
    const status=await connection();
    if(!status.connected)throw new PaymentError('The Stripe key does not connect to the configured sandbox. Check its account and test mode.');
    if(!webhookConfigured)throw new PaymentError('Configure the Stripe webhook signing secret before testing checkout.');
  }
  return {
    connection,
    async testCheckout(variant,actor,key) {
      await requireTest();
      if(!variant||!Number.isInteger(variant.price_minor)||variant.price_minor<200)throw new PaymentError('Choose a sample size priced at RM 2.00 or more.');
      const session=await stripe.checkout.sessions.create({
        mode:'payment',adaptive_pricing:{enabled:false},
        client_reference_id:`tsuyo-sandbox:${actor}`,
        metadata:{tsuyo_payment_test:'true',staff_id:actor,variant_id:variant.id},
        payment_intent_data:{metadata:{tsuyo_payment_test:'true'}},
        line_items:[{quantity:1,price_data:{currency:'myr',unit_amount:variant.price_minor,
          product_data:{name:`Tsuyo sandbox · ${variant.products.name} · ${variant.size}`}}}],
        success_url:actor==='maintenance'?`${storeURL}/checkout/complete?sandbox={CHECKOUT_SESSION_ID}`:`${storeURL}/admin?payment_test={CHECKOUT_SESSION_ID}`,
        cancel_url:`${storeURL}/admin?payment_test=cancelled`,
        expires_at:Math.floor(Date.now()/1000)+31*60,
      },{idempotencyKey:`tsuyo-sandbox-${actor}-${key}`});
      if(session.livemode!==false||!/^https:\/\/checkout\.stripe\.com\//.test(session.url||''))throw new PaymentError('Stripe did not return a sandbox checkout.',503);
      return {session_id:session.id,url:session.url};
    },
    async storefrontCheckout(items,key,accessHash,email,returnOrigin=storeURL) {
      await requireTest();
      const suffix=key.replaceAll('-','').slice(0,8).split('').map(c=>String.fromCharCode(97+parseInt(c,16))).join('');
      const session=await stripe.checkout.sessions.create({
        mode:'payment',adaptive_pricing:{enabled:false},integration_identifier:`tsuyo-bag-${suffix}`,customer_email:email,
        metadata:{tsuyo_payment_test:'true',staff_id:'storefront',guest_access_hash:accessHash},
        payment_intent_data:{metadata:{tsuyo_payment_test:'true'}},
        line_items:items.map(i=>({quantity:i.quantity,price_data:{currency:'myr',unit_amount:i.unit_price_minor,
          product_data:{name:`Tsuyo sample - ${i.name} - ${i.size}`,metadata:{product_id:i.product_id,size:i.size}}}})),
        success_url:`${returnOrigin}/checkout/complete?sandbox={CHECKOUT_SESSION_ID}`,
        cancel_url:`${returnOrigin}/checkout?cancelled=1`,
      },{idempotencyKey:`tsuyo-bag-${key}`});
      if(session.livemode!==false||!/^cs_test_[A-Za-z0-9_]+$/.test(session.id||''))throw new PaymentError('Stripe did not return a sandbox checkout.',503);
      const current=await stripe.checkout.sessions.retrieve(session.id);
      if(current.livemode!==false||current.metadata?.tsuyo_payment_test!=='true'||current.metadata?.staff_id!=='storefront'||current.metadata?.guest_access_hash!==accessHash)throw new PaymentError('This sandbox checkout is not available.',404);
      if(current.status==='expired')throw new PaymentError('This test checkout expired. Refresh the test total and start again.',409);
      if(current.status==='complete')return {session_id:current.id,completed:true,sandbox:true};
      if(current.status!=='open'||!/^https:\/\/checkout\.stripe\.com\//.test(current.url||''))throw new PaymentError('Stripe checkout could not be opened.',503);
      return {session_id:current.id,url:current.url,sandbox:true};
    },
    async testResult(id,actor,accessHash) {
      if(mode!=='test'||!stripe||!/^cs_test_[A-Za-z0-9_]+$/.test(id||''))throw new PaymentError('This sandbox checkout is not available.',404);
      const session=await stripe.checkout.sessions.retrieve(id);
      if(session.livemode!==false||session.metadata?.tsuyo_payment_test!=='true'||session.metadata?.staff_id!==actor)throw new PaymentError('This sandbox checkout is not available.',404);
      let items;
      if(actor==='storefront') {
        if(!accessHash||session.metadata?.guest_access_hash!==accessHash)throw new PaymentError('This sandbox checkout is not available.',404);
        const lines=await stripe.checkout.sessions.listLineItems(id,{limit:100,expand:['data.price.product']});
        items=lines.data.map(i=>({product_id:i.price.product.metadata.product_id,size:i.price.product.metadata.size,quantity:i.quantity}));
      }
      return {...(items?{items}:{}),session_id:session.id,status:session.status,payment_status:session.payment_status,amount_total:session.amount_total,currency:session.currency};
    },
  };
}
