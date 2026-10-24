-- Migration v54 (antrean #321, 24 Okt 2026): jenis topik Bab atau Bagian.
-- Johan menjalankan berkas ini di Supabase SQL Editor.
--
--   modules.jenis : 'bab' (bawaan, topik biasa: PDF, video, tes formatif) atau
--                   'bagian' (Pendahuluan, Penutup: hanya PDF; tanpa video dan
--                   tes formatif, tidak mengunci topik sesudahnya, tidak memakai
--                   nomor Bab di Mini Projek dan Aktivitas Mandiri, dan dibuka
--                   bersama bab di sebelahnya pada jadwal bawaan).
-- Sebelum berkas ini dijalankan, aplikasi menganggap semua topik 'bab'.
--
-- Aman dijalankan berulang: constraint bernama dibuang dulu lalu dipasang lagi.

ALTER TABLE modules ADD COLUMN IF NOT EXISTS jenis TEXT NOT NULL DEFAULT 'bab';

ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_jenis_sah;
ALTER TABLE modules ADD CONSTRAINT modules_jenis_sah CHECK (jenis IN ('bab', 'bagian'));

NOTIFY pgrst, 'reload schema';
