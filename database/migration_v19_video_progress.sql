-- SMART-FLIP 5.0 — migration v19: video_progress
-- Per docs/superpowers/specs/2026-09-15-tiga-menu-asesmen-design.md §9 WP9.
-- Mencatat berapa detik tiap mahasiswa sudah menonton video tiap modul, dan
-- apakah video itu ditandai selesai. Dipakai umpan aktivitas Dashboard dosen
-- (src/lib/aktivitas.ts) dan ditulis dari pemutar di src/pages/Video.tsx.
--
-- Idempoten — aman dijalankan ulang. Gaya mengikuti migration_v11 (tabel
-- baru sederhana) dan migration_v13/v14 (RLS lewat is_dosen_of()).

CREATE TABLE IF NOT EXISTS video_progress (
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  module_id  INT  REFERENCES modules(id)  ON DELETE CASCADE,
  seconds    INT  NOT NULL DEFAULT 0,
  done       BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_id)
);

-- Postgres memeriksa GRANT tabel dulu, sebelum RLS dievaluasi — tabel baru
-- lewat SQL mentah tidak dapat grant ini otomatis (lihat komentar
-- migration_v7_kelas.sql).
GRANT SELECT, INSERT, UPDATE, DELETE ON video_progress TO authenticated;

ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

-- Mahasiswa: baca/tulis baris miliknya sendiri.
DROP POLICY IF EXISTS "mahasiswa manage own video_progress" ON video_progress;
CREATE POLICY "mahasiswa manage own video_progress" ON video_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Dosen: baca baris mahasiswa di kelas miliknya (is_dosen_of, migration_v13).
DROP POLICY IF EXISTS "dosen view own class video_progress" ON video_progress;
CREATE POLICY "dosen view own class video_progress" ON video_progress
  FOR SELECT USING (is_dosen_of(user_id));

-- ════════════════════════════════════════════
--  Verifikasi (jalankan manual di SQL Editor)
-- ════════════════════════════════════════════
-- select count(*) from video_progress;
