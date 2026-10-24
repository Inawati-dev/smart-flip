-- Migration v53 (antrean #309, 24 Okt 2026): tanggal buka topik diisi sendiri.
-- Johan menjalankan berkas ini di Supabase SQL Editor.
--
--   modules.tanggal_buka : tanggal materi topik dibuka. NULL = pakai hitungan
--                          minggu (modules.minggu_mulai atau bawaan, v29).
--                          Bila diisi, tanggal ini menang; tes formatif dibuka
--                          tujuh hari sesudahnya. Kunci tetap di sisi aplikasi.
--
-- Aman dijalankan berulang.

ALTER TABLE modules ADD COLUMN IF NOT EXISTS tanggal_buka DATE;

NOTIFY pgrst, 'reload schema';
