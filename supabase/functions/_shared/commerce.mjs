export class HttpError extends Error {
  constructor(status,message) { super(message); this.status=status; }
}
export async function readBody(req,maxBytes=32768) {
  if(!req.body)return '';
  const reader=req.body.getReader();let size=0;const chunks=[];
  for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new HttpError(413,'The request is too large.');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return new TextDecoder().decode(bytes);
}
const fail = (message,status=400) => { throw new HttpError(status,message); };
export function text(value,name,max=200) {
  if(typeof value!=='string'||!value.trim()||value.length>max) fail(`Check ${name}.`);
  return value.trim();
}
export function uuid(value,name='the request') {
  if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) fail(`Check ${name}.`);
  return value;
}
export function cart(value) {
  if(!Array.isArray(value)||!value.length||value.length>30) fail('Your bag must contain 1 to 30 different pieces.');
  const seen=new Set();
  return value.map(item=>{
    const id=uuid(item?.variant_id,'the piece');
    if(seen.has(id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>10) fail('Check the sizes and quantities in your bag.');
    seen.add(id); return {variant_id:id,quantity:item.quantity};
  }).sort((a,b)=>a.variant_id.localeCompare(b.variant_id));
}
export function delivery(value) {
  const address={line1:text(value?.line1,'your street address'),line2:typeof value?.line2==='string'?value.line2.trim().slice(0,200):'',
    city:text(value?.city,'your city',120),region:text(value?.region,'your state or region',120),
    postal_code:text(value?.postal_code,'your postcode',24),country:text(value?.country,'your country',2).toUpperCase(),
    phone:typeof value?.phone==='string'?value.phone.trim().slice(0,40):''};
  if(!/^[A-Z]{2}$/.test(address.country)) fail('Choose your delivery country.');
  if(address.country==='MY'&&!/^\d{5}$/.test(address.postal_code)) fail('Enter a five-digit Malaysian postcode.');
  return address;
}
const emailAddress=value=>{
  const email=text(value,'your email address',254).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address.');
  return email;
};
export async function hash(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
}
export function billingCustomerParameters(order) {
  const a=order.shipping_address;
  const address={line1:a.line1,line2:a.line2||undefined,city:a.city,state:a.region,postal_code:a.postal_code,country:a.country};
  return {email:order.email,name:order.recipient,address,shipping:{name:order.recipient,address,...(a.phone?{phone:a.phone}:{})},metadata:{order_id:order.id}};
}
export function checkoutParameters(order,items,storeURL,couponID,customerID) {
  const automaticTax=order.tax_mode==='stripe_tax';
  return {
    mode:'payment', payment_method_types:['card'], ...(customerID?{customer:customerID}:{customer_email:order.email}),
    client_reference_id:order.id, metadata:{order_id:order.id},
    payment_intent_data:{metadata:{order_id:order.id}},
    line_items:items.map(item=>({quantity:item.quantity,price_data:{currency:'myr',unit_amount:item.unit_price_minor,
      tax_behavior:automaticTax?'exclusive':'inclusive',product_data:{name:`${item.name} · ${item.color} · ${item.size}`}}})),
    shipping_options:[{shipping_rate_data:{display_name:order.shipping_name,fixed_amount:{amount:order.shipping_minor,currency:'myr'},type:'fixed_amount',tax_behavior:automaticTax?'exclusive':'inclusive'}}],
    ...(couponID?{discounts:[{coupon:couponID}]}:{}), automatic_tax:{enabled:automaticTax},
    expires_at:Math.floor(new Date(order.created_at).getTime()/1000)+31*60,
    success_url:`${storeURL}/checkout/complete?order=${order.id}`,
    cancel_url:`${storeURL}/checkout?cancelled=1`,
  };
}
const customerMessages=/^(Your bag|Duplicate sizes|Invalid quantity|Choose between|A piece|Not enough stock|Delivery is not|This promo|Checkout is not|Check your contact|Complete your delivery|Checkout belongs|Start a new checkout|Stock cannot|Staff access|Only paid|Invalid fulfillment|Enter the carrier)/;
async function result(promise) {
  const {data,error}=await promise;
  if(error) {
    if(customerMessages.test(error.message||'')) throw new HttpError(409,error.message);
    throw new HttpError(503,'The store could not complete this request. Please try again.');
  }
  return data;
}
const number=(v,name,max=100000000)=>{
  if(!Number.isInteger(v)||v<0||v>max) fail(`Check ${name}.`); return v;
};
function publicOrder(o) {
  return {id:o.id,order_number:o.order_number,email:o.email,recipient:o.recipient,shipping_address:o.shipping_address,
    subtotal_minor:o.subtotal_minor,discount_minor:o.discount_minor,shipping_minor:o.shipping_minor,tax_minor:o.tax_minor,
    total_minor:o.total_minor,currency:o.currency,payment_status:o.payment_status,fulfillment_status:o.fulfillment_status,
    carrier:o.carrier,tracking_number:o.tracking_number,created_at:o.created_at};
}
export function makeCommerce({db,auth,scopedClient,stripe,storeURL,publishableKey,allowedOrigins=[],webhookConfigured=false}) {
  const origins=new Set([new URL(storeURL).origin,...allowedOrigins.map(value=>new URL(value).origin)]);
  const headers=origin=>({'Content-Type':'application/json','Access-Control-Allow-Origin':origin||new URL(storeURL).origin,
    'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'});
  async function user(req,required=false) {
    const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
    if(!token||token===publishableKey) { if(required) fail('Sign in to continue.',401); return null; }
    const {data,error}=await auth.auth.getUser(token);
    if(error||!data?.user) fail('Your session has expired. Sign in again.',401);
    return {user:data.user,client:scopedClient(token)};
  }
  async function staff(req) {
    const account=await user(req,true);
    const allowed=await result(account.client.rpc('store_is_staff'));
    if(!allowed) fail('Staff access is required.',403);
    return account.user;
  }
  async function limit(key,max=10,seconds=3600) {
    if(!await result(db.rpc('store_rate_limit',{p_key:await hash(key),p_max:max,p_seconds:seconds}))) fail('Too many attempts. Please try again later.',429);
  }
  async function ensureSession(order,items) {
    if(!stripe) fail('Online checkout is being set up. Please check back soon.',503);
    if(order.stripe_session_id) {
      const session=await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if(session.status==='open') return session;
      if(session.status==='expired') await result(db.rpc('store_release_order',{p_order:order.id,p_reason:'stripe_expired',p_session:session.id}));
      fail('This checkout has finished. Start a new checkout.',409);
    }
    let session;
    try {
      // A per-order Customer snapshot keeps delivery location immutable for tax and retries.
      const customer=await stripe.customers.create(billingCustomerParameters(order),{idempotencyKey:`tsuyo-customer-${order.id}`});
      let coupon;
      if(order.discount_minor>0)coupon=await stripe.coupons.create({amount_off:order.discount_minor,currency:'myr',duration:'once',name:order.coupon_code||'Tsuyo promotion'},{idempotencyKey:`tsuyo-coupon-${order.id}`});
      session=await stripe.checkout.sessions.create(checkoutParameters(order,items,storeURL,coupon?.id,customer.id),{idempotencyKey:`tsuyo-checkout-${order.id}`});
    }
    catch(error) {
      // An explicit parameter rejection proves this request did not create a session. Ambiguous network failures retain stock.
      if(error.type==='StripeInvalidRequestError') await result(db.rpc('store_release_order',{p_order:order.id,p_reason:'stripe_rejected',p_session:null}));
      fail('Checkout could not be opened. Please retry or start a new checkout.',503);
    }
    await result(db.from('orders').update({stripe_session_id:session.id,reservation_expires_at:new Date(session.expires_at*1000).toISOString()})
      .eq('id',order.id).is('stripe_session_id',null));
    return session;
  }
  async function settle(session,eventID) {
    const id=uuid(session.metadata?.order_id,'the order');
    if(session.payment_status==='paid'||(session.payment_status==='no_payment_required'&&session.amount_total===0)) {
      const intent=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id||`free:${session.id}`;
      await result(db.rpc('store_payment_paid',{p_event:eventID,p_order:id,p_session:session.id,p_intent:intent,
        p_total:session.amount_total,p_tax:session.total_details?.amount_tax||0,p_currency:session.currency}));
    } else if(session.status==='expired') {
      await result(db.rpc('store_release_order',{p_order:id,p_reason:'stripe_expired',p_session:session.id}));
    } else if(session.status==='complete') {
      await result(db.from('orders').update({payment_status:'processing'}).eq('id',id).eq('stripe_session_id',session.id).eq('payment_status','pending'));
    }
  }
  const actions={
    async quote(body) {
      const items=cart(body.items);
      await limit(`quote:${body.country}:${items.map(x=>x.variant_id).join(',')}`,100,60);
      return result(db.rpc('store_quote',{p_items:items,p_country:text(body.country,'your country',2).toUpperCase(),
        p_region:text(body.region,'your state or region',120),p_coupon:body.coupon?text(body.coupon,'your promo code',30):null}));
    },
    async checkout(body,req) {
      if(!stripe) fail('Online checkout is being set up. Please check back soon.',503);
      if(typeof body.access_token!=='string'||!/^[0-9a-f]{64}$/i.test(body.access_token)) fail('Start a new checkout request.');
      const account=await user(req); const email=emailAddress(account?.user.email||body.email);
      await limit(`checkout:${account?.user.id||email}`,15,3600);
      const created=await result(db.rpc('store_create_order',{p_key:uuid(body.key),p_customer:account?.user.id||null,p_email:email,
        p_recipient:text(body.recipient,'your full name',120),p_address:delivery(body.address),p_items:cart(body.items),
        p_guest_hash:await hash(text(body.access_token,'your checkout request',100)),p_coupon:body.coupon?text(body.coupon,'your promo code',30):null}));
      const session=await ensureSession(created.order,created.items);
      return {order_id:created.order.id,url:session.url};
    },
    async order(body,req) {
      const id=uuid(body.order_id,'the order'); const account=await user(req);
      await limit(`order:${account?.user.id||id}`,60,60);
      const o=await result(db.from('orders').select('*').eq('id',id).maybeSingle());
      if(!o||!(account?.user.id===o.customer_id||(typeof body.access_token==='string'&&await hash(body.access_token)===o.guest_access_hash))) fail('This order is not available.',404);
      // Querying a success URL never marks an order paid. Only a verified Stripe response can do so.
      if(stripe&&o.stripe_session_id&&['pending','processing'].includes(o.payment_status)) {
        await settle(await stripe.checkout.sessions.retrieve(o.stripe_session_id),`reconcile:${o.stripe_session_id}`);
      }
      const fresh=await result(db.from('orders').select('*').eq('id',id).single());
      return {order:publicOrder(fresh),items:await result(db.from('order_items').select('id,product_id,name,size,color,image_url,quantity,unit_price_minor').eq('order_id',id))};
    },
    async newsletter(body) {
      const email=emailAddress(body.email); if(body.consent!==true) fail('Confirm you would like to receive Tsuyo updates.');
      await limit(`newsletter:${email}`,3,3600);
      await result(db.from('newsletter_subscribers').upsert({email,status:'subscribed',consent_at:new Date().toISOString()},{onConflict:'email'}));
      return {message:'You’re on the list. We’ll share fresh drops and updates from Tsuyo.'};
    },
    async unsubscribe(body) {
      await result(db.from('newsletter_subscribers').update({status:'unsubscribed'}).eq('unsubscribe_token',uuid(body.token)));
      return {message:'Your subscription preferences have been updated.'};
    },
    async 'admin.overview'(_body,req) {
      await staff(req);
      const [products,orders,zones,settings,coupons]=await Promise.all([
        result(db.from('products').select('*,product_variants(*)').order('created_at')),
        result(db.from('orders').select('*,order_items(*)').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100)),
        result(db.from('shipping_zones').select('*').order('priority',{ascending:false})),
        result(db.from('store_settings').select('*').single()),result(db.from('coupons').select('*').order('code'))]);
      return {products,orders:orders.map(o=>({...publicOrder(o),items:o.order_items,refund_minor:o.refund_minor})),zones,settings,coupons,hasMoreOrders:orders.length===100};
    },
    async 'admin.orders'(body,req) {
      await staff(req);const offset=number(body.offset||0,'the order page',1000000);
      let query=db.from('orders').select('*,order_items(*)').order('created_at',{ascending:false}).order('id',{ascending:false});
      query=body.order_id?query.eq('id',uuid(body.order_id)):query.range(offset,offset+99);
      const orders=await result(query);return {orders:orders.map(o=>({...publicOrder(o),items:o.order_items,refund_minor:o.refund_minor})),hasMoreOrders:!body.order_id&&orders.length===100};
    },
    async 'admin.product'(body,req) {
      await staff(req); const p=body.product;
      const id=text(p?.id,'the product URL',80); if(!/^[a-z0-9-]+$/.test(id)) fail('Use lowercase letters, numbers and hyphens for the product URL.');
      if(!['men','women','unisex'].includes(p.category)||!['draft','active','archived'].includes(p.status)||typeof p.is_demo!=='boolean') fail('Check the product category and status.');
      const image=text(p.image_url,'the product image',1500); if(!image.startsWith('/assets/')&&!/^https:\/\//.test(image)) fail('Use a product asset path or HTTPS image URL.');
      const row={id,name:text(p.name,'the product name',120),description:text(p.description,'the product description',3000),category:p.category,
        product_type:text(p.product_type,'the product type',80),color:text(p.color,'the garment colour',80),color_hex:/^#[0-9a-f]{6}$/i.test(p.color_hex)?p.color_hex:'#191919',
        image_url:image,details:Array.isArray(p.details)?p.details.slice(0,15).map(v=>text(v,'the product details',200)):[],
        fit:typeof p.fit==='string'?p.fit.slice(0,200):'',care:typeof p.care==='string'?p.care.slice(0,500):'',status:p.status,is_demo:p.is_demo,updated_at:new Date().toISOString()};
      await result(db.from('products').upsert(row)); return {saved:true};
    },
    async 'admin.variant'(body,req) {
      await staff(req); const v=body.variant; const row={product_id:text(v?.product_id,'the product',80),sku:text(v?.sku,'the SKU',120),size:text(v?.size,'the size',20),price_minor:number(v?.price_minor,'the price'),active:v?.active!==false};
      if(row.price_minor===0) fail('Enter a price above zero.');
      if(v.id) { await result(db.from('product_variants').update(row).eq('id',uuid(v.id))); }
      else { await result(db.from('product_variants').insert(row)); }
      return {saved:true};
    },
    async 'admin.stock'(body,req) {
      const actor=await staff(req); if(!Number.isInteger(body.delta)) fail('Enter a whole-number stock change.');
      return {stock:await result(db.rpc('store_adjust_stock',{p_variant:uuid(body.variant_id),p_delta:body.delta,p_actor:actor.id,p_reason:text(body.reason,'the adjustment reason')}))};
    },
    async 'admin.shipping'(body,req) {
      await staff(req); const z=body.zone;
      if(!Array.isArray(z?.countries)||!z.countries.length||z.countries.some(c=>!/^[A-Z]{2}$/.test(c))) fail('Enter two-letter country codes, such as MY or SG.');
      const row={name:text(z.name,'the delivery zone name',120),countries:[...new Set(z.countries)],regions:Array.isArray(z.regions)?z.regions.map(v=>text(v,'the region',120)):[],
        fee_minor:number(z.fee_minor,'the delivery fee'),free_over_minor:z.free_over_minor===null?null:number(z.free_over_minor,'the free-delivery threshold'),enabled:z.enabled===true,priority:number(z.priority||0,'the priority',100)};
      if(z.id) row.id=uuid(z.id); await result(db.from('shipping_zones').upsert(row)); return {saved:true};
    },
    async 'admin.coupon'(body,req) {
      await staff(req); const c=body.coupon; const code=text(c?.code,'the promo code',30).toUpperCase();
      if(!/^[A-Z0-9_-]{3,30}$/.test(code)||!['fixed','percent'].includes(c.kind)) fail('Check the promo code.');
      const amount=number(c.amount,'the discount'); if(!amount||(c.kind==='percent'&&amount>10000)) fail('Check the discount.');
      await result(db.from('coupons').upsert({code,kind:c.kind,amount,min_subtotal_minor:number(c.min_subtotal_minor||0,'the minimum bag value'),
        max_uses:c.max_uses===null?null:number(c.max_uses,'the usage limit'),enabled:c.enabled===true,
        ...(c.expires_at?{expires_at:new Date(c.expires_at).toISOString()}:{expires_at:null})})); return {saved:true};
    },
    async 'admin.settings'(body,req) {
      await staff(req); const s=body.settings;
      if(!['inclusive','stripe_tax'].includes(s?.tax_mode)) fail('Choose the tax setup.');
      if(s.checkout_enabled){
        if(!stripe||!webhookConfigured)fail('Connect Stripe and its verified webhook before opening checkout.',409);
        const zones=await result(db.from('shipping_zones').select('id').eq('enabled',true).limit(1));
        const products=await result(db.from('products').select('product_variants(active,stock_on_hand,stock_reserved)').eq('status','active').eq('is_demo',false));
        if(!zones.length||!products.some(p=>p.product_variants.some(v=>v.active&&v.stock_on_hand>v.stock_reserved)))fail('Confirm delivery and real inventory before opening checkout.',409);
      }
      await result(db.from('store_settings').update({checkout_enabled:s.checkout_enabled===true,tax_mode:s.tax_mode,support_email:s.support_email?emailAddress(s.support_email):null,updated_at:new Date().toISOString()}).eq('id',true));
      return {saved:true};
    },
    async 'admin.fulfill'(body,req) {
      const actor=await staff(req); await result(db.rpc('store_fulfill',{p_order:uuid(body.order_id),p_actor:actor.id,p_status:body.status,
        p_carrier:body.carrier?text(body.carrier,'the carrier',120):null,p_tracking:body.tracking_number?text(body.tracking_number,'the tracking number',120):null})); return {saved:true};
    },
    async 'admin.refund'(body,req) {
      await staff(req); if(!stripe) fail('The payment provider is not configured.',503);
      const o=await result(db.from('orders').select('*').eq('id',uuid(body.order_id)).single());
      const amount=number(body.amount_minor,'the refund amount'); if(!amount||amount>o.total_minor-o.refund_minor||!o.stripe_payment_intent_id) fail('Check the refundable amount.');
      const refund=await stripe.refunds.create({payment_intent:o.stripe_payment_intent_id,amount,metadata:{order_id:o.id}},{idempotencyKey:`tsuyo-refund-${o.id}-${uuid(body.key)}`});
      return {refund_id:refund.id,status:refund.status};
    },
  };
  return {
    settle,ensureSession,
    async handle(req) {
      const origin=req.headers.get('origin'); if(origin&&!origins.has(origin)) return new Response('Origin not allowed',{status:403});
      if(req.method==='OPTIONS') return new Response(null,{status:204,headers:headers(origin)});
      try {
        if(req.method!=='POST') fail('Use a POST request.',405);
        if(req.headers.get('apikey')!==publishableKey) fail('This store request is not authorized.',401);
        const raw=await readBody(req);
        let body; try { body=JSON.parse(raw); } catch { fail('Check the request details.'); }
        const action=body&&Object.hasOwn(actions,body.action)?actions[body.action]:null;
        if(!action) fail('This store action is not available.',404);
        return Response.json(await action(body,req),{headers:headers(origin)});
      } catch(error) {
        return Response.json({error:error instanceof HttpError?error.message:'The store could not complete this request. Please try again.'},
          {status:error instanceof HttpError?error.status:503,headers:headers(origin)});
      }
    },
  };
}
