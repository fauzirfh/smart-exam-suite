
CREATE POLICY "qi read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'question-images');
CREATE POLICY "qi insert guru/admin" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-images' AND (public.has_role(auth.uid(),'guru') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "qi update guru/admin" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'question-images' AND (public.has_role(auth.uid(),'guru') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "qi delete guru/admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'question-images' AND (public.has_role(auth.uid(),'guru') OR public.has_role(auth.uid(),'admin')));
