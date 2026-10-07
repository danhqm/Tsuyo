import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const alice = '10000000-0000-4000-8000-000000000001';
const bob = '10000000-0000-4000-8000-000000000002';
let variant;
const address = {line1:'1 Test Street',city:'Test City',region:'Selangor',postal_code:'50000',country:'MY'};
const items = () => [{variant_id:variant,quantity:1,price_minor:1}];
async function order(key = crypto.randomUUID(), customer = alice, email = 'alice@example.com') {
  return (await db.query('select public.store_create_order($1,$2,$3,$4,$5,$6,$7) as data',
    [key,customer,email,'Test Customer',address,items(),'a'.repeat(64)])).rows[0].data;
}
async function role(name,id,fn) {
  await db.exec(`set role ${name}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
  try { return await fn(); } finally { await db.exec('reset role'); }
}
before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    insert into auth.users(id,email) values('${alice}','alice@example.com'),('${bob}','bob@example.com');`);
  for (const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) {
    // pg_cron, pg_net and Vault are verified on the linked Supabase project, not the portable Postgres WASM runtime.
    if(file.endsWith('_jobs_schedule.sql'))continue;
    const sql = await readFile(`supabase/migrations/${file}`,'utf8');
    try { await db.exec(sql); } catch(error) {
      console.error(file, {position:error.position, internalPosition:error.internalPosition, internalQuery:error.internalQuery,
        near:sql.slice(Math.max(0,Number(error.position)-100),Number(error.position)+100)});
      throw error;
    }
  }
  await db.exec(`insert into public.products(id,name,category,product_type,color,image_url,status,is_demo)
    values('test-tee','Test Tee','men','T-shirts','Onyx','/test.webp','active',false);
    update public.store_settings set checkout_enabled=true;
    update public.shipping_zones set enabled=true,fee_minor=800,free_over_minor=25000;`);
  variant = (await db.query("insert into public.product_variants(product_id,sku,size,price_minor,stock_on_hand) values('test-tee','TEST-M','M',14900,5) returning id")).rows[0].id;
});
after(()=>db.close());
test('every commerce table has RLS, drafts are hidden, and private tables have no public grants',async()=>{
  const rows=(await db.query("select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','store_private') and c.relkind='r'")).rows;
  assert.ok(rows.every(r=>r.relrowsecurity));
  await role('anon',null,async()=>{
    assert.equal((await db.query('select count(*)::int n from public.products')).rows[0].n,1);
    await assert.rejects(db.query('select * from public.orders'),/permission denied/);
    await assert.rejects(db.query('select * from public.newsletter_subscribers'),/permission denied/);
    await assert.rejects(db.query('select public.store_create_order(null,null,null,null,null,null,null)'),/permission denied/);
  });
});
test('profiles, bags and addresses enforce ownership including reassignment',async()=>{
  await role('authenticated',alice,async()=>{
    await db.query('insert into public.profiles(id,full_name) values($1,$2)',[alice,'Alice']);
    await assert.rejects(db.query('insert into public.profiles(id) values($1)',[bob]),/row-level security/);
    await db.query('select public.store_replace_cart($1)',[items()]);
    assert.equal((await db.query('select * from public.cart_items')).rows.length,1);
    await assert.rejects(db.query('update public.carts set user_id=$1',[bob]),/row-level security/);
    await assert.rejects(db.query('insert into store_private.staff values($1,$2,now())',[alice,'owner']),/permission denied/);
    assert.equal((await db.query('select public.store_is_staff() staff')).rows[0].staff,false);
  });
  await role('authenticated',bob,async()=>{
    assert.equal((await db.query('select * from public.profiles')).rows.length,0);
    assert.equal((await db.query('select * from public.cart_items')).rows.length,0);
  });
});
test('authoritative prices, shipping and coupon limits ignore client prices',async()=>{
  const quote=(await db.query('select public.store_quote($1,$2,$3) q',[items(),'MY','Selangor'])).rows[0].q;
  assert.equal(quote.subtotal_minor,14900); assert.equal(quote.shipping_minor,800); assert.equal(quote.total_minor,15700);
  await assert.rejects(db.query('select public.store_quote($1,$2,$3)',[items(),'US','New York']),/Delivery is not available/);
  await assert.rejects(db.query('select public.store_quote($1,$2,$3)',[[{variant_id:variant,quantity:0}],'MY','Selangor']),/between 1 and 10/);
  await assert.rejects(db.query('select public.store_quote($1,$2,$3)',[null,'MY','Selangor']),/1 to 30/);
});
test('reservation and payment processing are idempotent; customers cannot mark orders paid',async()=>{
  const key=crypto.randomUUID(); const first=await order(key); const again=await order(key);
  assert.equal(first.order.id,again.order.id);
  assert.equal((await db.query('select stock_reserved from public.product_variants where id=$1',[variant])).rows[0].stock_reserved,1);
  await assert.rejects(order(key,bob,'bob@example.com'),/another customer/);
  await role('authenticated',alice,async()=>{
    assert.equal((await db.query('select * from public.orders')).rows.length,1);
    await assert.rejects(db.query("update public.orders set payment_status='paid'"),/permission denied/);
  });
  await role('authenticated',bob,async()=>assert.equal((await db.query('select * from public.orders')).rows.length,0));
  await db.query("update public.orders set stripe_session_id='cs_test' where id=$1",[first.order.id]);
  const args=['evt_test',first.order.id,'cs_test','pi_test',15700,0,'myr'];
  await assert.rejects(db.query('select public.store_payment_paid($1,$2,$3,$4,$5,$6,$7)',[...args.slice(0,4),1,0,'myr']),/does not match/);
  await db.query('select public.store_payment_paid($1,$2,$3,$4,$5,$6,$7)',args);
  await db.query('select public.store_payment_paid($1,$2,$3,$4,$5,$6,$7)',args);
  const stock=(await db.query('select stock_on_hand,stock_reserved from public.product_variants where id=$1',[variant])).rows[0];
  assert.deepEqual(stock,{stock_on_hand:4,stock_reserved:0});
  assert.equal((await db.query('select * from public.notification_outbox')).rows.length,1);
});
test('overselling fails and an expired checkout releases exactly once',async()=>{
  await db.query('update public.product_variants set stock_on_hand=1 where id=$1',[variant]);
  const first=await order();
  await assert.rejects(order(),/Not enough stock/);
  await db.query('select public.store_release_order($1,$2)',[first.order.id,'test_expired']);
  await db.query('select public.store_release_order($1,$2)',[first.order.id,'test_expired']);
  assert.equal((await db.query('select stock_reserved from public.product_variants where id=$1',[variant])).rows[0].stock_reserved,0);
});
test('rate limits, fulfillment and stock ledger enforce server rules',async()=>{
  for(let i=0;i<3;i++) assert.equal((await db.query('select public.store_rate_limit($1,2,60) allowed',['test'])).rows[0].allowed,i<2);
  await assert.rejects(db.query('select public.store_adjust_stock($1,2,$2,$3)',[variant,bob,'Restock']),/Staff access required/);
  await db.query("insert into store_private.staff(user_id,role) values($1,'owner')",[alice]);
  await role('authenticated',alice,async()=>assert.equal((await db.query('select public.store_is_staff() staff')).rows[0].staff,true));
  await db.query('select public.store_adjust_stock($1,2,$2,$3)',[variant,alice,'Restock']);
  await assert.rejects(db.query('select public.store_adjust_stock($1,-100,$2,$3)',[variant,alice,'Invalid removal']),/below reserved/);
  const paid=(await db.query("select id from public.orders where payment_status='paid'")).rows[0].id;
  await assert.rejects(db.query('select public.store_fulfill($1,$2,$3)',[paid,alice,'shipped']),/Invalid fulfillment transition/);
  await db.query('select public.store_fulfill($1,$2,$3)',[paid,alice,'processing']);
  await db.query('select public.store_fulfill($1,$2,$3,$4,$5)',[paid,alice,'shipped','Test Carrier','TEST123']);
  assert.equal((await db.query('select * from public.notification_outbox')).rows.length,2);
});
test('a staff invitation requires the exact verified account and is accepted once',async()=>{
  await db.exec("insert into store_private.staff_invitations(email,role) values('bob@example.com','manager');");
  await role('authenticated',bob,async()=>assert.equal((await db.query('select public.store_accept_staff_invitation() staff')).rows[0].staff,false));
  await db.query('update auth.users set email_confirmed_at=now() where id=$1',[bob]);
  await role('authenticated',bob,async()=>{
    assert.equal((await db.query('select public.store_accept_staff_invitation() staff')).rows[0].staff,true);
    assert.equal((await db.query('select public.store_accept_staff_invitation() staff')).rows[0].staff,true);
  });
  assert.equal((await db.query('select count(*)::int n from store_private.staff where user_id=$1',[bob])).rows[0].n,1);
});
test('specific delivery regions match regardless of capitalization or padding',async()=>{
  await db.exec("insert into public.shipping_zones(name,countries,regions,fee_minor,enabled) values('East Malaysia',array['MY'],array['Sabah','Sarawak'],1500,true);");
  const quote=(await db.query('select public.store_quote($1,$2,$3) q',[items(),'MY','  sabah  '])).rows[0].q;
  assert.equal(quote.shipping_minor,1500);assert.equal(quote.shipping_name,'East Malaysia');
});
