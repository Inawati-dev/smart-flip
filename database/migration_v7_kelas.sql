-- ════════════════════════════════════════════
--  MIGRATION v7 — Kelas / Rombongan Belajar (Tahap 1)
-- ════════════════════════════════════════════
-- Context: dosen needs to group mahasiswa into "kelas" (offerings) — 1 kelas
-- has a name (e.g. "Kelas A"), an angkatan (intake year), a max capacity
-- (default 40), and a short unique join code the dosen shares with students.
-- Mahasiswa self-register with that code (src/pages/Register.tsx's new,
-- OPTIONAL "Kode Kelas" field) instead of a dosen/admin manually creating
-- every student account.
--
-- Run this in the Supabase SQL Editor AFTER schema.sql and v1-v6 have been
-- applied (this migration extends handle_new_user() again on top of v6's
-- dosen-invite-code version — v6's logic is preserved below, not replaced).
--
-- OUT OF SCOPE (Tahap 2 — deliberately not built here, needs a Supabase Edge
-- Function + service_role key that isn't provisioned yet):
--   - Bulk CSV import of mahasiswa accounts into a kelas
--   - Auto-generated passwords / admin-created accounts
-- If you're reading this migration looking for that: it doesn't belong here.
-- See "Kelola Kelas" in src/pages/Kelas.tsx for a `-- TODO(tahap-2)` marker
-- at the one spot that would eventually need it.

-- ── Table: classes ──
CREATE TABLE IF NOT EXISTS classes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  angkatan     INT  NOT NULL,
  code         TEXT NOT NULL UNIQUE,
  dosen_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  max_students INT  NOT NULL DEFAULT 40,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- RLS policies below only control WHICH ROWS a role may touch -- Postgres
-- checks table-level GRANTs FIRST, before RLS ever evaluates. schema.sql's
-- original tables all got this grant implicitly when created through the
-- Supabase dashboard; a table created via raw SQL (like this one) does NOT
-- get it automatically. Without this line, every authenticated request
-- against `classes` fails with "permission denied for table classes"
-- (Postgres code 42501) regardless of how correct the RLS policies are --
-- confirmed live in production (2026-07-24): dosen could not create or see
-- any kelas until this GRANT was run.
GRANT SELECT, INSERT, UPDATE, DELETE ON classes TO authenticated;

-- ── profiles gains a nullable class_id (a mahasiswa without one just isn't
--    assigned to a kelas yet — nothing else in the app currently requires it) ──
-- ON DELETE SET NULL (not CASCADE): deleting a kelas must never delete the
-- mahasiswa profiles that belonged to it — it should just unlink them.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- ════════════════════════════════════════════
--  RLS — classes
-- ════════════════════════════════════════════
-- There is no 'admin' role in this schema (profiles.role CHECK only allows
-- 'mahasiswa' | 'dosen' — see database/schema.sql) so there's no separate
-- admin-bypass policy to write here; "full akses" for the owning dosen is
-- covered by the FOR ALL policy below.
--
-- Design intent, spelled out because it's easy to get RLS SELECT wrong here:
--   - A dosen can see/manage every kelas THEY created (dosen_id = auth.uid()).
--   - A mahasiswa can see ONLY the one kelas they belong to (their
--     profiles.class_id), so profil.html-equivalent pages can show the kelas
--     name — never the full table.
--   - Multiple permissive policies on the same command are OR'd together by
--     Postgres, so a dosen viewing their own classes and a mahasiswa viewing
--     their single class both work through the two separate policies below
--     without conflicting.
--   - anon (unauthenticated) matches NEITHER policy, since both conditions
--     require auth.uid() to equal something — auth.uid() is NULL for anon,
--     and NULL = anything is never true in SQL. So `code` (or any column)
--     can NOT be scraped via `select * from classes` as anon. This mirrors
--     dosen_invite_codes (migration_v6) being fully locked from anon reads,
--     though classes still needs authenticated-owner/member reads, unlike
--     that single-secret table.
--   - The join-by-code lookup during signup does NOT go through these
--     policies at all — handle_new_user() below is SECURITY DEFINER, which
--     runs with the function owner's privileges and bypasses RLS entirely
--     (same mechanism v6 already relies on for dosen_invite_codes).
CREATE POLICY "dosen manage own classes" ON classes
  FOR ALL
  USING (dosen_id = auth.uid())
  WITH CHECK (dosen_id = auth.uid());

CREATE POLICY "member reads own class" ON classes
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.class_id = classes.id));

-- ════════════════════════════════════════════
--  Lock profiles.class_id against direct client writes
-- ════════════════════════════════════════════
-- Why this is needed, not just "nice to have": schema.sql's
-- "user update own profile" policy is `USING (auth.uid() = id)` with no
-- WITH CHECK, so (per v6's own audit note on the sibling `role` column)
-- Postgres defaults the omitted WITH CHECK to the same USING expression —
-- which only constrains WHICH ROW a user may touch, never WHICH COLUMNS.
-- Without the trigger below, any authenticated mahasiswa could run, from the
-- browser console, something like:
--   supabase.from('profiles').update({ class_id: '<any-uuid>' }).eq('id', myUserId)
-- ...and join ANY kelas directly, completely bypassing the code + capacity
-- check in handle_new_user() below (they'd only need to guess/observe a
-- UUID, not know the actual join code). That would make the whole
-- code-gated signup flow pointless for anyone already logged in.
--
-- v6 already created a trigger (profiles_lock_role / lock_profile_role) for
-- the exact same class of problem on the `role` column. Rather than bolt on
-- a second independent trigger, this migration extends that SAME function to
-- also lock class_id, and keeps the identical service-role/postgres escape
-- hatch v6 already documented (so a future Tahap-2 admin script using the
-- service_role key, or you manually reassigning a mahasiswa's kelas via the
-- Supabase Dashboard, still works — only the `authenticated` role used by
-- the browser SDK gets locked out).
CREATE OR REPLACE FUNCTION lock_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      NEW.role := OLD.role;  -- silently ignore any client-submitted role change (v6)
    END IF;
    IF NEW.class_id IS DISTINCT FROM OLD.class_id THEN
      NEW.class_id := OLD.class_id;  -- silently ignore any client-submitted kelas change (v7)
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger `profiles_lock_role` (v6) already points at lock_profile_role() by
-- name — CREATE OR REPLACE above updates its body in place, no need to
-- re-create the trigger itself.

-- ════════════════════════════════════════════
--  handle_new_user() — extended again, on top of v6's dosen-invite-code check
-- ════════════════════════════════════════════
-- Adds: when requested_role = 'mahasiswa' AND raw_user_meta_data->>'class_code'
-- is present, look up a matching `classes` row and, if found AND not yet at
-- max_students, set the new profile's class_id. Same fail-closed-but-silent
-- philosophy as v6's dosen invite code: a missing/wrong/full-class code must
-- NEVER block signup — the mahasiswa still gets an account, just with
-- class_id left NULL, to be assigned manually later if needed.
--
-- The "not yet at max_students" count is `SELECT count(*) FROM profiles
-- WHERE class_id = <that class's id>` — this runs BEFORE the new profiles
-- row is inserted below, so it correctly reflects capacity as of THIS
-- signup, not including the row being created.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role   TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'mahasiswa');
  submitted_code   TEXT := NEW.raw_user_meta_data->>'dosen_invite_code';
  real_code        TEXT;
  final_role       TEXT := 'mahasiswa';
  submitted_class  TEXT := NEW.raw_user_meta_data->>'class_code';
  matched_class    classes%ROWTYPE;
  current_count    INT;
  final_class_id   UUID := NULL;
BEGIN
  IF requested_role = 'dosen' THEN
    SELECT code INTO real_code FROM dosen_invite_codes WHERE id = true;
    IF real_code IS NOT NULL AND submitted_code IS NOT NULL AND submitted_code = real_code THEN
      final_role := 'dosen';
    END IF;
  END IF;

  -- Only mahasiswa join a kelas via code — a 'dosen' signup that also
  -- happens to carry a stray class_code (shouldn't happen from the current
  -- UI, Register.tsx only sends it for role='mahasiswa') is intentionally
  -- ignored rather than trusted, same fail-closed spirit as the rest of this
  -- function.
  IF final_role = 'mahasiswa' AND submitted_code IS NOT NULL AND length(trim(submitted_code)) > 0 THEN
    SELECT * INTO matched_class FROM classes WHERE code = upper(trim(submitted_code));
    IF FOUND THEN
      SELECT count(*) INTO current_count FROM profiles WHERE class_id = matched_class.id;
      IF current_count < matched_class.max_students THEN
        final_class_id := matched_class.id;
      END IF;
      -- else: kelas penuh -- silently leave final_class_id NULL, signup proceeds.
    END IF;
    -- else: kode tidak match kelas manapun -- silently leave final_class_id NULL.
  END IF;

  INSERT INTO public.profiles (id, full_name, role, class_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengguna Baru'),
    final_role,
    final_class_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger `on_auth_user_created` (schema.sql) already points at
-- handle_new_user() by name — CREATE OR REPLACE above updates its body in
-- place, no need to re-create the trigger itself.

-- ════════════════════════════════════════════
--  CATATAN — langkah manual setelah run migration ini
-- ════════════════════════════════════════════
-- 1. Tidak ada seed/placeholder yang perlu diganti di migration ini (beda
--    dari v6's dosen_invite_codes) — kode kelas dibuat oleh dosen sendiri
--    lewat halaman /kelas (src/pages/Kelas.tsx), digenerate acak per kelas,
--    bukan satu kode tunggal yang perlu diset di sini.
-- 2. Kelas yang sudah dibuat SEBELUM migration ini jelas tidak ada, karena
--    tabelnya baru dibuat di sini — tidak ada data lama yang perlu dimigrasi.
-- 3. Mahasiswa yang sudah terdaftar SEBELUM migration ini punya class_id
--    NULL secara default (kolom baru, tanpa backfill) — tidak masalah,
--    sesuai desain (class_id opsional, bisa diisi manual belakangan).
-- 4. Kalau nanti butuh reassign class_id mahasiswa secara manual (dosen
--    salah approve, mahasiswa pindah kelas, dst.): lakukan lewat Supabase
--    Dashboard Table Editor atau SQL Editor langsung (berjalan sebagai
--    `postgres`, jadi tidak diblokir oleh trigger profiles_lock_role di
--    atas) — TIDAK ada UI untuk ini di Tahap 1.
