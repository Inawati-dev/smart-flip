-- migration_v29_jadwal_kuliah.sql (antrean #153, 10 Okt 2026)
-- Jadwal mata kuliah: tanggal pertemuan pertama, dan minggu ke berapa tiap
-- topik dibuka. Hanya MENAMBAH dua kolom; tidak ada data yang diubah.
--   courses.mulai_kuliah : tanggal pertemuan pertama. Kosong = tanpa jadwal,
--                          topik dan tes formatif tidak dikunci tanggal.
--   modules.minggu_mulai : minggu ke berapa materi topik itu dibuka; tes
--                          formatifnya dibuka satu minggu sesudahnya. Kosong =
--                          bawaan aplikasi (src/lib/jadwal.ts: dua minggu per
--                          topik, minggu 7 dan 8 dilewati untuk cadangan dan UTS).
-- Hak ubah sudah ada: policy dosen di courses (v23) dan modules (schema.sql).

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS mulai_kuliah DATE;

ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS minggu_mulai INT
    CHECK (minggu_mulai BETWEEN 1 AND 52);

NOTIFY pgrst, 'reload schema';

-- Cek sesudah dijalankan:
-- SELECT id, code, mulai_kuliah FROM courses ORDER BY order_num;
-- SELECT id, course_id, order_num, minggu_mulai FROM modules ORDER BY course_id, order_num;
