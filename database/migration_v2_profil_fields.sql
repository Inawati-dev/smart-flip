-- ════════════════════════════════════════════
--  SMART-FLIP 5.0 — Migration v2: Profil dosen fields
--  Jalankan di: Supabase → SQL Editor → New query
--  ADDITIVE ONLY — aman dijalankan setelah schema.sql + migration_v1_livesync.sql
-- ════════════════════════════════════════════

-- Ditemukan saat audit skema pasca-migrasi React (2026-07-24): src/lib/profil.ts
-- (halaman Profil, identitas dosen) butuh dua kolom yang belum ada di manapun —
-- migration_v1_livesync.sql baru nambah prodi/angkatan, jabatan/fakultas kelewat.
-- Semua kolom/tabel lain yang dipakai halaman React baru (validasi_ahli, feedback,
-- forum likes, drafts.content/status, user_progress pct/time_spent, vark_scores)
-- sudah persis cocok dengan migration_v1_livesync.sql — dicek satu-satu, tidak
-- perlu migration tambahan untuk itu.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS jabatan  TEXT,
  ADD COLUMN IF NOT EXISTS fakultas TEXT;

-- Tidak perlu GRANT baru — GRANT SELECT/INSERT/UPDATE/DELETE ON profiles TO authenticated
-- (migration_v1_livesync.sql §0) dan policy "user update own profile" sudah berlaku
-- level-tabel, otomatis mencakup kolom baru ini.

-- ════════════════════════════════════════════
--  Checklist pasca-migrasi:
--  [ ] Jalankan file ini utuh di SQL Editor project Supabase asli
--  [ ] Login sebagai akun dosen (dosen@sf.id), buka /profil, isi Jabatan Fungsional +
--      Fakultas, simpan, refresh halaman — nilai harus tetap ada (bukan cuma di
--      localStorage lokal browser)
-- ════════════════════════════════════════════
