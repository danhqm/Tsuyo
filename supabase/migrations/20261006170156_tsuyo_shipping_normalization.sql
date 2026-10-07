-- Normalize regional names while retaining the existing service-only function grants.
create or replace function public.store_quote(p_items jsonb, p_country text, p_region text, p_coupon text default null)
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
    and (cardinality(regions) = 0 or exists(select 1 from unnest(regions) as r(region) where lower(trim(r.region)) = lower(trim(p_region))))
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
