-- Tsuyo commerce. All customer-facing tables use RLS; sensitive writes are server-only.
create schema if not exists store_private;
revoke all on schema store_private from public;
grant usage on schema store_private to authenticated, service_role;

create table store_private.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager')),
  created_at timestamptz not null default now()
);
alter table store_private.staff enable row level security;
grant all on store_private.staff to service_role;

create function store_private.is_staff() returns boolean language sql stable
security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from store_private.staff where user_id = auth.uid()
  );
$$;
revoke all on function store_private.is_staff() from public, anon;
grant execute on function store_private.is_staff() to authenticated;
create function public.store_is_staff() returns boolean language sql stable
security invoker set search_path = '' as $$ select store_private.is_staff(); $$;
revoke all on function public.store_is_staff() from public, anon;
grant execute on function public.store_is_staff() to authenticated;

create table public.store_settings (
  id boolean primary key default true check (id),
  name text not null default 'Tsuyo', currency text not null default 'MYR' check (currency = 'MYR'),
  checkout_enabled boolean not null default false,
  tax_mode text not null default 'inclusive' check (tax_mode in ('inclusive', 'stripe_tax')),
  support_email text, updated_at timestamptz not null default now()
);
insert into public.store_settings(id) values (true);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (length(full_name) <= 120),
  phone text check (length(phone) <= 40), updated_at timestamptz not null default now()
);
create table public.addresses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home', recipient text not null, line1 text not null, line2 text,
  city text not null, region text not null, postal_code text not null,
  country text not null check (country ~ '^[A-Z]{2}$'), phone text, created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses(user_id);
create table public.products (
  id text primary key check (id ~ '^[a-z0-9-]+$'), name text not null,
  description text not null default '', category text not null check (category in ('men','women','unisex')),
  product_type text not null, color text not null, color_hex text not null default '#191919',
  image_url text not null, gallery jsonb not null default '[]', details jsonb not null default '[]',
  fit text not null default '', care text not null default '', collection text not null default 'CORE COLLECTION',
  status text not null default 'draft' check (status in ('draft','active','archived')),
  is_demo boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index products_catalog_idx on public.products(category,product_type) where status = 'active';
create table public.product_variants (
  id uuid primary key default gen_random_uuid(), product_id text not null references public.products(id) on delete cascade,
  sku text not null unique, size text not null, price_minor integer not null check (price_minor > 0 and price_minor <= 100000000),
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  stock_reserved integer not null default 0 check (stock_reserved >= 0 and stock_reserved <= stock_on_hand),
  active boolean not null default true, unique(product_id,size)
);
create index variants_product_idx on public.product_variants(product_id);
create table public.carts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
create table public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 10), primary key(cart_id,variant_id)
);
create index cart_items_variant_idx on public.cart_items(variant_id);
create table public.wishlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,product_id)
);
create index wishlist_product_idx on public.wishlist_items(product_id);
create table public.shipping_zones (
  id uuid primary key default gen_random_uuid(), name text not null, countries text[] not null,
  regions text[] not null default '{}', fee_minor integer not null check (fee_minor >= 0),
  free_over_minor integer check (free_over_minor >= 0), enabled boolean not null default false,
  priority integer not null default 0,
  check (cardinality(countries) > 0), created_at timestamptz not null default now()
);
create table public.coupons (
  code text primary key check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,30}$'),
  kind text not null check (kind in ('fixed','percent')), amount integer not null check (amount > 0),
  min_subtotal_minor integer not null default 0 check (min_subtotal_minor >= 0),
  max_uses integer check (max_uses > 0), starts_at timestamptz not null default now(), expires_at timestamptz,
  enabled boolean not null default false, check (kind <> 'percent' or amount <= 10000)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), order_number bigint generated always as identity unique,
  checkout_key uuid not null unique, customer_id uuid references auth.users(id) on delete set null,
  email text not null, recipient text not null, shipping_address jsonb not null, guest_access_hash text not null,
  currency text not null default 'MYR' check (currency = 'MYR'),
  subtotal_minor integer not null, discount_minor integer not null default 0, shipping_minor integer not null,
  tax_minor integer not null default 0, total_minor integer not null,
  tax_mode text not null, shipping_name text not null, shipping_zone_id uuid references public.shipping_zones(id),
  coupon_code text references public.coupons(code),
  payment_status text not null default 'pending' check (payment_status in ('pending','processing','paid','failed','refunded','partially_refunded')),
  fulfillment_status text not null default 'unfulfilled' check (fulfillment_status in ('unfulfilled','processing','shipped','delivered','cancelled')),
  stripe_session_id text unique, stripe_payment_intent_id text unique,
  refund_minor integer not null default 0 check (refund_minor >= 0),
  reservation_status text not null default 'held' check (reservation_status in ('held','consumed','released')),
  reservation_expires_at timestamptz not null default now() + interval '35 minutes',
  carrier text, tracking_number text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (subtotal_minor >= 0 and discount_minor >= 0 and shipping_minor >= 0 and tax_minor >= 0),
  check (total_minor = subtotal_minor - discount_minor + shipping_minor + tax_minor),
  check (discount_minor <= subtotal_minor and refund_minor <= total_minor)
);
create index orders_customer_idx on public.orders(customer_id,created_at desc);
create index orders_zone_idx on public.orders(shipping_zone_id);
create index orders_coupon_idx on public.orders(coupon_code) where coupon_code is not null;
create index orders_reconcile_idx on public.orders(reservation_expires_at) where reservation_status = 'held';
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_id text, name text not null, sku text not null, size text not null, color text not null, image_url text not null,
  quantity integer not null check (quantity between 1 and 10), unit_price_minor integer not null check (unit_price_minor > 0),
  unique(order_id,variant_id)
);
create index order_items_variant_idx on public.order_items(variant_id);
create table public.payments (
  order_id uuid primary key references public.orders(id), provider text not null default 'stripe',
  provider_payment_id text not null unique, amount_minor integer not null, refund_minor integer not null default 0,
  currency text not null, paid_at timestamptz not null default now()
);
create table public.order_events (
  id bigint generated always as identity primary key, order_id uuid not null references public.orders(id),
  actor_id uuid references auth.users(id) on delete set null, kind text not null, data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events(order_id,created_at);
create index order_events_actor_idx on public.order_events(actor_id);
create table public.inventory_movements (
  id bigint generated always as identity primary key, variant_id uuid not null references public.product_variants(id),
  order_id uuid references public.orders(id), actor_id uuid references auth.users(id) on delete set null,
  delta integer not null, reason text not null, created_at timestamptz not null default now()
);
create index inventory_variant_idx on public.inventory_movements(variant_id,created_at);
create index inventory_order_idx on public.inventory_movements(order_id);
create index inventory_actor_idx on public.inventory_movements(actor_id);
create table public.webhook_events (id text primary key, kind text not null, processed_at timestamptz not null default now());
create table public.newsletter_subscribers (
  email text primary key, consent_at timestamptz not null default now(), status text not null default 'subscribed'
  check (status in ('subscribed','unsubscribed')), unsubscribe_token uuid not null default gen_random_uuid() unique
);
create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id),
  kind text not null, recipient text not null, payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','sending','sent')),
  attempts integer not null default 0, available_at timestamptz not null default now(), sent_at timestamptz,
  created_at timestamptz not null default now(), unique(order_id,kind)
);
create index outbox_pending_idx on public.notification_outbox(available_at) where status <> 'sent';
create index outbox_order_idx on public.notification_outbox(order_id);
create table public.store_rate_limits (key text primary key, count integer not null, window_start timestamptz not null);

-- Enable RLS explicitly on every new exposed table, including server-only tables.
do $$ declare n text; begin
  foreach n in array array['store_settings','profiles','addresses','products','product_variants','carts','cart_items',
  'wishlist_items','shipping_zones','coupons','orders','order_items','payments','order_events','inventory_movements',
  'webhook_events','newsletter_subscribers','notification_outbox','store_rate_limits'] loop
    execute format('alter table public.%I enable row level security',n);
    execute format('revoke all on public.%I from anon, authenticated',n);
    execute format('grant all on public.%I to service_role',n);
  end loop;
end $$;
grant usage, select on sequence public.orders_order_number_seq, public.order_events_id_seq, public.inventory_movements_id_seq to service_role;
grant select on public.store_settings, public.products, public.product_variants, public.shipping_zones to anon,authenticated;
create policy settings_public on public.store_settings for select to anon,authenticated using (true);
create policy products_public on public.products for select to anon,authenticated using (status = 'active');
create policy products_staff on public.products for select to authenticated using ((select store_private.is_staff()));
create policy variants_public on public.product_variants for select to anon,authenticated using (
  active and exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
);
create policy variants_staff on public.product_variants for select to authenticated using ((select store_private.is_staff()));
create policy shipping_public on public.shipping_zones for select to anon,authenticated using (enabled);
create policy shipping_staff on public.shipping_zones for select to authenticated using ((select store_private.is_staff()));
grant select,insert,update on public.profiles to authenticated;
create policy profiles_own on public.profiles for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant select,insert,update,delete on public.addresses,public.carts,public.cart_items,public.wishlist_items to authenticated;
create policy addresses_own on public.addresses for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy carts_own on public.carts for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy cart_items_own on public.cart_items for all to authenticated
  using (exists(select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())))
  with check (exists(select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));
create policy wishlist_own on public.wishlist_items for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select on public.orders,public.order_items,public.payments,public.order_events,public.coupons,public.inventory_movements to authenticated;
create policy orders_own on public.orders for select to authenticated using (customer_id = (select auth.uid()));
create policy orders_staff on public.orders for select to authenticated using ((select store_private.is_staff()));
create policy order_items_own on public.order_items for select to authenticated using (
  exists(select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
);
create policy order_items_staff on public.order_items for select to authenticated using ((select store_private.is_staff()));
create policy payments_own on public.payments for select to authenticated using (
  exists(select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
);
create policy payments_staff on public.payments for select to authenticated using ((select store_private.is_staff()));
create policy events_staff on public.order_events for select to authenticated using ((select store_private.is_staff()));
create policy coupons_staff on public.coupons for select to authenticated using ((select store_private.is_staff()));
create policy inventory_staff on public.inventory_movements for select to authenticated using ((select store_private.is_staff()));

-- Authoritative quote: no price, discount, stock, or shipping amount comes from the client.
create function public.store_quote(p_items jsonb, p_country text, p_region text, p_coupon text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare item jsonb; v record; zone public.shipping_zones%rowtype; cp public.coupons%rowtype;
  lines jsonb := '[]'; subtotal integer := 0; discount integer := 0; shipping integer; qty integer; n integer := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Your bag must contain 1 to 30 different pieces.'; end if;
  if (select count(distinct x->>'variant_id') from jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items) then raise exception 'Duplicate sizes in bag.'; end if;
  for item in select x from jsonb_array_elements(p_items) x order by x->>'variant_id' loop
    if (item->>'quantity') !~ '^[0-9]+$' then raise exception 'Invalid quantity.'; end if;
    qty := (item->>'quantity')::integer;
    if qty not between 1 and 10 then raise exception 'Choose between 1 and 10 pieces per size.'; end if;
    select pv.*, p.name, p.color, p.image_url into v from public.product_variants pv join public.products p on p.id = pv.product_id
      where pv.id = (item->>'variant_id')::uuid and pv.active and p.status = 'active' and not p.is_demo;
    if not found then raise exception 'A piece in your bag is no longer available.'; end if;
    if v.stock_on_hand - v.stock_reserved < qty then raise exception 'Not enough stock for % in %.',v.name,v.size; end if;
    subtotal := subtotal + v.price_minor * qty;
    lines := lines || jsonb_build_array(jsonb_build_object('variant_id',v.id,'product_id',v.product_id,'name',v.name,'sku',v.sku,
      'size',v.size,'color',v.color,'image_url',v.image_url,'quantity',qty,'unit_price_minor',v.price_minor));
  end loop;
  select * into zone from public.shipping_zones where enabled and upper(p_country) = any(countries)
    and (cardinality(regions) = 0 or p_region = any(regions))
    order by (cardinality(regions) > 0) desc, priority desc, id limit 1;
  if not found then raise exception 'Delivery is not available for this address yet.'; end if;
  if nullif(upper(trim(p_coupon)),'') is not null then
    select * into cp from public.coupons where code = upper(trim(p_coupon)) and enabled
      and starts_at <= now() and (expires_at is null or expires_at > now()) and subtotal >= min_subtotal_minor;
    if not found then raise exception 'This promo code is not available for this bag.'; end if;
    select count(*) into n from public.orders where coupon_code = cp.code and reservation_status <> 'released';
    if cp.max_uses is not null and n >= cp.max_uses then raise exception 'This promo code has reached its limit.'; end if;
    discount := least(subtotal, case when cp.kind = 'fixed' then cp.amount else (subtotal::bigint * cp.amount / 10000)::integer end);
  end if;
  shipping := case when zone.free_over_minor is not null and subtotal-discount >= zone.free_over_minor then 0 else zone.fee_minor end;
  return jsonb_build_object('items',lines,'subtotal_minor',subtotal,'discount_minor',discount,'shipping_minor',shipping,'total_minor',subtotal-discount+shipping,
    'currency','MYR','shipping_zone_id',zone.id,'shipping_name',zone.name,'coupon_code',cp.code,'tax_mode',(select tax_mode from public.store_settings where id));
end $$;

create function public.store_create_order(p_key uuid,p_customer uuid,p_email text,p_recipient text,p_address jsonb,p_items jsonb,p_guest_hash text,p_coupon text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare o public.orders%rowtype; q jsonb; item jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  select * into o from public.orders where checkout_key = p_key;
  if found then
    if o.customer_id is distinct from p_customer or o.email <> lower(trim(p_email)) or o.guest_access_hash <> p_guest_hash then raise exception 'Checkout belongs to another customer.'; end if;
    if o.reservation_status <> 'held' or o.payment_status <> 'pending' then raise exception 'Start a new checkout for this bag.'; end if;
    return jsonb_build_object('order',to_jsonb(o),'items',(select jsonb_agg(to_jsonb(i)) from public.order_items i where i.order_id = o.id));
  end if;
  if not (select checkout_enabled from public.store_settings where id) then raise exception 'Checkout is not open yet.'; end if;
  if length(p_guest_hash) <> 64 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p_email)>254
    or length(trim(p_recipient)) not between 1 and 120 then raise exception 'Check your contact details.'; end if;
  if p_address->>'country' !~ '^[A-Z]{2}$' or length(p_address->>'line1') not between 1 and 200
    or length(p_address->>'city') not between 1 and 120 or length(p_address->>'postal_code') not between 1 and 24
    or length(p_address->>'region') not between 1 and 120 then raise exception 'Complete your delivery address.'; end if;
  -- Consistent lock ordering prevents two multi-item checkouts from deadlocking.
  perform 1 from public.product_variants where id in (select (x->>'variant_id')::uuid from jsonb_array_elements(p_items) x) order by id for update;
  if nullif(p_coupon,'') is not null then perform 1 from public.coupons where code = upper(trim(p_coupon)) for update; end if;
  q := public.store_quote(p_items,p_address->>'country',p_address->>'region',p_coupon);
  insert into public.orders(checkout_key,customer_id,email,recipient,shipping_address,guest_access_hash,subtotal_minor,discount_minor,shipping_minor,total_minor,tax_mode,shipping_name,shipping_zone_id,coupon_code)
    values(p_key,p_customer,lower(trim(p_email)),trim(p_recipient),p_address,p_guest_hash,(q->>'subtotal_minor')::integer,(q->>'discount_minor')::integer,
      (q->>'shipping_minor')::integer,(q->>'total_minor')::integer,q->>'tax_mode',q->>'shipping_name',(q->>'shipping_zone_id')::uuid,q->>'coupon_code') returning * into o;
  for item in select x from jsonb_array_elements(q->'items') x loop
    insert into public.order_items(order_id,variant_id,product_id,name,sku,size,color,image_url,quantity,unit_price_minor)
      values(o.id,(item->>'variant_id')::uuid,item->>'product_id',item->>'name',item->>'sku',item->>'size',item->>'color',item->>'image_url',
      (item->>'quantity')::integer,(item->>'unit_price_minor')::integer);
    update public.product_variants set stock_reserved = stock_reserved + (item->>'quantity')::integer where id = (item->>'variant_id')::uuid;
  end loop;
  insert into public.order_events(order_id,kind) values(o.id,'checkout_started');
  return jsonb_build_object('order',to_jsonb(o),'items',q->'items','shipping_name',q->>'shipping_name');
end $$;

create function public.store_payment_paid(p_event text,p_order uuid,p_session text,p_intent text,p_total integer,p_tax integer,p_currency text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare o public.orders%rowtype; i record;
begin
  select * into o from public.orders where id = p_order for update;
  if not found or o.stripe_session_id is distinct from p_session or upper(p_currency) <> o.currency
    or p_intent is null or p_tax < 0 or p_total <> o.subtotal_minor-o.discount_minor+o.shipping_minor+p_tax
    or (o.tax_mode = 'inclusive' and p_tax <> 0) then raise exception 'Payment does not match the order.'; end if;
  if exists(select 1 from public.webhook_events where id = p_event) then return false; end if;
  if o.reservation_status = 'released' then raise exception 'Payment needs manual review: reservation was released.'; end if;
  if o.reservation_status = 'held' then
    for i in select * from public.order_items where order_id = o.id order by variant_id loop
      update public.product_variants set stock_on_hand = stock_on_hand-i.quantity,stock_reserved = stock_reserved-i.quantity where id = i.variant_id;
      insert into public.inventory_movements(variant_id,order_id,delta,reason) values(i.variant_id,o.id,-i.quantity,'sale');
    end loop;
    update public.orders set payment_status='paid',reservation_status='consumed',stripe_payment_intent_id=p_intent,tax_minor=p_tax,total_minor=p_total,updated_at=now() where id=o.id;
    insert into public.payments(order_id,provider_payment_id,amount_minor,currency) values(o.id,p_intent,p_total,o.currency);
    insert into public.order_events(order_id,kind) values(o.id,'payment_received');
    insert into public.notification_outbox(order_id,kind,recipient,payload) values(o.id,'order_confirmation',o.email,jsonb_build_object('order_id',o.id,'order_number',o.order_number));
  end if;
  insert into public.webhook_events(id,kind) values(p_event,'payment_paid') on conflict do nothing;
  return true;
end $$;

create function public.store_release_order(p_order uuid,p_reason text,p_session text default null)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare o public.orders%rowtype; i record;
begin
  select * into o from public.orders where id=p_order for update;
  if not found or o.reservation_status <> 'held' then return false; end if;
  if p_session is distinct from o.stripe_session_id then raise exception 'Checkout session does not match.'; end if;
  for i in select * from public.order_items where order_id=o.id order by variant_id loop
    update public.product_variants set stock_reserved=stock_reserved-i.quantity where id=i.variant_id;
  end loop;
  update public.orders set payment_status='failed',reservation_status='released',fulfillment_status='cancelled',updated_at=now() where id=o.id;
  insert into public.order_events(order_id,kind,data) values(o.id,'checkout_released',jsonb_build_object('reason',p_reason));
  return true;
end $$;

create function public.store_adjust_stock(p_variant uuid,p_delta integer,p_actor uuid,p_reason text)
returns integer language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  if not exists(select 1 from store_private.staff where user_id=p_actor) then raise exception 'Staff access required.'; end if;
  if p_delta=0 or abs(p_delta::bigint)>100000 or length(trim(p_reason)) not between 1 and 200 then raise exception 'Check the stock adjustment.'; end if;
  update public.product_variants set stock_on_hand=stock_on_hand+p_delta where id=p_variant and stock_on_hand+p_delta>=stock_reserved returning stock_on_hand into n;
  if not found then raise exception 'Stock cannot fall below reserved pieces.'; end if;
  insert into public.inventory_movements(variant_id,actor_id,delta,reason) values(p_variant,p_actor,p_delta,p_reason);
  return n;
end $$;
create function public.store_fulfill(p_order uuid,p_actor uuid,p_status text,p_carrier text default null,p_tracking text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare o public.orders%rowtype;
begin
  if not exists(select 1 from store_private.staff where user_id=p_actor) then raise exception 'Staff access required.'; end if;
  select * into o from public.orders where id=p_order for update;
  if not found or o.payment_status not in ('paid','partially_refunded') then raise exception 'Only paid orders can be fulfilled.'; end if;
  if not ((o.fulfillment_status='unfulfilled' and p_status='processing') or (o.fulfillment_status='processing' and p_status='shipped')
    or (o.fulfillment_status='shipped' and p_status='delivered')) then raise exception 'Invalid fulfillment transition.'; end if;
  if p_status='shipped' and (nullif(trim(p_carrier),'') is null or nullif(trim(p_tracking),'') is null) then raise exception 'Enter the carrier and tracking number.'; end if;
  update public.orders set fulfillment_status=p_status,carrier=coalesce(p_carrier,carrier),tracking_number=coalesce(p_tracking,tracking_number),updated_at=now() where id=p_order;
  insert into public.order_events(order_id,actor_id,kind,data) values(p_order,p_actor,'fulfillment_updated',jsonb_build_object('status',p_status));
  if p_status='shipped' then insert into public.notification_outbox(order_id,kind,recipient,payload) values(p_order,'shipping_confirmation',o.email,
    jsonb_build_object('order_id',p_order,'carrier',p_carrier,'tracking_number',p_tracking)) on conflict do nothing; end if;
end $$;
create function public.store_refund_record(p_event text,p_intent text,p_amount integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where stripe_payment_intent_id=p_intent for update;
  if not found or p_amount < 0 or p_amount > o.total_minor then raise exception 'Refund does not match an order.'; end if;
  if exists(select 1 from public.webhook_events where id=p_event) then return; end if;
  update public.orders set refund_minor=greatest(refund_minor,p_amount),payment_status=case when greatest(refund_minor,p_amount)=total_minor then 'refunded' else 'partially_refunded' end,updated_at=now() where id=o.id;
  update public.payments set refund_minor=greatest(refund_minor,p_amount) where order_id=o.id;
  insert into public.webhook_events(id,kind) values(p_event,'refund_recorded');
  insert into public.order_events(order_id,kind,data) values(o.id,'refund_updated',jsonb_build_object('refund_minor',p_amount));
end $$;
create function public.store_rate_limit(p_key text,p_max integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  insert into public.store_rate_limits(key,count,window_start) values(p_key,1,now())
  on conflict(key) do update set count=case when public.store_rate_limits.window_start < now()-make_interval(secs=>p_seconds) then 1 else public.store_rate_limits.count+1 end,
    window_start=case when public.store_rate_limits.window_start < now()-make_interval(secs=>p_seconds) then now() else public.store_rate_limits.window_start end returning count into n;
  return n<=p_max;
end $$;

create function public.store_replace_cart(p_items jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare cart uuid; item jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to save your bag.'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>30 then raise exception 'Invalid bag.'; end if;
  insert into public.carts(user_id) values(auth.uid()) on conflict(user_id) do update set updated_at=now() returning id into cart;
  delete from public.cart_items where cart_id=cart;
  for item in select x from jsonb_array_elements(p_items) x loop
    insert into public.cart_items(cart_id,variant_id,quantity) values(cart,(item->>'variant_id')::uuid,(item->>'quantity')::integer);
  end loop;
  return cart;
end $$;
revoke all on function public.store_replace_cart(jsonb) from public,anon;
grant execute on function public.store_replace_cart(jsonb) to authenticated;

create function public.store_claim_notifications(p_limit integer default 20) returns setof public.notification_outbox
language sql security invoker set search_path = '' as $$
  update public.notification_outbox set status='sending',attempts=attempts+1,available_at=now()+interval '5 minutes'
  where id in (select id from public.notification_outbox where status <> 'sent' and available_at <= now()
    order by created_at for update skip locked limit least(greatest(p_limit,1),50)) returning *;
$$;

-- None of the commerce mutation RPCs can be invoked by a browser role.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('store_quote','store_create_order','store_payment_paid','store_release_order','store_adjust_stock','store_fulfill','store_refund_record','store_rate_limit','store_claim_notifications') loop
    execute format('revoke all on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
