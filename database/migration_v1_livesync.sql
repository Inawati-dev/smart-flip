-- ════════════════════════════════════════════
--  SMART-FLIP 5.0 — Migration v1: Live Sync
--  Jalankan di: Supabase → SQL Editor → New query
--  ADDITIVE ONLY — aman dijalankan di project yang sudah punya schema.sql
-- ════════════════════════════════════════════

-- ── 0. FIX KRITIS: schema.sql ASLI GAK PUNYA GRANT SAMA SEKALI ──
-- RLS doang gak cukup (lihat kemampuan-web-dev.md Pola 6) — tanpa GRANT eksplisit,
-- role anon/authenticated gak punya akses ke tabel sama sekali walau RLS policy ada.
-- Kalau tabel-tabel ini kosong/error di frontend meski data ada di Table Editor, INI PENYEBABNYA.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles, modules, quiz_questions, user_progress, quiz_attempts, drafts, draft_comments, forum_posts TO authenticated;
GRANT SELECT ON profiles, modules, quiz_questions TO anon;
GRANT USAGE, SELECT ON SEQUENCE modules_id_seq, quiz_questions_id_seq, user_progress_id_seq, quiz_attempts_id_seq, drafts_id_seq, draft_comments_id_seq, forum_posts_id_seq TO authenticated;

-- ── 1. PROFILES — kolom tambahan ──
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS prodi              TEXT,
  ADD COLUMN IF NOT EXISTS angkatan            TEXT,
  ADD COLUMN IF NOT EXISTS vark_scores        JSONB,
  ADD COLUMN IF NOT EXISTS vark_dominant      TEXT,
  ADD COLUMN IF NOT EXISTS vark_completed_at  TIMESTAMPTZ;

-- ── 2. USER_PROGRESS — kolom tambahan ──
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS pct               INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_page      INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_opened       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seq_state         JSONB DEFAULT '{"videoWatched":false,"pdfOpened":false}',
  ADD COLUMN IF NOT EXISTS refleksi_checks   JSONB DEFAULT '[false,false,false,false,false]';

-- ── 3. DRAFTS — kolom tambahan ──
ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS status  TEXT DEFAULT 'submitted';

ALTER TABLE drafts DROP CONSTRAINT IF EXISTS drafts_status_check;
ALTER TABLE drafts ADD CONSTRAINT drafts_status_check
  CHECK (status IN ('submitted','revision','reviewed'));

-- ── 4. DRAFT_COMMENTS — generalize dari dosen-only ke siapa saja ──
ALTER TABLE draft_comments RENAME COLUMN dosen_id TO author_id;
ALTER TABLE draft_comments
  ADD COLUMN IF NOT EXISTS author_role TEXT DEFAULT 'dosen';
ALTER TABLE draft_comments DROP CONSTRAINT IF EXISTS draft_comments_author_role_check;
ALTER TABLE draft_comments ADD CONSTRAINT draft_comments_author_role_check
  CHECK (author_role IN ('mahasiswa','dosen'));

-- RLS lama untuk draft_comments cuma izinkan dosen insert — perluas ke pemilik draf juga
DROP POLICY IF EXISTS "dosen insert comments" ON draft_comments;
CREATE POLICY "dosen insert comments" ON draft_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen')
      OR EXISTS (SELECT 1 FROM drafts WHERE id = draft_id AND user_id = auth.uid())
    )
  );

-- ── 5. FORUM_POSTS — likes ──
ALTER TABLE forum_posts
  ADD COLUMN IF NOT EXISTS likes INT DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_forum_likes(p_post_id INT)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_posts SET likes = likes + 1 WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_forum_likes(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_forum_likes(INT) TO anon;

-- ── 6. NOTIFICATIONS (tabel baru) ──
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user manage own notifications" ON notifications;
CREATE POLICY "user manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE notifications_id_seq TO authenticated;

-- ── 7. FEEDBACK KEPRAKTISAN (tabel baru) ──
CREATE TABLE IF NOT EXISTS feedback (
  id             SERIAL PRIMARY KEY,
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  module_id      INT  REFERENCES modules(id)  ON DELETE CASCADE,
  konten         INT  NOT NULL CHECK (konten BETWEEN 1 AND 5),
  kemudahan      INT  NOT NULL CHECK (kemudahan BETWEEN 1 AND 5),
  keterbacaan    INT  NOT NULL CHECK (keterbacaan BETWEEN 1 AND 5),
  kebermanfaatan INT  NOT NULL CHECK (kebermanfaatan BETWEEN 1 AND 5),
  rata_rata      NUMERIC(3,1),
  komentar       TEXT,
  submitted_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user manage own feedback" ON feedback;
CREATE POLICY "user manage own feedback" ON feedback FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "dosen view all feedback" ON feedback;
CREATE POLICY "dosen view all feedback" ON feedback FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'));
GRANT SELECT, INSERT ON feedback TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE feedback_id_seq TO authenticated;

-- ── 8. VALIDASI AHLI (tabel baru) ──
CREATE TABLE IF NOT EXISTS validasi_ahli (
  id           SERIAL PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  aspek_media  JSONB NOT NULL,
  aspek_materi JSONB NOT NULL,
  total_avg    NUMERIC(3,1),
  validator    JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE validasi_ahli ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user manage own validasi" ON validasi_ahli;
CREATE POLICY "user manage own validasi" ON validasi_ahli FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "dosen view all validasi" ON validasi_ahli;
CREATE POLICY "dosen view all validasi" ON validasi_ahli FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'));
GRANT SELECT, INSERT, UPDATE ON validasi_ahli TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE validasi_ahli_id_seq TO authenticated;

-- ════════════════════════════════════════════
--  Checklist pasca-migrasi (Pola 14):
--  [ ] Jalankan file ini utuh di SQL Editor project Supabase asli
--  [ ] PENTING: bagian §0 (GRANT) di atas berlaku juga buat tabel LAMA (profiles/modules/dst) —
--      schema.sql asli gak pernah kasih GRANT eksplisit. Kalau app masih gak bisa baca/tulis
--      tabel lama setelah migrasi ini, cek dulu §0 kejalan tanpa error.
--  [ ] Cek Table Editor: notifications, feedback, validasi_ahli muncul & tidak kosong saat di-insert dari app
--  [ ] Cek draft_comments.author_id (bukan dosen_id lagi) tidak bikin RLS lama gagal
--  [ ] Set data-layer.js USE_SUPABASE aktif (sudah auto-detect di v0.9.7+, tidak perlu ubah manual)
-- ════════════════════════════════════════════
