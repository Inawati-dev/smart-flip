-- SMART-FLIP 5.0 - migration v23: Mata kuliah sebagai induk topik
-- (antrean #68, Johan 16 Sep 2026: "bukan Modul tapi Matakuliah sehingga di
-- dalam matakuliah tersebut ada topik-topik ... setiap dosen mengampu
-- beberapa matakuliah ... termasuk Video juga ... di asesmen juga sama").
--
-- Idempoten, aman dijalankan ulang.
-- Isi:
--   1. Tabel courses (mata kuliah), seed 2 mata kuliah
--   2. modules.course_id (topik milik satu mata kuliah), UNIQUE (course_id, order_num)
--   3. course_id di quiz_questions (pre/post/kelompok), quiz_attempts,
--      test_sessions, group_sessions, tugas_akhir_briefs; data lama -> mata kuliah 1
--   4. Indeks unik pre/post per mata kuliah
--   5. Seed 9 topik mata kuliah "Perpustakaan Digital"
--   6. (OPSIONAL, dikomentari) hapus pengerjaan akun dummy

-- ════════════════════════════════════════════
--  1. courses
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS courses (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  dosen_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  order_num   INT NOT NULL DEFAULT 1,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON courses TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE courses_id_seq TO authenticated;

-- Semua pengguna masuk boleh membaca daftar mata kuliah (mahasiswa memilih
-- mata kuliah di pemilih). Dosen mana pun boleh menambah/mengubah (satu
-- program studi, dosen = admin; sama seperti policy modules di schema.sql).
DROP POLICY IF EXISTS "all read courses" ON courses;
CREATE POLICY "all read courses" ON courses FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "dosen manage courses" ON courses;
CREATE POLICY "dosen manage courses" ON courses FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'));

INSERT INTO courses (id, code, name, description, order_num) VALUES
  (1, 'MPP', 'Metode Penelitian dan Pengembangan',
   'Penelitian dan pengembangan (R&D) untuk pendidikan vokasi: model ADDIE, 4D, Borg dan Gall, validasi produk, uji coba, dan pelaporan.', 1),
  (2, 'PD', 'Perpustakaan Digital',
   'Konsep, koleksi, metadata, perangkat lunak, temu kembali, preservasi, dan layanan perpustakaan digital.', 2)
ON CONFLICT (id) DO NOTHING;
SELECT setval('courses_id_seq', GREATEST((SELECT max(id) FROM courses), 2));

-- ════════════════════════════════════════════
--  2. modules.course_id
-- ════════════════════════════════════════════
ALTER TABLE modules ADD COLUMN IF NOT EXISTS course_id INT REFERENCES courses(id) ON DELETE CASCADE;
UPDATE modules SET course_id = 1 WHERE course_id IS NULL;
ALTER TABLE modules ALTER COLUMN course_id SET DEFAULT 1;
ALTER TABLE modules ALTER COLUMN course_id SET NOT NULL;
-- order_num tadinya UNIQUE global; sekarang unik per mata kuliah supaya
-- tiap mata kuliah punya topik 1..n sendiri.
ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_order_num_key;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'modules_course_order_key') THEN
    ALTER TABLE modules ADD CONSTRAINT modules_course_order_key UNIQUE (course_id, order_num);
  END IF;
END $$;

-- ════════════════════════════════════════════
--  3. course_id di tabel asesmen
-- ════════════════════════════════════════════
-- quiz_questions: pre/post/kelompok/vark milik mata kuliah; formatif ikut
-- topiknya (module_id), course_id boleh NULL.
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS course_id INT REFERENCES courses(id) ON DELETE CASCADE;
UPDATE quiz_questions SET course_id = 1 WHERE course_id IS NULL AND kind IN ('pre','post','kelompok','vark');
UPDATE quiz_questions q SET course_id = m.course_id
  FROM modules m WHERE q.module_id = m.id AND q.course_id IS NULL;

-- quiz_attempts: pre/post per mata kuliah; formatif ikut topiknya.
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS course_id INT REFERENCES courses(id) ON DELETE CASCADE;
UPDATE quiz_attempts qa SET course_id = m.course_id
  FROM modules m WHERE qa.module_id = m.id AND qa.course_id IS NULL;
UPDATE quiz_attempts SET course_id = 1 WHERE course_id IS NULL;
ALTER TABLE quiz_attempts ALTER COLUMN course_id SET DEFAULT 1;

ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS course_id INT NOT NULL DEFAULT 1 REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE group_sessions ADD COLUMN IF NOT EXISTS course_id INT NOT NULL DEFAULT 1 REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE tugas_akhir_briefs ADD COLUMN IF NOT EXISTS course_id INT NOT NULL DEFAULT 1 REFERENCES courses(id) ON DELETE CASCADE;

-- ════════════════════════════════════════════
--  4. Pre-test dan post-test sekali per mata kuliah (bukan sekali seumur akun)
-- ════════════════════════════════════════════
DROP INDEX IF EXISTS quiz_attempts_one_pre_post;
CREATE UNIQUE INDEX IF NOT EXISTS quiz_attempts_one_pre_post_course
  ON quiz_attempts (user_id, kind, course_id) WHERE kind IN ('pre','post');

-- ════════════════════════════════════════════
--  5. Seed 9 topik Perpustakaan Digital (DRAF, judul dan deskripsi saja)
-- ════════════════════════════════════════════
-- Sumber susunan: PUST4317 Pengembangan Perpustakaan Digital (Universitas
-- Terbuka) dan silabus Perpustakaan Digital UIN Sumatera Utara (dicari 16 Sep
-- 2026). PDF dan video diunggah dosen lewat menu Modul dan Video.
INSERT INTO modules (course_id, order_num, title, description, is_active)
SELECT 2, v.order_num, v.title, v.description, true FROM (VALUES
  (1, 'Konsep Dasar Perpustakaan Digital', 'Definisi dari berbagai sudut pandang, perbedaan dengan perpustakaan konvensional, komponen dan arsitektur perpustakaan digital.'),
  (2, 'Internet dan Alasan Digitalisasi', 'Sejarah singkat internet, akses informasi terbuka, alasan dan manfaat digitalisasi koleksi bagi pemustaka dan lembaga.'),
  (3, 'Pengembangan Koleksi Digital', 'Kebijakan seleksi, format dokumen (PDF, EPUB, gambar, audio, video), lisensi, anggaran, dan distribusi koleksi.'),
  (4, 'Metadata dan Dublin Core', 'Fungsi metadata, 15 elemen Dublin Core, perbandingan dengan MARC, praktik mengisi metadata satu dokumen.'),
  (5, 'Alih Media dan Digitalisasi Bahan Pustaka', 'Pemindaian, OCR, standar kualitas berkas, penamaan berkas, dan alur kerja digitalisasi.'),
  (6, 'Perangkat Lunak Perpustakaan Digital', 'Perbandingan DSpace, Greenstone, SLiMS, dan Eprints; pemasangan dasar dan struktur repositori institusi.'),
  (7, 'Temu Kembali Informasi dan Portal Web', 'Pengindeksan, pencarian, penjelajahan, portal web, dan personalisasi layanan.'),
  (8, 'Preservasi Digital dan Hak Cipta', 'Strategi preservasi jangka panjang, migrasi format, cadangan, hak cipta dan akses terbuka.'),
  (9, 'Peran Pustakawan Digital dan Evaluasi Layanan', 'Kompetensi pustakawan di era digital, literasi informasi, dan evaluasi layanan perpustakaan digital.')
) AS v(order_num, title, description)
WHERE NOT EXISTS (SELECT 1 FROM modules WHERE course_id = 2);

-- ════════════════════════════════════════════
--  6. OPSIONAL: hapus pengerjaan akun dummy (Mahasiswa Dummy 01 dst, 24 Jul 2026)
-- ════════════════════════════════════════════
-- Tabel "Tes formatif per topik" di Asesmen membaca quiz_attempts sungguhan;
-- angka yang tampil (17 pengerjaan topik 1, dst) berasal dari 20 akun dummy
-- kelas A sampai D. Kalau ingin tabel mulai dari nol sampai mahasiswa asli
-- mengerjakan, buka komentar dua baris di bawah lalu jalankan. Akunnya tetap
-- ada, hanya riwayat pengerjaannya yang dihapus. TIDAK bisa dibatalkan.
-- DELETE FROM quiz_attempts WHERE user_id IN (SELECT id FROM profiles WHERE full_name ILIKE 'Mahasiswa Dummy%');
-- DELETE FROM user_progress WHERE user_id IN (SELECT id FROM profiles WHERE full_name ILIKE 'Mahasiswa Dummy%');

-- ════════════════════════════════════════════
--  Verifikasi (jalankan manual di SQL Editor)
-- ════════════════════════════════════════════
-- select id, code, name from courses order by id;                       -> 2 baris
-- select course_id, count(*) from modules group by course_id;            -> 1: 9, 2: 9
-- select kind, course_id, count(*) from quiz_questions group by 1,2;     -> pre/post/kelompok/vark course 1, formatif ikut topik
-- select indexname from pg_indexes where tablename = 'quiz_attempts';    -> ada quiz_attempts_one_pre_post_course
