-- Multi-tenancy fix: every dosen policy so far said "SELECT ALL rows where
-- role = 'dosen'" — ANY dosen account could see EVERY mahasiswa/progress/
-- attempt/draft/feedback row system-wide, regardless of which classes they
-- actually own. User explicitly confirmed (2026-07-25): modules stay shared
-- (one curriculum for everyone), but mahasiswa/mata kuliah/kelas must be
-- scoped per dosen. Verified before writing this: all 20 seeded mahasiswa
-- are already linked (profiles.class_id) to classes owned by a single real
-- dosen account, so this migration doesn't hide any data that dosen can
-- currently see — it only stops OTHER dosen accounts from seeing rows that
-- were never theirs.
--
-- NOT scoped by this migration (deliberately, matches the user's own
-- "kelas/mahasiswa" framing, not a broader forum overhaul):
--   - forum_posts ("auth users read forum") -- shared cross-class
--     discussion space read by mahasiswa too; scoping it would also change
--     what mahasiswa themselves can read, a bigger change than asked for.
--   - modules / quiz_questions -- explicitly meant to stay shared.

CREATE OR REPLACE FUNCTION is_dosen_of(student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN classes c ON c.id = p.class_id
    WHERE p.id = student_id AND c.dosen_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "dosen see all profiles" ON profiles;
CREATE POLICY "dosen see own class profiles" ON profiles
  FOR SELECT USING (is_dosen_of(id));

DROP POLICY IF EXISTS "dosen view all progress" ON user_progress;
CREATE POLICY "dosen view own class progress" ON user_progress
  FOR SELECT USING (is_dosen_of(user_id));

DROP POLICY IF EXISTS "dosen view all attempts" ON quiz_attempts;
CREATE POLICY "dosen view own class attempts" ON quiz_attempts
  FOR SELECT USING (is_dosen_of(user_id));

DROP POLICY IF EXISTS "dosen view all drafts" ON drafts;
CREATE POLICY "dosen view own class drafts" ON drafts
  FOR SELECT USING (is_dosen_of(user_id));

-- migration_v12 added dosen UPDATE on drafts.status scoped only to
-- role='dosen' (any dosen could update any student's draft status) -- same
-- gap, tightened here to match the SELECT policy above.
DROP POLICY IF EXISTS "dosen update draft status" ON drafts;
CREATE POLICY "dosen update own class draft status" ON drafts
  FOR UPDATE USING (is_dosen_of(user_id)) WITH CHECK (is_dosen_of(user_id));

DROP POLICY IF EXISTS "dosen view all feedback" ON feedback;
CREATE POLICY "dosen view own class feedback" ON feedback
  FOR SELECT USING (is_dosen_of(user_id));
