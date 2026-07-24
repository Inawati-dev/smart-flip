-- ════════════════════════════════════════════
--  Migration v8 — Reset Jalur Diagnostik (dosen-only RPC)
--  Jalankan di: Supabase → SQL Editor → New query
-- ════════════════════════════════════════════
--
-- Context: mahasiswa's diagnostic result (`profiles.jalur`) is one-time and
-- permanent by design (Diagnostik.tsx blocks retaking once jalur is set) --
-- but a dosen needs a way to let one student redo it (e.g. they misread a
-- question, or a test/dummy account needs re-running). The only existing
-- workaround was a manual `UPDATE profiles SET jalur = NULL WHERE id = ...`
-- run by hand in the SQL Editor.
--
-- schema.sql's "user update own profile" RLS policy only allows
-- `auth.uid() = id` -- a dosen calling
-- `supabase.from('profiles').update({jalur: null}).eq('id', otherId)` from
-- the browser would match ZERO rows (RLS filters silently, no error), so a
-- plain client-side update can't work here. A SECURITY DEFINER RPC that
-- checks the caller is a dosen internally is the least-privilege fix --
-- narrower than adding a blanket "dosen can update any profile" policy,
-- which would also let a dosen touch full_name/role/etc. on any account.

CREATE OR REPLACE FUNCTION reset_mahasiswa_jalur(target_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen') THEN
    RAISE EXCEPTION 'Hanya dosen yang dapat mereset jalur diagnostik.';
  END IF;

  UPDATE profiles SET jalur = NULL WHERE id = target_id AND role = 'mahasiswa';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION reset_mahasiswa_jalur(UUID) TO authenticated;
