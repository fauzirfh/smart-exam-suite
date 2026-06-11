
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'guru', 'siswa');
CREATE TYPE public.question_type AS ENUM ('pg', 'esai');
CREATE TYPE public.exam_status AS ENUM ('draft', 'aktif', 'selesai');
CREATE TYPE public.attempt_status AS ENUM ('berlangsung', 'selesai');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'siswa',
  kelas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role);
$$;

CREATE POLICY "profiles select own or admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles update own or admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles admin insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR id = auth.uid());
CREATE POLICY "profiles admin delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nama, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)), 'siswa');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- subjects
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_mapel TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects read all auth" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "subjects admin write" ON public.subjects FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "subjects admin update" ON public.subjects FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "subjects admin delete" ON public.subjects FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- questions
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  pembuat_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipe public.question_type NOT NULL DEFAULT 'pg',
  pertanyaan TEXT NOT NULL,
  opsi_jawaban JSONB NOT NULL DEFAULT '[]'::jsonb,
  kunci_jawaban TEXT NOT NULL,
  bobot INT NOT NULL DEFAULT 1,
  tingkat_kesulitan TEXT NOT NULL DEFAULT 'sedang',
  gambar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions read guru/admin/siswa" ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "questions guru insert" ON public.questions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'guru') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "questions guru update own" ON public.questions FOR UPDATE TO authenticated
  USING (pembuat_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "questions guru delete own" ON public.questions FOR DELETE TO authenticated
  USING (pembuat_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- exams
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  pembuat_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  durasi_menit INT NOT NULL DEFAULT 60,
  waktu_mulai TIMESTAMPTZ NOT NULL DEFAULT now(),
  waktu_selesai TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  token TEXT NOT NULL,
  acak_soal BOOLEAN NOT NULL DEFAULT false,
  acak_opsi BOOLEAN NOT NULL DEFAULT false,
  status public.exam_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exams read all auth" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "exams guru insert" ON public.exams FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'guru') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "exams guru update own" ON public.exams FOR UPDATE TO authenticated
  USING (pembuat_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "exams guru delete own" ON public.exams FOR DELETE TO authenticated
  USING (pembuat_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- exam_questions
CREATE TABLE public.exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  urutan INT NOT NULL DEFAULT 0,
  UNIQUE(exam_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_questions TO authenticated;
GRANT ALL ON public.exam_questions TO service_role;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eq read all auth" ON public.exam_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "eq guru manage" ON public.exam_questions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND (e.pembuat_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND (e.pembuat_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- exam_attempts
CREATE TABLE public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  siswa_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  waktu_mulai TIMESTAMPTZ NOT NULL DEFAULT now(),
  waktu_selesai TIMESTAMPTZ,
  skor NUMERIC,
  status public.attempt_status NOT NULL DEFAULT 'berlangsung',
  UNIQUE(exam_id, siswa_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_attempts TO authenticated;
GRANT ALL ON public.exam_attempts TO service_role;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts siswa own + guru/admin" ON public.exam_attempts FOR SELECT TO authenticated
  USING (
    siswa_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND e.pembuat_id = auth.uid())
  );
CREATE POLICY "attempts siswa insert own" ON public.exam_attempts FOR INSERT TO authenticated
  WITH CHECK (siswa_id = auth.uid());
CREATE POLICY "attempts siswa update own" ON public.exam_attempts FOR UPDATE TO authenticated
  USING (siswa_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- answers
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  jawaban_siswa TEXT,
  benar BOOLEAN,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO authenticated;
GRANT ALL ON public.answers TO service_role;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers siswa own + guru/admin" ON public.answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_attempts a
      LEFT JOIN public.exams e ON e.id = a.exam_id
      WHERE a.id = attempt_id
        AND (a.siswa_id = auth.uid() OR e.pembuat_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "answers siswa upsert own" ON public.answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.exam_attempts a WHERE a.id = attempt_id AND a.siswa_id = auth.uid()));
CREATE POLICY "answers siswa update own" ON public.answers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exam_attempts a WHERE a.id = attempt_id AND a.siswa_id = auth.uid()));

-- Seed: 1 subject, 5 questions, 1 active exam
INSERT INTO public.subjects (id, nama_mapel) VALUES ('11111111-1111-1111-1111-111111111111', 'Matematika');

INSERT INTO public.questions (id, subject_id, tipe, pertanyaan, opsi_jawaban, kunci_jawaban, bobot, tingkat_kesulitan) VALUES
('22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'pg', 'Berapakah hasil dari 5 + 7?', '["10","11","12","13"]'::jsonb, 'C', 1, 'mudah'),
('22222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'pg', 'Akar kuadrat dari 144 adalah?', '["10","11","12","14"]'::jsonb, 'C', 1, 'mudah'),
('22222222-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'pg', 'Hasil dari 9 x 8 adalah?', '["64","72","81","56"]'::jsonb, 'B', 1, 'sedang'),
('22222222-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'pg', 'Berapakah nilai dari 100 / 4?', '["20","25","30","40"]'::jsonb, 'B', 1, 'sedang'),
('22222222-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'pg', 'Bilangan prima terkecil adalah?', '["1","2","3","5"]'::jsonb, 'B', 1, 'mudah');

INSERT INTO public.exams (id, judul, subject_id, durasi_menit, waktu_mulai, waktu_selesai, token, status)
VALUES ('33333333-3333-3333-3333-333333333333', 'Ujian Matematika Dasar', '11111111-1111-1111-1111-111111111111', 30, now() - INTERVAL '1 hour', now() + INTERVAL '30 days', 'CBT123', 'aktif');

INSERT INTO public.exam_questions (exam_id, question_id, urutan) VALUES
('33333333-3333-3333-3333-333333333333', '22222222-0000-0000-0000-000000000001', 1),
('33333333-3333-3333-3333-333333333333', '22222222-0000-0000-0000-000000000002', 2),
('33333333-3333-3333-3333-333333333333', '22222222-0000-0000-0000-000000000003', 3),
('33333333-3333-3333-3333-333333333333', '22222222-0000-0000-0000-000000000004', 4),
('33333333-3333-3333-3333-333333333333', '22222222-0000-0000-0000-000000000005', 5);
