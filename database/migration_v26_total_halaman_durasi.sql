-- SMART-FLIP 5.0 - migration v26: total halaman PDF dan durasi video
-- (antrean #86 dan #87, keputusan Johan 16 Sep 2026).
--
-- Idempoten, aman dijalankan ulang.
--   1. user_progress.total_pages: jumlah halaman PDF yang dibaca pembaca
--      (diisi otomatis saat PDF dimuat), supaya sampul buku di rak bisa
--      menampilkan "40 hal" dan kaki kartu "12/40 hal".
--   2. modules.duration_sec: durasi video dalam detik. Untuk tautan YouTube
--      dosen mengisi menit secara manual di modal video; untuk berkas
--      unggahan diisi otomatis dari metadata video.

ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS total_pages INT;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS duration_sec INT;

-- ════════════════════════════════════════════
--  Verifikasi (jalankan manual di SQL Editor)
-- ════════════════════════════════════════════
-- select column_name from information_schema.columns where table_name = 'user_progress' and column_name = 'total_pages';
-- select column_name from information_schema.columns where table_name = 'modules' and column_name = 'duration_sec';
--   -> masing-masing 1 baris
