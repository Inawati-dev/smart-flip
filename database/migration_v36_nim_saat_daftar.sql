-- v36 (antrean #178, 10 Okt 2026): NIM/NIDN yang diketik saat daftar ikut tersimpan.
--
-- Halaman daftar mengirim NIM/NIDN bersama data pendaftaran, tetapi pemicu
-- handle_new_user() (terakhir diubah di v7) hanya menyalin nama, peran, dan
-- kelas ke tabel profiles. Halaman daftar lalu mencoba menulis NIM sendiri
-- dengan cara yang selalu ditolak basis data (tanpa kolom role yang wajib
-- isi), jadi kolom nim_nidn kosong. Dicek Johan 10 Okt 2026: 2 dari 2
-- mahasiswa NIM-nya kosong.
--
-- Berkas ini melakukan dua hal:
--   1. handle_new_user() ikut mengisi nim_nidn. Isi fungsinya sama persis
--      dengan v7, ditambah satu kolom di INSERT paling bawah.
--   2. Akun yang sudah ada dan NIM-nya kosong diisi dari data yang diketik
--      pemiliknya saat daftar. Yang sudah terisi tidak disentuh.
-- Impor mahasiswa lewat CSV tidak terpengaruh (jalur itu mengisi NIM sendiri).
-- Aman dijalankan ulang.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role   TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'mahasiswa');
  submitted_code   TEXT := NEW.raw_user_meta_data->>'dosen_invite_code';
  real_code        TEXT;
  final_role       TEXT := 'mahasiswa';
  submitted_class  TEXT := NEW.raw_user_meta_data->>'class_code';
  matched_class    public.classes%ROWTYPE;
  current_count    INT;
  final_class_id   UUID := NULL;
BEGIN
  IF requested_role = 'dosen' THEN
    SELECT code INTO real_code FROM dosen_invite_codes WHERE id = true;
    IF real_code IS NOT NULL AND submitted_code IS NOT NULL AND submitted_code = real_code THEN
      final_role := 'dosen';
    END IF;
  END IF;

  IF final_role = 'mahasiswa' AND submitted_class IS NOT NULL AND length(trim(submitted_class)) > 0 THEN
    SELECT * INTO matched_class FROM public.classes WHERE code = upper(trim(submitted_class));
    IF FOUND THEN
      SELECT count(*) INTO current_count FROM public.profiles WHERE class_id = matched_class.id;
      IF current_count < matched_class.max_students THEN
        final_class_id := matched_class.id;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, role, class_id, nim_nidn)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengguna Baru'),
    final_role,
    final_class_id,
    NULLIF(trim(NEW.raw_user_meta_data->>'nim_nidn'), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Akun lama: isi NIM/NIDN yang kosong dari data pendaftaran pemiliknya.
UPDATE public.profiles p
SET nim_nidn = trim(u.raw_user_meta_data->>'nim_nidn')
FROM auth.users u
WHERE u.id = p.id
  AND COALESCE(p.nim_nidn, '') = ''
  AND COALESCE(trim(u.raw_user_meta_data->>'nim_nidn'), '') <> '';

-- Hasil: berapa yang masih kosong sesudah diisi (akun yang memang tidak
-- pernah mengetik NIM saat daftar tetap kosong).
SELECT role,
       count(*) FILTER (WHERE COALESCE(nim_nidn, '') = '') AS nim_masih_kosong,
       count(*) AS semua
FROM public.profiles
GROUP BY role
ORDER BY role;
