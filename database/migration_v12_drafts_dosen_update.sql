-- Bug produksi: dosen mengubah status draf ("Menunggu Review" / "Sudah
-- Direview" / "Perlu Revisi") di /draf tampak tidak berfungsi -- klik opsi
-- baru, refetch, status balik ke nilai lama. Root cause: `drafts` hanya
-- punya policy "user manage own drafts" (ALL, USING auth.uid() = user_id)
-- dan "dosen view all drafts" (SELECT saja). Dosen tidak pernah punya
-- policy UPDATE, jadi UPDATE dari dosen ter-RLS-filter ke 0 baris cocok --
-- Postgres tidak melempar error untuk UPDATE yang match 0 baris, jadi
-- updateDraftStatus() (src/lib/draf.ts) mengira berhasil padahal tidak ada
-- yang benar-benar berubah. Sama pola dengan migration_v10_quiz_questions_rls.sql.

CREATE POLICY "dosen update draft status" ON drafts
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'));
