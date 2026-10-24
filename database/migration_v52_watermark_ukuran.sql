-- v52 (antrean #308, 24 Okt 2026): ukuran dan kerapatan watermark pembaca PDF.
--
-- Johan: "berikan pengaturan untuk besar kecil dan rapat tidaknya watermark".
-- Dua kolom baru di courses, dipilih dosen di modal Watermark PDF:
--   watermark_ukuran     'kecil' | 'sedang' (bawaan, sama dengan tampilan lama) | 'besar'
--   watermark_kerapatan  'renggang' | 'sedang' (bawaan, sama dengan tampilan lama) | 'rapat'
-- Johan menjalankan berkas ini sendiri di SQL Editor Supabase. Sebelum itu
-- jalan, modal tetap menyimpan jenis/teks/gambar dan memberi pesan bahwa
-- ukuran dan kerapatan belum tersimpan.
-- Aman dijalankan ulang: constraint bernama dibuang dulu lalu dipasang lagi.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS watermark_ukuran TEXT NOT NULL DEFAULT 'sedang';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS watermark_kerapatan TEXT NOT NULL DEFAULT 'sedang';

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_watermark_ukuran_sah;
ALTER TABLE courses ADD CONSTRAINT courses_watermark_ukuran_sah
  CHECK (watermark_ukuran IN ('kecil', 'sedang', 'besar'));

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_watermark_kerapatan_sah;
ALTER TABLE courses ADD CONSTRAINT courses_watermark_kerapatan_sah
  CHECK (watermark_kerapatan IN ('renggang', 'sedang', 'rapat'));

NOTIFY pgrst, 'reload schema';
