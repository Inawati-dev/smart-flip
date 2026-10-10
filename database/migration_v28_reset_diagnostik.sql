-- migration_v28_reset_diagnostik.sql (antrean #155, 10 Okt 2026)
-- Mengizinkan dosen MENGHAPUS pengerjaan tes diagnostik (kind = 'pre') milik
-- mahasiswa di kelasnya sendiri, untuk tombol "Reset tes diagnostik" di halaman
-- Kelas. Sebelum ini dosen hanya boleh membaca quiz_attempts (policy
-- "dosen view own class attempts", migration_v13), jadi hapus dari aplikasi
-- ditolak diam-diam (0 baris terhapus, tanpa galat).
-- Sengaja sempit: hanya kind 'pre', hanya mahasiswa di kelas dosen itu
-- (is_dosen_of, migration_v13). Formatif, post-test, dan tes lain tidak ikut.

DROP POLICY IF EXISTS "dosen reset own class pretest" ON quiz_attempts;
CREATE POLICY "dosen reset own class pretest" ON quiz_attempts
  FOR DELETE USING (kind = 'pre' AND is_dosen_of(user_id));

-- Cek sesudah dijalankan (harus menampilkan satu baris, cmd = DELETE):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'quiz_attempts' AND policyname = 'dosen reset own class pretest';
