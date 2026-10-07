-- Combine equivalent read policies so authenticated queries evaluate one policy per table.
alter policy products_public on public.products to anon;
alter policy products_staff on public.products using (status='active' or (select store_private.is_staff()));
alter policy variants_public on public.product_variants to anon;
alter policy variants_staff on public.product_variants using ((select store_private.is_staff()) or
  (active and exists(select 1 from public.products p where p.id=product_id and p.status='active')));
alter policy shipping_public on public.shipping_zones to anon;
alter policy shipping_staff on public.shipping_zones using (enabled or (select store_private.is_staff()));
drop policy orders_staff on public.orders;
alter policy orders_own on public.orders using (customer_id=(select auth.uid()) or (select store_private.is_staff()));
drop policy order_items_staff on public.order_items;
alter policy order_items_own on public.order_items using ((select store_private.is_staff()) or
  exists(select 1 from public.orders o where o.id=order_id and o.customer_id=(select auth.uid())));
drop policy payments_staff on public.payments;
alter policy payments_own on public.payments using ((select store_private.is_staff()) or
  exists(select 1 from public.orders o where o.id=order_id and o.customer_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('product-media','product-media',true,10485760,array['image/jpeg','image/png','image/webp','image/avif']) on conflict(id) do nothing;
create policy tsuyo_product_media_read on storage.objects for select to anon,authenticated using (bucket_id='product-media');
create policy tsuyo_product_media_insert on storage.objects for insert to authenticated
  with check (bucket_id='product-media' and (select store_private.is_staff()));
create policy tsuyo_product_media_update on storage.objects for update to authenticated
  using (bucket_id='product-media' and (select store_private.is_staff()))
  with check (bucket_id='product-media' and (select store_private.is_staff()));
create policy tsuyo_product_media_delete on storage.objects for delete to authenticated
  using (bucket_id='product-media' and (select store_private.is_staff()));
