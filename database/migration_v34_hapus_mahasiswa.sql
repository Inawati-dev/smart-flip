-- v34 (antrean #174, 10 Okt 2026): dosen menghapus akun mahasiswa dari daftar kelas.
--
-- Aplikasi memakai kunci publik dan tidak bisa menghapus akun sendiri, jadi
-- penghapusan lewat fungsi ini. Pengamannya ada di dalam fungsi:
--   - pemanggil harus berperan dosen;
--   - yang bisa dihapus hanya akun berperan mahasiswa;
--   - dan hanya mahasiswa di kelas milik dosen pemanggil.
-- Menghapus baris auth.users ikut menghapus profil dan seluruh pengerjaannya
-- (tes, progres baca, forum, draf) lewat hapus berantai. TIDAK bisa dibatalkan.
-- Berkas kiriman Mini Projek di penyimpanan tidak ikut terhapus.
-- Aman dijalankan ulang.

CREATE OR REPLACE FUNCTION hapus_mahasiswa(p_ids UUID[])
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jumlah INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dosen') THEN
    RAISE EXCEPTION 'Hanya dosen yang boleh menghapus akun mahasiswa' USING ERRCODE = '42501';
  END IF;

  WITH sasaran AS (
    SELECT p.id
    FROM public.profiles p
    JOIN public.classes c ON c.id = p.class_id
    WHERE p.id = ANY(p_ids)
      AND p.role = 'mahasiswa'
      AND c.dosen_id = auth.uid()
  ), terhapus AS (
    DELETE FROM auth.users u USING sasaran s WHERE u.id = s.id RETURNING u.id
  )
  SELECT count(*) INTO jumlah FROM terhapus;

  RETURN jumlah;
END;
$$;

REVOKE ALL ON FUNCTION hapus_mahasiswa(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hapus_mahasiswa(UUID[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
