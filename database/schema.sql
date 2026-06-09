-- ════════════════════════════════════════════
--  SMART-FLIP 5.0 — Database Schema
--  Jalankan di: Supabase → SQL Editor → New query
-- ════════════════════════════════════════════

-- ── 1. PROFILES (extends Supabase auth.users) ──
CREATE TABLE IF NOT EXISTS profiles (
  id             UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name      TEXT NOT NULL,
  nim_nidn       TEXT,
  role           TEXT NOT NULL CHECK (role IN ('mahasiswa', 'dosen')),
  learning_style TEXT CHECK (learning_style IN ('visual','auditory','reading','kinesthetic')),
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. MODULES ──
CREATE TABLE IF NOT EXISTS modules (
  id          SERIAL PRIMARY KEY,
  order_num   INT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT,
  video_url   TEXT,
  pdf_path    TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. USER PROGRESS ──
CREATE TABLE IF NOT EXISTS user_progress (
  id           SERIAL PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  module_id    INT  REFERENCES modules(id)  ON DELETE CASCADE,
  status       TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  time_spent   INT  DEFAULT 0,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, module_id)
);

-- ── 4. QUIZ QUESTIONS ──
CREATE TABLE IF NOT EXISTS quiz_questions (
  id          SERIAL PRIMARY KEY,
  module_id   INT  REFERENCES modules(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,
  answer_idx  INT  NOT NULL,
  explanation TEXT,
  order_num   INT
);

-- ── 5. QUIZ ATTEMPTS ──
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           SERIAL PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  module_id    INT  REFERENCES modules(id)  ON DELETE CASCADE,
  score        INT  NOT NULL,
  answers      JSONB,
  passed       BOOLEAN GENERATED ALWAYS AS (score >= 60) STORED,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. DRAFTS ──
CREATE TABLE IF NOT EXISTS drafts (
  id           SERIAL PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  module_id    INT  REFERENCES modules(id),
  version      INT  DEFAULT 1,
  title        TEXT,
  file_url     TEXT,
  notes        TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. DRAFT COMMENTS ──
CREATE TABLE IF NOT EXISTS draft_comments (
  id         SERIAL PRIMARY KEY,
  draft_id   INT  REFERENCES drafts(id) ON DELETE CASCADE,
  dosen_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  comment    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. FORUM POSTS ──
CREATE TABLE IF NOT EXISTS forum_posts (
  id         SERIAL PRIMARY KEY,
  module_id  INT  REFERENCES modules(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id  INT  REFERENCES forum_posts(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts     ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "user see own profile"     ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "dosen see all profiles"   ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'));
CREATE POLICY "user update own profile"  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "insert own profile"       ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- modules & questions: semua user login bisa baca
CREATE POLICY "all read modules"    ON modules        FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "dosen manage modules" ON modules       FOR ALL    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'));
CREATE POLICY "all read questions"  ON quiz_questions FOR SELECT USING (auth.uid() IS NOT NULL);

-- progress
CREATE POLICY "user manage own progress" ON user_progress FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "dosen view all progress"  ON user_progress FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'));

-- quiz attempts
CREATE POLICY "user manage own attempts" ON quiz_attempts FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "dosen view all attempts"  ON quiz_attempts FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'));

-- drafts
CREATE POLICY "user manage own drafts"  ON drafts FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "dosen view all drafts"   ON drafts FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'));

-- draft comments
CREATE POLICY "dosen insert comments"       ON draft_comments FOR INSERT  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'));
CREATE POLICY "see comments on own draft"   ON draft_comments FOR SELECT  USING (EXISTS (SELECT 1 FROM drafts WHERE id = draft_id AND user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'));

-- forum
CREATE POLICY "auth users read forum"  ON forum_posts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth users post forum"  ON forum_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════
--  TRIGGERS
-- ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengguna Baru'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'mahasiswa')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ════════════════════════════════════════════
--  DATA AWAL: 9 Modul sesuai RPS
-- ════════════════════════════════════════════
INSERT INTO modules (order_num, title, description) VALUES
  (1, 'Dasar & Konsep R&D',                  'Urgenci R&D vokasi, paradigma penelitian pengembangan'),
  (2, 'Model R&D (ADDIE, 4D, Borg & Gall)',  'Perbandingan model, pemilihan model sesuai konteks'),
  (3, 'Needs Assessment & Gap Analysis',      'Teknik analisis kebutuhan dan identifikasi kesenjangan'),
  (4, 'Penyusunan Bab 1 Proposal',            'Latar belakang, rumusan masalah, tujuan, manfaat'),
  (5, 'Blueprint & Storyboard Produk',        'Perencanaan desain produk, wireframe, storyboard'),
  (6, 'Instrumen Validasi Ahli',              'Penyusunan angket validasi media dan materi'),
  (7, 'Analisis Data Validasi',               'Teknik analisis kelayakan, persentase, kategori'),
  (8, 'Uji Coba & Implementasi',              'Uji kelompok kecil, uji lapangan, revisi produk'),
  (9, 'Evaluasi & Diseminasi',                'Kuasi-eksperimen, N-Gain, pelaporan, publikasi');
