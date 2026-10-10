import { readBody } from './commerce.mjs';
export function makeWebhook({stripe,secret,cryptoProvider,commerce,db,expectedLiveMode}) {
  return async req=>{
    if(req.method!=='POST')return new Response('Method not allowed',{status:405});
    if(!stripe||!secret)return new Response('Webhook not configured',{status:503});
    let event;
    try {event=await stripe.webhooks.constructEventAsync(await readBody(req,262144),req.headers.get('stripe-signature')||'',secret,undefined,cryptoProvider);}
    catch(error){return new Response(error.status===413?'Payload too large':'Invalid signature',{status:error.status===413?413:400});}
    if(typeof expectedLiveMode==='boolean'&&event.livemode!==expectedLiveMode)return new Response('Payment mode mismatch',{status:400});
    try {
      const object=event.data.object;
      if(event.type.startsWith('checkout.session.')&&!object.metadata?.order_id)return Response.json({received:true});
      if(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.expired'].includes(event.type))await commerce.settle(object,event.id);
      else if(event.type==='checkout.session.async_payment_failed'){
        const {error}=await db.rpc('store_release_order',{p_order:object.metadata.order_id,p_reason:'payment_failed',p_session:object.id});if(error)throw error;
      } else if(event.type==='charge.refunded'){
        const {data,error:lookupError}=await db.from('orders').select('id').eq('stripe_payment_intent_id',object.payment_intent).maybeSingle();
        if(lookupError)throw lookupError;if(data){const {error}=await db.rpc('store_refund_record',{p_event:event.id,p_intent:object.payment_intent,p_amount:object.amount_refunded});if(error)throw error;}
      }
      return Response.json({received:true});
    }catch{return new Response('Event not recorded',{status:500});}
  };
}
