
DROP POLICY "questions read guru/admin/siswa" ON public.questions;
CREATE POLICY "questions read guru/admin" ON public.questions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'guru') OR public.has_role(auth.uid(),'admin'));
