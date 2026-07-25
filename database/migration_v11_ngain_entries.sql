-- N-Gain Calculator SDL (/ngain) persistence — previously pure client-side
-- React state seeded from a hardcoded dummy roster (Ahmad Rizki dkk, ported
-- verbatim from legacy/ngain.html), so every refresh silently discarded
-- whatever a dosen had typed in and reset back to the same 5 example rows.
-- This adds real storage: one worksheet (list of nama/pre/post rows) plus
-- one config row (skor maksimum, jumlah mahasiswa) per dosen.

CREATE TABLE IF NOT EXISTS ngain_entries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dosen_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nama text NOT NULL DEFAULT '',
  pre numeric,
  post numeric,
  order_num integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ngain_entries_dosen_id_idx ON ngain_entries (dosen_id);

CREATE TABLE IF NOT EXISTS ngain_config (
  dosen_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  skor_max numeric NOT NULL DEFAULT 100,
  jml_mhs integer NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ngain_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ngain_config TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE ngain_entries_id_seq TO authenticated;

ALTER TABLE ngain_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ngain_config ENABLE ROW LEVEL SECURITY;

-- Self-scoped (dosen_id = auth.uid()) — the /ngain route is already
-- dosen-only client-side (ProtectedRoute roles=['dosen']), and each row is
-- private scratch data for that one dosen's own worksheet, not shared
-- class data, so there's no need for a role check here beyond ownership.
CREATE POLICY "ngain_entries own rows" ON ngain_entries
  FOR ALL USING (dosen_id = auth.uid()) WITH CHECK (dosen_id = auth.uid());

CREATE POLICY "ngain_config own row" ON ngain_config
  FOR ALL USING (dosen_id = auth.uid()) WITH CHECK (dosen_id = auth.uid());
