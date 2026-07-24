-- ════════════════════════════════════════════
--  Migration v10 — quiz_questions missing INSERT/UPDATE/DELETE policy
--  Jalankan di: Supabase → SQL Editor → New query
-- ════════════════════════════════════════════
--
-- Bug ditemukan LIVE (2026-07-24) lewat verifikasi browser beneran: dosen
-- klik "+ Tambah Soal" di Kelola Modul → Soal Kuis, isi form, klik Simpan --
-- gagal total (403), gak ada baris ketambah. schema.sql cuma bikin SATU
-- policy buat quiz_questions:
--   CREATE POLICY "all read questions" ON quiz_questions FOR SELECT
--     USING (auth.uid() IS NOT NULL);
-- Gak ada policy buat INSERT/UPDATE/DELETE -- RLS default-deny berlaku,
-- GRANT INSERT dari migration_v1_livesync.sql aja gak cukup (GRANT cuma izin
-- level tabel, RLS tetap filter row-by-row terpisah). Diverifikasi lewat REST
-- call langsung: error 42501 "new row violates row-level security policy for
-- table quiz_questions".
--
-- Fix: tambah policy dosen-manage, pola identik dengan
-- migration_v4_diagnostic_adaptive.sql's "diagnostic_questions write dosen".

DROP POLICY IF EXISTS "quiz_questions write dosen" ON quiz_questions;
CREATE POLICY "quiz_questions write dosen"
  ON quiz_questions FOR ALL
  USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'dosen'))
  WITH CHECK (exists (select 1 from public.profiles where id = auth.uid() and role = 'dosen'));
