-- v35 (antrean #177, 10 Okt 2026): isi watermark pembaca PDF bisa dipilih dosen.
--
-- v30 hanya punya sakelar hidup/mati (courses.watermark_pdf) dengan isi tetap:
-- nama dan NIM pembaca. Tiga kolom ini menambah pilihan isi:
--   watermark_jenis  'nama' (bawaan, seperti v30) | 'teks' | 'gambar'
--   watermark_teks   teks bebas dari dosen, paling banyak 60 huruf
--   watermark_gambar gambar yang diunggah dosen, sudah dikecilkan dan
--                    ditipiskan di peramban, disimpan sebagai teks data URL PNG
-- watermark_pdf tetap menjadi sakelar hidup/mati.
-- Aman dijalankan ulang: aturan isi dipasang sebagai constraint bernama yang
-- dibuang dulu lalu dipasang lagi, jadi tidak menumpuk.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS watermark_jenis TEXT NOT NULL DEFAULT 'nama';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS watermark_teks TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS watermark_gambar TEXT;

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_watermark_jenis_sah;
ALTER TABLE courses ADD CONSTRAINT courses_watermark_jenis_sah
  CHECK (watermark_jenis IN ('nama', 'teks', 'gambar'));

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_watermark_teks_sah;
ALTER TABLE courses ADD CONSTRAINT courses_watermark_teks_sah
  CHECK (watermark_teks IS NULL OR char_length(watermark_teks) <= 60);

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_watermark_gambar_sah;
ALTER TABLE courses ADD CONSTRAINT courses_watermark_gambar_sah
  CHECK (watermark_gambar IS NULL OR (watermark_gambar LIKE 'data:image/png;base64,%' AND char_length(watermark_gambar) <= 400000));

NOTIFY pgrst, 'reload schema';
