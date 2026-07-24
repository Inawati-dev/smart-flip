-- ════════════════════════════════════════════
--  MIGRATION v6 — Server-side gate for the "Dosen" role at signup
-- ════════════════════════════════════════════
-- Context: Register.tsx already asks for a "Kode Undangan Dosen" when the
-- user picks role=Dosen, checked client-side against
-- VITE_DOSEN_INVITE_CODE. That check is a UX deterrent ONLY — it's fully
-- bypassable via devtools or by calling the Supabase signUp API directly
-- with { data: { role: 'dosen' } } in user_metadata, which
-- handle_new_user() (schema.sql) currently trusts blindly:
--
--   COALESCE(NEW.raw_user_meta_data->>'role', 'mahasiswa')
--
-- This migration adds the actual server-side check. Run this in the
-- Supabase SQL Editor AFTER schema.sql (and after v1-v5) have been applied.
--
-- WAJIB: after running this, immediately UPDATE the seeded placeholder code
-- below to a real value only you and colleagues who should get dosen access
-- know -- and keep it in sync with VITE_DOSEN_INVITE_CODE in your local
-- .env.local (the client-side check and this server-side check are
-- independent; both should reject a wrong code, but they don't share state).

-- ── Table: single-row store for the current dosen invite code ──
-- RLS enabled with ZERO policies defined below -- no client role (anon,
-- authenticated) can read or write this table at all. Only
-- handle_new_user() can see it, since SECURITY DEFINER functions run with
-- the privileges of the function owner (bypasses RLS), not the caller's.
CREATE TABLE IF NOT EXISTS dosen_invite_codes (
  id         BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),  -- forces exactly one row
  code       TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE dosen_invite_codes ENABLE ROW LEVEL SECURITY;

INSERT INTO dosen_invite_codes (id, code)
VALUES (true, 'GANTI_KODE_INI_SEKARANG')
ON CONFLICT (id) DO NOTHING;

-- ── Replace handle_new_user() to validate role='dosen' against the code ──
-- Any signup that claims role=dosen without a matching
-- raw_user_meta_data->>'dosen_invite_code' silently becomes role=mahasiswa
-- instead of erroring -- fail-closed (matches this project's ProtectedRoute
-- fail-closed pattern), and doesn't block the signup itself over a wrong
-- invite code (better UX: they still get an account, just not dosen access).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'mahasiswa');
  submitted_code TEXT := NEW.raw_user_meta_data->>'dosen_invite_code';
  real_code      TEXT;
  final_role     TEXT := 'mahasiswa';
BEGIN
  IF requested_role = 'dosen' THEN
    SELECT code INTO real_code FROM dosen_invite_codes WHERE id = true;
    IF real_code IS NOT NULL AND submitted_code IS NOT NULL AND submitted_code = real_code THEN
      final_role := 'dosen';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengguna Baru'),
    final_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger `on_auth_user_created` already points at handle_new_user() by name
-- (schema.sql) -- CREATE OR REPLACE above updates its body in place, no
-- need to re-create the trigger itself.

-- ════════════════════════════════════════════
--  BUG KEAMANAN TERPISAH, DITEMUKAN SAAT AUDIT MIGRATION INI (lebih serius
--  dari yang diminta -- perbaiki juga di sini karena satu-satunya sebabnya
--  invite-code di atas berarti sesuatu):
--
--  schema.sql's "user update own profile" policy:
--    CREATE POLICY "user update own profile" ON profiles FOR UPDATE
--      USING (auth.uid() = id);
--  ...has NO WITH CHECK clause. Postgres defaults an omitted WITH CHECK to
--  the same expression as USING -- which only constrains WHICH ROW can be
--  touched (must be your own), never WHAT COLUMNS may change. Any logged-in
--  user can currently self-promote via the browser console RIGHT NOW:
--    supabase.from('profiles').update({ role: 'dosen' }).eq('id', myUserId)
--  This works completely independently of the invite code above -- closing
--  the signup gate alone would be pointless if a mahasiswa can just update
--  their own role afterward.
-- ════════════════════════════════════════════

-- Triggers fire for every UPDATE regardless of caller (RLS and triggers are
-- separate mechanisms) -- without the current_user check below, this would
-- ALSO silently block a legitimate manual promotion done by you via the
-- Supabase Dashboard's Table Editor / SQL Editor (runs as `postgres`) or a
-- future admin script using the service_role key. Only the `authenticated`
-- role (what the browser SDK connects as) gets locked out.
CREATE OR REPLACE FUNCTION lock_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
    NEW.role := OLD.role;  -- silently ignore any client-submitted role change
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_lock_role ON profiles;
CREATE TRIGGER profiles_lock_role
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION lock_profile_role();

-- Runs BEFORE handle_updated_at (schema.sql, also BEFORE UPDATE) in
-- alphabetical trigger-name order (profiles_lock_role < profiles_updated_at)
-- -- doesn't matter here since the two triggers touch different columns,
-- but noting it in case either trigger is ever extended to depend on order.

-- ════════════════════════════════════════════
--  CATATAN — langkah wajib setelah run migration ini
-- ════════════════════════════════════════════
-- 1. UPDATE dosen_invite_codes SET code = 'kode-rahasia-anda-sendiri' WHERE id = true;
-- 2. Set VITE_DOSEN_INVITE_CODE=kode-rahasia-anda-sendiri di .env.local
--    (nilai yang sama persis -- client-side check di Register.tsx dan
--    server-side check di sini independen, keduanya harus match kode yang
--    sama supaya alur pendaftaran dosen konsisten).
-- 3. Akun dosen yang SUDAH ADA sebelum migration ini TIDAK terpengaruh --
--    ini cuma menutup jalur signup baru, bukan mencabut role existing.
