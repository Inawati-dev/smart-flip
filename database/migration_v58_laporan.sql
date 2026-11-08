-- Migration v58 (antrean #373, 8 Nov 2026): menu Kirim saran dan laporan bug.
-- Johan menjalankan berkas ini di Supabase SQL Editor. Aplikasi tetap jalan sebelum berkas ini
-- dijalankan: halaman Kirim menampilkan pesan "belum aktif" dan tidak menyimpan apa pun.
--
-- Satu tabel `laporan`:
--   - setiap pengguna masuk boleh MENGIRIM (INSERT) laporan atas namanya sendiri; status selalu 'baru';
--     paling banyak 10 laporan per jam per pengguna (kebijakan di bawah menghitung baris lama);
--   - pengguna boleh MEMBACA laporannya sendiri; dosen boleh membaca semua (untuk tindak lanjut);
--   - hanya dosen yang boleh mengubah kolom `status` (baru, dibaca, selesai); kolom lain terkunci
--     lewat hak per kolom, jadi isi laporan tidak bisa diubah sesudah dikirim;
--   - tidak ada DELETE dari klien.
-- Isi paling panjang 2000 karakter; halaman asal paling panjang 200 karakter.
--
-- Aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS laporan (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  jenis      TEXT NOT NULL CHECK (jenis IN ('saran', 'bug')),
  isi        TEXT NOT NULL CHECK (char_length(btrim(isi)) BETWEEN 5 AND 2000),
  halaman    TEXT CHECK (halaman IS NULL OR char_length(halaman) <= 200),
  status     TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'dibaca', 'selesai')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS laporan_user_waktu ON laporan (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS laporan_status_waktu ON laporan (status, created_at DESC);

ALTER TABLE laporan ENABLE ROW LEVEL SECURITY;

-- Penanda dosen tanpa membuka tabel profiles ke kebijakan lain.
CREATE OR REPLACE FUNCTION public.adalah_dosen()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen');
$$;
REVOKE ALL ON FUNCTION public.adalah_dosen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adalah_dosen() TO authenticated;

DROP POLICY IF EXISTS "kirim laporan sendiri" ON laporan;
CREATE POLICY "kirim laporan sendiri" ON laporan FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'baru'
    AND (SELECT count(*) FROM laporan l WHERE l.user_id = auth.uid() AND l.created_at > now() - interval '1 hour') < 10
  );

DROP POLICY IF EXISTS "baca laporan sendiri atau dosen" ON laporan;
CREATE POLICY "baca laporan sendiri atau dosen" ON laporan FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.adalah_dosen());

DROP POLICY IF EXISTS "dosen ubah status laporan" ON laporan;
CREATE POLICY "dosen ubah status laporan" ON laporan FOR UPDATE TO authenticated
  USING (public.adalah_dosen())
  WITH CHECK (public.adalah_dosen());

-- Hak per kolom: klien hanya boleh mengirim user_id, jenis, isi, halaman; dosen hanya mengubah status.
REVOKE ALL ON laporan FROM anon, authenticated;
GRANT SELECT ON laporan TO authenticated;
GRANT INSERT (user_id, jenis, isi, halaman) ON laporan TO authenticated;
GRANT UPDATE (status) ON laporan TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Verifikasi (harapan: 1 baris tabel, 3 kebijakan):
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'laporan';
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'laporan' ORDER BY policyname;
-- Hak kolom (harapan: INSERT pada 4 kolom, UPDATE pada status):
-- SELECT grantee, privilege_type, column_name FROM information_schema.column_privileges
--   WHERE table_name = 'laporan' AND grantee = 'authenticated' ORDER BY privilege_type, column_name;
