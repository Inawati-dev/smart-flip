-- SMART-FLIP 5.0 - migration v18: tes khusus berkode
-- Per docs/superpowers/specs/2026-09-15-tiga-menu-asesmen-design.md §4.6, §9 WP6b.
--
-- Idempoten - aman dijalankan ulang. Gaya mengikuti migration_v16 (RPC
-- SECURITY DEFINER sebagai satu-satunya pintu baca untuk mahasiswa; tabel
-- itu sendiri tidak pernah dapat policy SELECT langsung untuk mereka) dan
-- migration_v7 (tabel dibuat lewat SQL mentah butuh GRANT eksplisit sebelum
-- RLS-nya berarti apa-apa).

-- == Table: test_sessions ==
CREATE TABLE IF NOT EXISTS test_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  kind           TEXT NOT NULL CHECK (kind IN ('post','campuran')),
  module_ids     INT[] NOT NULL DEFAULT '{}',
  class_ids      UUID[] NOT NULL DEFAULT '{}',
  code           TEXT NOT NULL UNIQUE,
  is_open        BOOLEAN NOT NULL DEFAULT true,
  open_from      TIMESTAMPTZ,
  open_until     TIMESTAMPTZ,
  shuffle        BOOLEAN NOT NULL DEFAULT true,
  single_attempt BOOLEAN NOT NULL DEFAULT true,
  dosen_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;

-- Table-level GRANT first (Postgres checks this before RLS ever evaluates -
-- see migration_v7's comment on `classes`). RLS below then narrows rows to
-- the owning dosen; mahasiswa never get a SELECT policy here at all, so
-- `select * from test_sessions` as a mahasiswa returns zero rows even
-- though the GRANT technically allows the statement to run - this mirrors
-- dosen_invite_codes (v16): the only way in for them is verify_test_code().
GRANT SELECT, INSERT, UPDATE, DELETE ON test_sessions TO authenticated;

DROP POLICY IF EXISTS "dosen manage own sessions" ON test_sessions;
CREATE POLICY "dosen manage own sessions" ON test_sessions
  FOR ALL
  USING (dosen_id = auth.uid())
  WITH CHECK (dosen_id = auth.uid());

-- == quiz_attempts.session_id → test_sessions FK ==
-- session_id sudah ada sejak migration_v17 (kolom UUID polos, tanpa FK
-- karena test_sessions belum ada saat itu). ON DELETE SET NULL: menghapus
-- sesi tidak boleh menghapus riwayat pengerjaan mahasiswa, cuma
-- melepaskan tautannya. ADD CONSTRAINT tidak punya IF NOT EXISTS, jadi
-- dibungkus DO-block yang cek pg_constraint dulu (pola sama v17).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quiz_attempts_session_fk'
  ) THEN
    ALTER TABLE quiz_attempts ADD CONSTRAINT quiz_attempts_session_fk
      FOREIGN KEY (session_id) REFERENCES test_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- == RPC: verify_test_code - satu-satunya pintu baca mahasiswa ==
-- Balasan kosong (0 baris) untuk kode salah, sesi ditutup, di luar rentang
-- waktu, atau kelas mahasiswa tidak termasuk class_ids sesi. class_ids '{}'
-- berarti "semua kelas" (pola sama pengecekan module_ids kosong di tempat
-- lain proyek ini - array kosong = tanpa batasan).
CREATE OR REPLACE FUNCTION verify_test_code(p_code TEXT)
RETURNS TABLE (
  session_id UUID,
  kind TEXT,
  module_ids INT[],
  name TEXT,
  shuffle BOOLEAN,
  single_attempt BOOLEAN
) AS $$
  SELECT ts.id, ts.kind, ts.module_ids, ts.name, ts.shuffle, ts.single_attempt
  FROM test_sessions ts
  WHERE ts.code = upper(trim(p_code))
    AND ts.is_open
    AND (ts.open_from IS NULL OR now() >= ts.open_from)
    AND (ts.open_until IS NULL OR now() <= ts.open_until)
    AND (
      ts.class_ids = '{}'
      OR (SELECT class_id FROM profiles WHERE id = auth.uid()) = ANY (ts.class_ids)
    );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- == RPC: session_results - hasil satu sesi, hanya untuk dosen pemiliknya ==
CREATE OR REPLACE FUNCTION session_results(p_session UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  score INT,
  attempted_at TIMESTAMPTZ
) AS $$
  SELECT qa.user_id, p.full_name, qa.score, qa.attempted_at
  FROM quiz_attempts qa
  JOIN profiles p ON p.id = qa.user_id
  WHERE qa.session_id = p_session
    AND EXISTS (
      SELECT 1 FROM test_sessions ts WHERE ts.id = p_session AND ts.dosen_id = auth.uid()
    )
  ORDER BY qa.attempted_at DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

GRANT EXECUTE ON FUNCTION verify_test_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION session_results(UUID) TO authenticated;
REVOKE ALL ON FUNCTION verify_test_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION session_results(UUID) FROM PUBLIC;

-- ════════════════════════════════════════════
--  Verifikasi (jalankan manual di SQL Editor)
-- ════════════════════════════════════════════
-- select code, is_open from test_sessions;
--   -> daftar sesi + status buka/tutup
--
-- select * from verify_test_code('XXXXXX');
--   -> 0 baris untuk kode salah/sesi tertutup; 1 baris untuk kode aktif

-- ════════════════════════════════════════════
--  CATATAN
-- ════════════════════════════════════════════
-- Kode sesi dibuat di klien (src/lib/testSessions.ts generateCode()): 6
-- karakter dari ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (tanpa 0/O/1/I). Keunikan
-- ditegakkan oleh UNIQUE di kolom `code` di atas - dosen membuat ulang kode
-- kalau tabrakan (peluangnya sangat kecil, ditangani sisi klien lewat retry).
