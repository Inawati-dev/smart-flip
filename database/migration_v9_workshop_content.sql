-- ════════════════════════════════════════════
--  Migration v9 — Workshop content dosen-editable
--  Jalankan di: Supabase → SQL Editor → New query
-- ════════════════════════════════════════════
--
-- Context: Workshop.tsx's Tujuan/Aktivitas/Checklist/Lembar Kerja per modul
-- was hardcoded in src/lib/workshop.ts's WORKSHOP_DATA object (ported
-- verbatim from legacy/workshop.html) -- no table backed it, so dosen had no
-- way to edit it at all. This table lets a dosen override any module's
-- content; Workshop.tsx falls back to the bundled WORKSHOP_DATA for any
-- module that doesn't have a row here yet, so nothing regresses for the
-- 9 modules that already have good bundled content.

CREATE TABLE IF NOT EXISTS workshop_content (
  module_id    INT PRIMARY KEY REFERENCES modules(id) ON DELETE CASCADE,
  judul        TEXT NOT NULL,
  durasi       TEXT,
  tujuan       JSONB NOT NULL DEFAULT '[]',
  aktivitas    JSONB NOT NULL DEFAULT '[]',
  checklist    JSONB NOT NULL DEFAULT '[]',
  lembar_kerja JSONB NOT NULL DEFAULT '{"judul":"","instruksi":"","pertanyaan":[]}',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workshop_content ENABLE ROW LEVEL SECURITY;

-- Same read/write split as modules (schema.sql): every logged-in user can
-- read (mahasiswa needs it to render Workshop.tsx), only dosen can write.
CREATE POLICY "all read workshop_content" ON workshop_content
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "dosen manage workshop_content" ON workshop_content
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'));

GRANT SELECT, INSERT, UPDATE, DELETE ON workshop_content TO authenticated;

CREATE OR REPLACE FUNCTION workshop_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workshop_content_set_updated_at ON workshop_content;
CREATE TRIGGER workshop_content_set_updated_at
  BEFORE UPDATE ON workshop_content
  FOR EACH ROW EXECUTE FUNCTION workshop_content_updated_at();
