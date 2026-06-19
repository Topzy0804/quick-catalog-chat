
DROP POLICY "Anyone creates orders" ON public.orders;
CREATE POLICY "Anyone creates orders for real sellers" ON public.orders FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id));

DROP POLICY "Anyone inserts order_items" ON public.order_items;
CREATE POLICY "Anyone inserts items for real orders" ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id));

-- Public read for shop-assets bucket
CREATE POLICY "Public read shop-assets" ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-assets');
CREATE POLICY "Authenticated upload shop-assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'shop-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Authenticated update own shop-assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'shop-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Authenticated delete own shop-assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'shop-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
