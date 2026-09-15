-- SMART-FLIP 5.0 — migration v17: bank soal terpadu (pre/formatif/post/vark)
-- Per docs/superpowers/specs/2026-09-15-tiga-menu-asesmen-design.md §4.3,
-- §4.5, §6, §7, WP2.
--
-- Idempoten — aman dijalankan ulang. Gaya mengikuti migration_v4 dan v11.

-- ── quiz_questions: satu bank soal untuk pre-test, formatif, post-test, VARK ──
-- `kind` menandai jenis soal. module_id sudah nullable di schema.sql (tidak
-- ada NOT NULL pada kolomnya) — baris ALTER COLUMN di bawah ini pengaman
-- saja. answer_idx sebelumnya NOT NULL (schema.sql) — soal VARK tidak punya
-- kunci jawaban, jadi harus dilepas NOT NULL-nya.
ALTER TABLE quiz_questions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'formatif'
    CHECK (kind IN ('pre','formatif','post','vark')),
  ALTER COLUMN module_id DROP NOT NULL,
  ALTER COLUMN answer_idx DROP NOT NULL;

-- Soal formatif wajib menempel ke satu modul; jenis lain (pre/post/vark)
-- wajib tanpa modul. ADD CONSTRAINT tidak punya IF NOT EXISTS di Postgres,
-- jadi dibungkus DO-block yang cek pg_constraint dulu.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quiz_questions_kind_module'
  ) THEN
    ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_kind_module
      CHECK ((kind = 'formatif') = (module_id IS NOT NULL));
  END IF;
END $$;

-- Kunci jawaban wajib ada kecuali untuk VARK (VARK tidak punya jawaban benar).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quiz_questions_kind_answer'
  ) THEN
    ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_kind_answer
      CHECK ((kind = 'vark') = (answer_idx IS NULL));
  END IF;
END $$;

-- RLS quiz_questions (migration_v10_quiz_questions_rls.sql) sudah diperiksa:
-- "all read questions" (SELECT USING auth.uid() IS NOT NULL) dan
-- "quiz_questions write dosen" (FOR ALL USING/WITH CHECK role = 'dosen')
-- TIDAK menyaring berdasarkan module_id, jadi baris dengan module_id NULL
-- (pre/post/vark) sudah otomatis kebaca/ketulis oleh kedua policy itu.
-- Tidak ada perubahan RLS di migrasi ini.

-- ── quiz_attempts: jenis pengerjaan + urutan acak + sesi tes khusus ──
-- module_id sudah nullable di schema.sql; ALTER COLUMN di bawah pengaman.
ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'formatif'
    CHECK (kind IN ('pre','formatif','post')),
  ADD COLUMN IF NOT EXISTS question_order JSONB,
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ALTER COLUMN module_id DROP NOT NULL;

-- Ambang lulus naik dari 60 ke 80 (D3: berlaku juga ke data lama — keputusan
-- Johan 15 Sep 2026, aplikasi masih data uji coba). Kolom generated lama
-- (score >= 60) tidak bisa diubah rumusnya lewat ALTER, jadi drop lalu buat
-- ulang dengan formula baru.
ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS passed;
ALTER TABLE quiz_attempts ADD COLUMN passed BOOLEAN
  GENERATED ALWAYS AS (score >= 80) STORED;   -- pasangan: PASS_SCORE di src/lib/quizAttempts.ts

-- Pre-test dan post-test masing-masing cuma boleh sekali per pengguna.
CREATE UNIQUE INDEX IF NOT EXISTS quiz_attempts_one_pre_post
  ON quiz_attempts (user_id, kind) WHERE kind IN ('pre','post');

-- ── Seed 12 soal VARK (dari src/pages/Vark.tsx:14-123) ──
-- kind='vark', module_id NULL, answer_idx NULL (VARK tidak punya kunci).
-- options = urutan tetap [Visual, Auditory, Read-Write, Kinestetik] — urutan
-- inilah yang menentukan dimensi VARK tiap opsi (lihat komentar di Vark.tsx).
-- Dicek sekali di WHERE, bukan ON CONFLICT per baris (tidak ada UNIQUE
-- constraint yang pas buat itu) — kalau sudah ada satu baris kind='vark',
-- seluruh INSERT dilewati.
INSERT INTO quiz_questions (kind, module_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('vark', NULL::INT,
   'Ketika mempelajari konsep penelitian baru, saya lebih suka…',
   '["Melihat diagram, grafik, atau ilustrasi yang menjelaskan konsep tersebut","Mendengarkan penjelasan dosen atau menonton video podcast","Membaca buku teks, artikel ilmiah, atau catatan kuliah","Langsung mencoba dengan studi kasus atau eksperimen nyata"]'::JSONB,
   NULL::INT, NULL::TEXT, 1),
  ('vark', NULL::INT,
   'Saat perlu mengingat materi kuliah, cara terbaik bagi saya adalah…',
   '["Membuat mind map berwarna atau poster visual","Mendiskusikan materi dengan teman atau menjelaskannya secara lisan","Merangkum dalam catatan tertulis atau membuat daftar poin penting","Mempraktikkan langsung atau membuat simulasi dari materi tersebut"]'::JSONB,
   NULL::INT, NULL::TEXT, 2),
  ('vark', NULL::INT,
   'Ketika belajar mandiri di luar kelas, saya biasanya…',
   '["Mencari video tutorial atau infografis yang relevan dengan topik","Memutar rekaman kuliah atau berdiskusi lewat voice note dengan teman","Membaca ulang catatan dan merangkum bab per bab secara tertulis","Mengerjakan latihan soal atau membuat proyek kecil terkait materi"]'::JSONB,
   NULL::INT, NULL::TEXT, 3),
  ('vark', NULL::INT,
   'Saat mengerjakan tugas kuliah, langkah pertama yang saya lakukan adalah…',
   '["Membuat kerangka visual atau sketsa alur pengerjaan tugas","Mendiskusikan tugas dengan teman untuk mendapat gambaran awal","Membaca instruksi tugas dengan teliti dan mencatat poin-poin utama","Langsung mulai mengerjakan dan belajar dari hasil yang sudah dibuat"]'::JSONB,
   NULL::INT, NULL::TEXT, 4),
  ('vark', NULL::INT,
   'Ketika memahami instruksi dari dosen, saya merasa paling jelas jika…',
   '["Instruksi disertai diagram alur, tabel, atau contoh visual","Dosen menjelaskan secara lisan dan saya dapat bertanya langsung","Instruksi diberikan secara tertulis, rinci, dan terstruktur","Ada demonstrasi langkah demi langkah yang bisa saya ikuti"]'::JSONB,
   NULL::INT, NULL::TEXT, 5),
  ('vark', NULL::INT,
   'Ketika memilih media belajar untuk mempersiapkan ujian, saya lebih memilih…',
   '["Slide presentasi dengan banyak gambar, bagan, dan warna","Rekaman audio penjelasan materi atau podcast akademik","Buku teks, modul PDF, atau ringkasan teks yang detail","Kuis latihan interaktif atau flashcard yang bisa langsung dicoba"]'::JSONB,
   NULL::INT, NULL::TEXT, 6),
  ('vark', NULL::INT,
   'Saat harus mempresentasikan hasil penelitian, cara saya yang paling nyaman adalah…',
   '["Membuat slide visual menarik dengan grafik dan ilustrasi","Berbicara langsung kepada audiens dengan gaya natural dan interaktif","Menyiapkan naskah atau poin presentasi yang tertulis lengkap","Menampilkan demo produk atau simulasi langsung kepada audiens"]'::JSONB,
   NULL::INT, NULL::TEXT, 7),
  ('vark', NULL::INT,
   'Ketika menghadapi kuis atau tes, saya biasanya…',
   '["Mengingat kembali diagram, tabel, atau gambar yang pernah saya lihat","Mendengar kembali penjelasan dosen di kepala saya saat menjawab","Membayangkan catatan atau teks yang pernah saya tulis","Mempraktikkan cara penyelesaian masalah seperti yang pernah saya coba"]'::JSONB,
   NULL::INT, NULL::TEXT, 8),
  ('vark', NULL::INT,
   'Ketika mencari sumber referensi untuk penelitian, saya lebih suka…',
   '["Mencari jurnal atau artikel yang memiliki banyak gambar, grafik, dan visualisasi data","Mencari rekaman seminar, podcast akademik, atau diskusi panel","Membaca artikel jurnal lengkap dengan teks yang komprehensif","Mencari laporan studi kasus atau hasil penelitian terapan"]'::JSONB,
   NULL::INT, NULL::TEXT, 9),
  ('vark', NULL::INT,
   'Ketika membuat laporan penelitian, bagian yang paling mudah bagi saya adalah…',
   '["Membuat visualisasi data seperti grafik, diagram, dan infografis","Menyusun bagian diskusi yang berisi narasi dan argumen lisan","Menulis deskripsi metodologi dan kajian pustaka secara rinci","Mendeskripsikan prosedur praktik dan hasil uji coba lapangan"]'::JSONB,
   NULL::INT, NULL::TEXT, 10),
  ('vark', NULL::INT,
   'Ketika belajar dari kesalahan dalam tugas atau kuis, saya lebih mudah berkembang jika…',
   '["Melihat perbandingan jawaban saya vs. jawaban benar dalam format visual","Mendapat penjelasan lisan langsung dari dosen atau teman","Membaca umpan balik tertulis yang menjelaskan letak kesalahan secara rinci","Mencoba mengerjakan ulang soal yang sama atau soal serupa secara langsung"]'::JSONB,
   NULL::INT, NULL::TEXT, 11),
  ('vark', NULL::INT,
   'Dalam mempersiapkan ujian akhir, strategi belajar yang paling efektif bagi saya adalah…',
   '["Membuat poster ringkasan, mind map berwarna, atau diagram konsep","Berdiskusi intensif bersama kelompok belajar atau mendengarkan rekaman kuliah","Membaca ulang semua catatan dan modul serta merangkumnya kembali","Mengerjakan sebanyak mungkin soal latihan dan simulasi ujian"]'::JSONB,
   NULL::INT, NULL::TEXT, 12)
) AS v(kind, module_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'vark');

-- ════════════════════════════════════════════
--  Verifikasi (jalankan manual di SQL Editor)
-- ════════════════════════════════════════════
-- select kind, count(*) from quiz_questions group by kind;
--   -> vark harus 12
--
-- select score, passed from quiz_attempts order by attempted_at desc limit 5;
--   -> passed harus cocok dengan score >= 80
--
-- select 79 >= 80 as skor_79_passed, 80 >= 80 as skor_80_passed;
--   -> f (false), t (true)
