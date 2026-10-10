import { db,stripe,commerce,checked,storeURL,payments } from '../_shared/runtime.ts';
const escape=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
Deno.serve(async(req:Request)=>{
  const secret=Deno.env.get('STORE_JOB_SECRET');
  if(req.method!=='POST'||!secret||req.headers.get('authorization')!==`Bearer ${secret}`) return new Response('Unauthorized',{status:401});
  // Dedicated scheduler authentication also protects these sandbox-only integration checks.
  const raw=await req.text();let body;try{body=JSON.parse(raw||'{}');}catch{return new Response('Invalid request',{status:400});}
  if(body.action?.startsWith('stripe-')) {
    try {
      if(body.action==='stripe-health')return Response.json(await payments.connection());
      if(body.action==='stripe-test-checkout') {
        const variant=await checked(db.from('product_variants').select('id,size,price_minor,products(name)').eq('active',true).order('id').limit(1).single());
        return Response.json(await payments.testCheckout(variant,'maintenance',crypto.randomUUID()));
      }
      if(body.action==='stripe-test-result')return Response.json(await payments.testResult(body.session_id,'maintenance'));
      return new Response('Unknown check',{status:400});
    } catch(error){return Response.json({error:'Stripe sandbox check failed',code:error.code||null,param:error.param||null,type:error.type||null,message:error.type==='StripeInvalidRequestError'?error.message:null},{status:409});}
  }
  let reconciled=0,sent=0;
  try {
    if(stripe) {
      const orders=await checked(db.from('orders').select('*,order_items(*)').eq('reservation_status','held').lt('reservation_expires_at',new Date().toISOString()).limit(30));
      for(const order of orders) {
        try {
          if(order.stripe_session_id) { await commerce.settle(await stripe.checkout.sessions.retrieve(order.stripe_session_id),`reconcile:${order.stripe_session_id}`); reconciled++; }
          else await commerce.ensureSession(order,order.order_items);
        } catch { /* Preserve stock when provider state is uncertain. Explicit rejection/expiry releases it in the shared handler. */ }
      }
    }
    const apiKey=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('STORE_FROM_EMAIL');
    if(apiKey&&from) {
      const jobs=await checked(db.rpc('store_claim_notifications',{p_limit:20}));
      for(const job of jobs) {
        try {
          const order=await checked(db.from('orders').select('*,order_items(*)').eq('id',job.order_id).single());
          const shipping=job.kind==='shipping_confirmation';
          const lines=order.order_items.map((i:any)=>`<li>${escape(i.name)} Â· ${escape(i.size)} Ã— ${i.quantity}</li>`).join('');
          const html=`<h1>TSUYO</h1><p>${shipping?'Your rotation is on its way.':'Thank you. Your order is confirmed.'}</p><p>Order #${order.order_number}</p><ul>${lines}</ul><p>Total: RM ${(order.total_minor/100).toFixed(2)}</p>${shipping?`<p>${escape(order.carrier)} Â· ${escape(order.tracking_number)}</p>`:''}<p><a href="${escape(storeURL)}/account">View your account</a></p>`;
          const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':job.id},
            body:JSON.stringify({from,to:[job.recipient],subject:`Tsuyo order #${order.order_number}${shipping?' â€” shipped':' â€” confirmed'}`,html})});
          if(!response.ok) throw new Error('Mail provider rejected message.');
          await checked(db.from('notification_outbox').update({status:'sent',sent_at:new Date().toISOString()}).eq('id',job.id)); sent++;
        } catch {
          await checked(db.from('notification_outbox').update({status:'pending',available_at:new Date(Date.now()+15*60*1000).toISOString()}).eq('id',job.id));
        }
      }
    }
    await checked(db.from('store_rate_limits').delete().lt('window_start',new Date(Date.now()-24*60*60*1000).toISOString()));
    return Response.json({reconciled,sent});
  } catch { return new Response('Job failed; retry later',{status:500}); }
});
