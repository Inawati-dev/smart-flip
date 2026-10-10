-- v33 (10 Okt 2026). Dua hal, keduanya aman dijalankan ulang.
--
-- 1. Antrean #126 bagian c: kode kelas wajib saat mahasiswa mendaftar.
--    Halaman daftar memanggil verify_class_code() SEBELUM membuat akun, jadi
--    kode yang salah atau kelas yang penuh ditolak di depan. Fungsi hanya
--    menjawab 'ok', 'penuh', atau 'tidak_ada'; ia tidak membocorkan nama kelas.
--    Pemicu handle_new_user() TIDAK diubah, supaya impor mahasiswa lewat CSV
--    tetap berjalan seperti sebelumnya.
--
-- 2. Antrean #119 WP-3: perkiraan waktu belajar per topik (menit), diisi dosen.

CREATE OR REPLACE FUNCTION verify_class_code(submitted TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kelas public.classes%ROWTYPE;
  jumlah INT;
BEGIN
  IF submitted IS NULL OR length(trim(submitted)) = 0 THEN
    RETURN 'tidak_ada';
  END IF;
  SELECT * INTO kelas FROM public.classes WHERE code = upper(trim(submitted));
  IF NOT FOUND THEN
    RETURN 'tidak_ada';
  END IF;
  SELECT count(*) INTO jumlah FROM public.profiles WHERE class_id = kelas.id;
  IF jumlah >= kelas.max_students THEN
    RETURN 'penuh';
  END IF;
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION verify_class_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_class_code(TEXT) TO anon, authenticated;

ALTER TABLE modules ADD COLUMN IF NOT EXISTS estimasi_menit INT CHECK (estimasi_menit BETWEEN 1 AND 600);

NOTIFY pgrst, 'reload schema';

-- Cek sesudah jalan:
-- select verify_class_code('KODE-YANG-TIDAK-ADA');   -- harus 'tidak_ada'
-- select column_name from information_schema.columns where table_name = 'modules' and column_name = 'estimasi_menit';
