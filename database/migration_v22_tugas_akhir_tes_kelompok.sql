-- SMART-FLIP 5.0 - migration v22: Tugas akhir (antrean #57 opsi A) dan
-- Tes kelompok (antrean #65 opsi A). Keputusan Johan 16 Sep 2026.
--
-- Idempoten, aman dijalankan ulang. Gaya mengikuti v18 (RPC SECURITY DEFINER
-- sebagai satu-satunya pintu mahasiswa ke tabel yang tidak boleh mereka baca
-- langsung) dan v21 (bucket Storage dengan policy per peran).
--
-- Isi:
--   1. quiz_questions.kind menerima 'kelompok' (soal tes kelompok di bank soal)
--   2. Tugas akhir: tugas_akhir_briefs, tugas_akhir_submissions (nama dipilih supaya
--      tidak bertabrakan dengan final_projects milik Projek Akhir lama, v15), bucket privat tugas-akhir,
--      RPC grade_submission (dosen menilai)
--   3. Tes kelompok: group_sessions, group_teams, group_members, group_attempts,
--      RPC verify_group_code, join_group, group_team_view, submit_group_attempt,
--      group_session_results

-- ════════════════════════════════════════════
--  1. quiz_questions.kind += 'kelompok'
-- ════════════════════════════════════════════
-- Constraint dari v17 dibuat inline (nama bawaan quiz_questions_kind_check).
-- Dibuang lewat loop supaya nama apa pun yang dipakai Postgres tetap kena,
-- lalu dipasang ulang dengan daftar baru. Dua constraint lain dari v17
-- (kind_module, kind_answer) sudah cocok untuk 'kelompok': module_id NULL,
-- answer_idx wajib.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'quiz_questions'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%kind%'
      AND pg_get_constraintdef(oid) LIKE '%''pre''%'
      AND pg_get_constraintdef(oid) LIKE '%ARRAY%'
  LOOP
    EXECUTE format('ALTER TABLE quiz_questions DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_kind_check
  CHECK (kind IN ('pre','formatif','post','vark','kelompok'));

-- ════════════════════════════════════════════
--  2. Tugas akhir
-- ════════════════════════════════════════════
-- Satu "brief" proyek per dosen (boleh lebih dari satu; mahasiswa melihat
-- yang is_open dan cocok kelasnya). rubric = JSON array
-- [{"nama":"Kelengkapan laporan","bobot":40}, ...]; nilai per kriteria
-- 0..100, total = rata-rata berbobot (dihitung di klien, disimpan di
-- tugas_akhir_submissions.total oleh RPC grade_submission).
CREATE TABLE IF NOT EXISTS tugas_akhir_briefs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dosen_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  deadline    TIMESTAMPTZ,
  rubric      JSONB NOT NULL DEFAULT '[]'::jsonb,
  class_ids   UUID[] NOT NULL DEFAULT '{}',
  is_open     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE tugas_akhir_briefs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON tugas_akhir_briefs TO authenticated;

DROP POLICY IF EXISTS "dosen manage own projects" ON tugas_akhir_briefs;
CREATE POLICY "dosen manage own projects" ON tugas_akhir_briefs
  FOR ALL USING (dosen_id = auth.uid()) WITH CHECK (dosen_id = auth.uid());

-- Mahasiswa hanya membaca brief yang terbuka dan (kalau dibatasi kelas)
-- kelasnya termasuk. class_ids '{}' = semua kelas (pola v18).
DROP POLICY IF EXISTS "mahasiswa read open projects" ON tugas_akhir_briefs;
CREATE POLICY "mahasiswa read open projects" ON tugas_akhir_briefs
  FOR SELECT USING (
    is_open AND (
      class_ids = '{}'
      OR (SELECT class_id FROM profiles WHERE id = auth.uid()) = ANY (class_ids)
    )
  );

CREATE TABLE IF NOT EXISTS tugas_akhir_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES tugas_akhir_briefs(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_path    TEXT,
  file_name    TEXT,
  link         TEXT,
  note         TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scores       JSONB,
  total        INT CHECK (total IS NULL OR (total BETWEEN 0 AND 100)),
  feedback     TEXT,
  graded_at    TIMESTAMPTZ,
  UNIQUE (project_id, user_id)
);
ALTER TABLE tugas_akhir_submissions ENABLE ROW LEVEL SECURITY;
-- Kolom nilai (scores, total, feedback, graded_at) TIDAK diberikan ke
-- authenticated untuk UPDATE: satu-satunya jalan mengisinya adalah RPC
-- grade_submission di bawah (SECURITY DEFINER, cek dosen pemilik brief).
GRANT SELECT, INSERT, DELETE ON tugas_akhir_submissions TO authenticated;
-- project_id dan user_id ikut di daftar UPDATE karena upsert klien
-- (INSERT ... ON CONFLICT DO UPDATE) menyetel semua kolom yang dikirim;
-- RLS WITH CHECK di bawah tetap mengunci user_id = auth.uid().
GRANT UPDATE (project_id, user_id, file_path, file_name, link, note, submitted_at) ON tugas_akhir_submissions TO authenticated;

DROP POLICY IF EXISTS "mahasiswa own submissions" ON tugas_akhir_submissions;
CREATE POLICY "mahasiswa own submissions" ON tugas_akhir_submissions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND scores IS NULL AND total IS NULL AND graded_at IS NULL);

DROP POLICY IF EXISTS "dosen read submissions of own projects" ON tugas_akhir_submissions;
CREATE POLICY "dosen read submissions of own projects" ON tugas_akhir_submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tugas_akhir_briefs fp WHERE fp.id = project_id AND fp.dosen_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION grade_submission(
  p_submission UUID, p_scores JSONB, p_total INT, p_feedback TEXT
) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tugas_akhir_submissions fs
    JOIN tugas_akhir_briefs fp ON fp.id = fs.project_id
    WHERE fs.id = p_submission AND fp.dosen_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Bukan pemilik brief tugas akhir ini';
  END IF;
  UPDATE tugas_akhir_submissions
  SET scores = p_scores, total = p_total, feedback = p_feedback, graded_at = now()
  WHERE id = p_submission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION grade_submission(UUID, JSONB, INT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION grade_submission(UUID, JSONB, INT, TEXT) FROM PUBLIC;

-- Bucket PRIVAT (berkas laporan mahasiswa tidak boleh terbuka lewat URL
-- publik). Klien membaca lewat createSignedUrl. Path wajib diawali
-- <user_id>/ supaya policy per pemilik bisa dicek dari nama objek.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tugas-akhir', 'tugas-akhir', false, 20971520,
  ARRAY['application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'])
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "tugas-akhir read own or dosen" ON storage.objects;
CREATE POLICY "tugas-akhir read own or dosen" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'tugas-akhir' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dosen')
    )
  );
DROP POLICY IF EXISTS "tugas-akhir insert own" ON storage.objects;
CREATE POLICY "tugas-akhir insert own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tugas-akhir' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "tugas-akhir update own" ON storage.objects;
CREATE POLICY "tugas-akhir update own" ON storage.objects FOR UPDATE
  USING (bucket_id = 'tugas-akhir' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "tugas-akhir delete own" ON storage.objects;
CREATE POLICY "tugas-akhir delete own" ON storage.objects FOR DELETE
  USING (bucket_id = 'tugas-akhir' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ════════════════════════════════════════════
--  3. Tes kelompok
-- ════════════════════════════════════════════
-- Dosen membuat sesi -> N kelompok, tiap kelompok punya kode 6 huruf
-- (dibuat di klien, generateCode() yang sama dengan tes khusus). Mahasiswa
-- memasukkan kode -> masuk kelompok (maksimal group_size orang) -> tiap
-- anggota mengerjakan soal kind='kelompok' sendiri; skor per orang dan
-- rata-rata kelompok dihitung dari group_attempts.
CREATE TABLE IF NOT EXISTS group_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  dosen_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_size INT NOT NULL DEFAULT 5 CHECK (group_size BETWEEN 2 AND 20),
  shuffle    BOOLEAN NOT NULL DEFAULT true,
  is_open    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS group_teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  number     INT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, number)
);
CREATE TABLE IF NOT EXISTS group_members (
  team_id   UUID NOT NULL REFERENCES group_teams(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
CREATE TABLE IF NOT EXISTS group_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID NOT NULL REFERENCES group_teams(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score        INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  answers      JSONB,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
ALTER TABLE group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_teams    ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_attempts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_sessions, group_teams TO authenticated;
GRANT SELECT ON group_members, group_attempts TO authenticated;

-- Dosen: kelola sesi dan kelompok miliknya; baca anggota dan pengerjaan.
-- Mahasiswa: TIDAK ada policy langsung; semua lewat RPC di bawah.
DROP POLICY IF EXISTS "dosen manage own group sessions" ON group_sessions;
CREATE POLICY "dosen manage own group sessions" ON group_sessions
  FOR ALL USING (dosen_id = auth.uid()) WITH CHECK (dosen_id = auth.uid());
DROP POLICY IF EXISTS "dosen manage own teams" ON group_teams;
CREATE POLICY "dosen manage own teams" ON group_teams
  FOR ALL
  USING (EXISTS (SELECT 1 FROM group_sessions gs WHERE gs.id = session_id AND gs.dosen_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM group_sessions gs WHERE gs.id = session_id AND gs.dosen_id = auth.uid()));
DROP POLICY IF EXISTS "dosen read own members" ON group_members;
CREATE POLICY "dosen read own members" ON group_members
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM group_teams gt JOIN group_sessions gs ON gs.id = gt.session_id
    WHERE gt.id = team_id AND gs.dosen_id = auth.uid()));
DROP POLICY IF EXISTS "dosen read own attempts" ON group_attempts;
CREATE POLICY "dosen read own attempts" ON group_attempts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM group_teams gt JOIN group_sessions gs ON gs.id = gt.session_id
    WHERE gt.id = team_id AND gs.dosen_id = auth.uid()));

-- RPC verify_group_code: 0 baris untuk kode salah / sesi ditutup.
CREATE OR REPLACE FUNCTION verify_group_code(p_code TEXT)
RETURNS TABLE (
  session_id UUID, name TEXT, shuffle BOOLEAN,
  team_id UUID, team_number INT, member_count INT, group_size INT,
  already_member BOOLEAN, already_done BOOLEAN
) AS $$
  SELECT gs.id, gs.name, gs.shuffle,
         gt.id, gt.number,
         (SELECT count(*)::int FROM group_members gm WHERE gm.team_id = gt.id),
         gs.group_size,
         EXISTS (SELECT 1 FROM group_members gm WHERE gm.team_id = gt.id AND gm.user_id = auth.uid()),
         EXISTS (SELECT 1 FROM group_attempts ga WHERE ga.team_id = gt.id AND ga.user_id = auth.uid())
  FROM group_teams gt
  JOIN group_sessions gs ON gs.id = gt.session_id
  WHERE gt.code = upper(trim(p_code)) AND gs.is_open;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- RPC join_group: masukkan auth.uid() ke kelompok berkode. Menolak bila
-- kelompok penuh atau mahasiswa sudah ada di kelompok lain sesi yang sama.
CREATE OR REPLACE FUNCTION join_group(p_code TEXT) RETURNS UUID AS $$
DECLARE
  v_team group_teams%ROWTYPE;
  v_size INT;
  v_count INT;
BEGIN
  SELECT gt.* INTO v_team FROM group_teams gt
  JOIN group_sessions gs ON gs.id = gt.session_id
  WHERE gt.code = upper(trim(p_code)) AND gs.is_open;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kode tidak dikenal atau sesi sudah ditutup'; END IF;
  IF EXISTS (SELECT 1 FROM group_members WHERE team_id = v_team.id AND user_id = auth.uid()) THEN
    RETURN v_team.id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM group_members gm JOIN group_teams gt ON gt.id = gm.team_id
    WHERE gt.session_id = v_team.session_id AND gm.user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Kamu sudah tergabung di kelompok lain pada sesi ini'; END IF;
  SELECT group_size INTO v_size FROM group_sessions WHERE id = v_team.session_id;
  SELECT count(*) INTO v_count FROM group_members WHERE team_id = v_team.id;
  IF v_count >= v_size THEN RAISE EXCEPTION 'Kelompok sudah penuh'; END IF;
  INSERT INTO group_members (team_id, user_id) VALUES (v_team.id, auth.uid());
  RETURN v_team.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC group_team_view: anggota kelompok dan skornya. Untuk anggota kelompok
-- itu sendiri atau dosen pemilik sesi.
CREATE OR REPLACE FUNCTION group_team_view(p_team UUID)
RETURNS TABLE (user_id UUID, full_name TEXT, score INT, attempted_at TIMESTAMPTZ) AS $$
  SELECT gm.user_id, p.full_name, ga.score, ga.attempted_at
  FROM group_members gm
  JOIN profiles p ON p.id = gm.user_id
  LEFT JOIN group_attempts ga ON ga.team_id = gm.team_id AND ga.user_id = gm.user_id
  WHERE gm.team_id = p_team
    AND (
      EXISTS (SELECT 1 FROM group_members x WHERE x.team_id = p_team AND x.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM group_teams gt JOIN group_sessions gs ON gs.id = gt.session_id
                 WHERE gt.id = p_team AND gs.dosen_id = auth.uid())
    )
  ORDER BY gm.joined_at;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- RPC submit_group_attempt: satu pengerjaan per anggota (upsert).
CREATE OR REPLACE FUNCTION submit_group_attempt(p_team UUID, p_score INT, p_answers JSONB)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM group_members WHERE team_id = p_team AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Bukan anggota kelompok ini';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM group_teams gt JOIN group_sessions gs ON gs.id = gt.session_id
                 WHERE gt.id = p_team AND gs.is_open) THEN
    RAISE EXCEPTION 'Sesi sudah ditutup';
  END IF;
  INSERT INTO group_attempts (team_id, user_id, score, answers)
  VALUES (p_team, auth.uid(), p_score, p_answers)
  ON CONFLICT (team_id, user_id) DO UPDATE
    SET score = excluded.score, answers = excluded.answers, attempted_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC group_session_results: semua kelompok satu sesi, untuk dosen pemilik.
CREATE OR REPLACE FUNCTION group_session_results(p_session UUID)
RETURNS TABLE (team_number INT, code TEXT, user_id UUID, full_name TEXT, score INT, attempted_at TIMESTAMPTZ) AS $$
  SELECT gt.number, gt.code, gm.user_id, p.full_name, ga.score, ga.attempted_at
  FROM group_teams gt
  LEFT JOIN group_members gm ON gm.team_id = gt.id
  LEFT JOIN profiles p ON p.id = gm.user_id
  LEFT JOIN group_attempts ga ON ga.team_id = gt.id AND ga.user_id = gm.user_id
  WHERE gt.session_id = p_session
    AND EXISTS (SELECT 1 FROM group_sessions gs WHERE gs.id = p_session AND gs.dosen_id = auth.uid())
  ORDER BY gt.number, gm.joined_at;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

GRANT EXECUTE ON FUNCTION verify_group_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION join_group(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION group_team_view(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_group_attempt(UUID, INT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION group_session_results(UUID) TO authenticated;
REVOKE ALL ON FUNCTION verify_group_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION join_group(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION group_team_view(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION submit_group_attempt(UUID, INT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION group_session_results(UUID) FROM PUBLIC;

-- ════════════════════════════════════════════
--  4. Seed 10 soal tes kelompok (DRAF untuk direview dosen di Bank soal)
-- ════════════════════════════════════════════
-- Soal berbentuk kasus singkat yang cocok dibahas berkelompok, tetap pilihan
-- ganda 4 opsi supaya bisa dinilai otomatis. Dilewati bila sudah ada soal
-- kind='kelompok' (soal hasil suntingan dosen tidak tertimpa).
INSERT INTO quiz_questions (kind, module_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('kelompok', NULL::INT, 'Sebuah tim ingin mengembangkan e-modul praktikum karena mahasiswa sering salah prosedur. Langkah pertama menurut ADDIE adalah…', '["Membuat storyboard modul", "Menganalisis kebutuhan dan karakteristik mahasiswa", "Mengujicobakan modul ke satu kelas", "Menyusun angket validasi ahli"]'::JSONB, 1, 'Analysis mendahului Design: kebutuhan dan karakteristik pengguna dipetakan dulu.', 1),
  ('kelompok', NULL::INT, 'Tim menemukan bahwa 70% mahasiswa gagal pada langkah kalibrasi alat. Rumusan masalah R&D yang paling tepat adalah…', '["Apakah kalibrasi alat sulit?", "Bagaimana kelayakan dan keefektifan e-modul kalibrasi alat yang dikembangkan?", "Berapa rata-rata nilai praktikum?", "Apakah dosen sudah mengajar kalibrasi?"]'::JSONB, 1, 'Rumusan masalah R&D bertanya soal proses pengembangan, kelayakan, dan keefektifan produk.', 2),
  ('kelompok', NULL::INT, 'Untuk produk yang harus siap dalam satu semester dengan tim kecil, model yang paling ringkas tahapannya adalah…', '["Borg & Gall 10 langkah penuh", "4D Thiagarajan", "Dick & Carey lengkap", "Model spiral tanpa batas iterasi"]'::JSONB, 1, '4D (Define, Design, Develop, Disseminate) lebih ringkas daripada Borg & Gall 10 langkah.', 3),
  ('kelompok', NULL::INT, 'Tim membagi tugas: siapa yang paling tepat menilai kebenaran isi materi e-modul?', '["Ahli media", "Ahli materi", "Mahasiswa pengguna", "Teman satu tim"]'::JSONB, 1, 'Ahli materi menilai kebenaran dan kedalaman isi; ahli media menilai tampilan dan kemudahan pakai.', 4),
  ('kelompok', NULL::INT, 'Hasil validasi: ahli media 92%, ahli materi 78%. Keputusan tim yang tepat adalah…', '["Langsung uji lapangan luas", "Revisi bagian materi sesuai catatan ahli materi, lalu uji coba kelompok kecil", "Mengganti seluruh media", "Menghapus bagian yang dinilai rendah tanpa revisi"]'::JSONB, 1, 'Skor materi lebih rendah, jadi revisi materi dulu; uji kelompok kecil mendahului uji luas.', 5),
  ('kelompok', NULL::INT, 'Uji coba kelompok kecil sebaiknya melibatkan…', '["1 mahasiswa terbaik", "6 sampai 12 mahasiswa dengan kemampuan beragam", "Seluruh angkatan", "Hanya dosen pengampu"]'::JSONB, 1, 'Kelompok kecil berisi beberapa pengguna dengan kemampuan beragam untuk menangkap kekurangan awal.', 6),
  ('kelompok', NULL::INT, 'Saat uji lapangan, tim hanya bisa memakai satu kelas tanpa kelas pembanding. Desain yang tepat adalah…', '["Posttest only control group", "One group pretest posttest", "Solomon four group", "Time series dua kelompok"]'::JSONB, 1, 'Satu kelompok diukur sebelum dan sesudah perlakuan: one group pretest posttest.', 7),
  ('kelompok', NULL::INT, 'Rata-rata pre-test 45 dan post-test 78, skor maksimal 100. Peningkatan skor kelas dan kategorinya adalah…', '["0,33 rendah", "0,60 sedang", "0,73 tinggi", "0,78 tinggi"]'::JSONB, 1, '(78 − 45) ÷ (100 − 45) = 33 ÷ 55 = 0,60, kategori sedang (0,3 sampai 0,7).', 8),
  ('kelompok', NULL::INT, 'Dua anggota tim berbeda pendapat: satu ingin menambah animasi, satu ingin menambah latihan soal. Data yang paling tepat dipakai untuk memutuskan adalah…', '["Selera ketua tim", "Catatan validator dan hasil angket uji coba kelompok kecil", "Jumlah halaman modul", "Biaya produksi"]'::JSONB, 1, 'Revisi produk mengikuti masukan validator dan temuan uji coba, bukan selera.', 9),
  ('kelompok', NULL::INT, 'Bagian laporan yang memuat cara e-modul disebarkan ke pengguna lain setelah terbukti efektif adalah…', '["Analisis kebutuhan", "Diseminasi", "Storyboard", "Validasi ahli"]'::JSONB, 1, 'Diseminasi (Disseminate pada 4D) adalah penyebarluasan produk akhir.', 10)
) AS v(kind, module_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'kelompok');

-- ════════════════════════════════════════════
--  Verifikasi (jalankan manual di SQL Editor)
-- ════════════════════════════════════════════
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'quiz_questions_kind_check';
--   -> CHECK (kind = ANY (ARRAY['pre','formatif','post','vark','kelompok']))
-- select count(*) as proyek from tugas_akhir_briefs;
-- select count(*) as sesi_kelompok from group_sessions;
-- select kind, count(*) from quiz_questions group by kind;
--   -> ada baris kelompok 10
-- select id, public, file_size_limit from storage.buckets where id = 'tugas-akhir';
--   -> public = false, 20971520
