-- migration_v44_angkatan_daftar.sql (antrean #239, disetujui Johan 18 Okt 2026)
--
-- Permintaan: halaman daftar mahasiswa punya kolom TAHUN ANGKATAN, dan
-- keputusan Johan "Kelas dipisah per angkatan": kelas otomatis dibentuk per
-- angkatan ("Jalur Cepat A" angkatan 2024 terpisah dari angkatan 2025).
--
-- Syarat: v40 (kelas otomatis) sudah jalan. Berkas ini hanya mengganti isi
-- tiga fungsi milik v40 dan menambah satu fungsi bantu; tidak ada data yang
-- diubah dan tidak ada kolom baru (profiles.angkatan TEXT sudah ada sejak v1).
--
--   a. handle_new_user(): mahasiswa wajib mengirim angkatan berupa tahun 4
--      digit dalam rentang [tahun sekarang - 10, tahun sekarang]. Selain itu
--      pendaftaran DITOLAK (akun tidak dibuat), pola sama dengan penolakan
--      kode mata kuliah. Angkatan disimpan ke profiles.angkatan.
--   b. tempatkan_mahasiswa(): angkatan kelas = profiles.angkatan bila sah
--      (aturan sama); bila kosong/tidak sah (akun lama), tahun saat tes
--      seperti v40. Indeks unik (course_id, golongan, angkatan, urutan) dari
--      v40 tetap menjaga huruf kelas per angkatan.
--   c. lock_profile_role(): mahasiswa tidak bisa mengubah profiles.angkatan
--      sendiri sesudah terdaftar, supaya angkatan tidak dipakai memilih
--      kelas. SQL Editor (postgres) tetap bisa. Fungsi tetap SECURITY INVOKER
--      (perbaikan v40).
--
-- Tahun "sekarang" memakai zona Asia/Jakarta, supaya pilihan tahun di
-- peramban (jam lokal) tidak ditolak di malam tahun baru.
-- Aman dijalankan ulang.

-- ════════════════════════════════════════════
--  Bantu: angkatan sah atau NULL
-- ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION angkatan_sah(p TEXT)
RETURNS INT
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN btrim(COALESCE(p, '')) ~ '^[0-9]{4}$'
     AND btrim(p)::INT BETWEEN extract(year FROM now() AT TIME ZONE 'Asia/Jakarta')::INT - 10
                           AND extract(year FROM now() AT TIME ZONE 'Asia/Jakarta')::INT
    THEN btrim(p)::INT
  END;
$$;
REVOKE ALL ON FUNCTION angkatan_sah(TEXT) FROM PUBLIC, anon, authenticated;

-- ════════════════════════════════════════════
--  a. Pendaftaran: angkatan wajib bagi mahasiswa
-- ════════════════════════════════════════════
-- Isi sama dengan v40, ditambah pemeriksaan dan penyimpanan angkatan.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role   TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'mahasiswa');
  submitted_code   TEXT := NEW.raw_user_meta_data->>'dosen_invite_code';
  real_code        TEXT;
  final_role       TEXT := 'mahasiswa';
  submitted_course TEXT := upper(btrim(COALESCE(NEW.raw_user_meta_data->>'course_code', '')));
  final_course     INT := NULL;
  final_angkatan   INT := NULL;
BEGIN
  IF requested_role = 'dosen' THEN
    SELECT code INTO real_code FROM public.dosen_invite_codes WHERE id = true;
    IF real_code IS NOT NULL AND submitted_code IS NOT NULL AND submitted_code = real_code THEN
      final_role := 'dosen';
    END IF;
  END IF;

  IF final_role = 'mahasiswa' THEN
    SELECT k.course_id INTO final_course
    FROM public.course_join_codes k
    JOIN public.courses c ON c.id = k.course_id
    WHERE k.code = submitted_course AND c.is_active;
    IF final_course IS NULL THEN
      RAISE EXCEPTION 'Kode mata kuliah tidak dikenali' USING ERRCODE = '22023';
    END IF;
    final_angkatan := public.angkatan_sah(NEW.raw_user_meta_data->>'angkatan');
    IF final_angkatan IS NULL THEN
      RAISE EXCEPTION 'Tahun angkatan tidak sah' USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, role, class_id, course_id, nim_nidn, angkatan)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengguna Baru'),
    final_role,
    NULL,
    final_course,
    NULLIF(trim(NEW.raw_user_meta_data->>'nim_nidn'), ''),
    final_angkatan::TEXT
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ════════════════════════════════════════════
--  b. Penempatan: kelas per angkatan pendaftaran
-- ════════════════════════════════════════════
-- Isi sama dengan v40, kecuali baris v_angkatan.
CREATE OR REPLACE FUNCTION tempatkan_mahasiswa(p_user UUID, p_course INT, p_skor INT, p_waktu TIMESTAMPTZ DEFAULT now())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profil   public.profiles%ROWTYPE;
  v_ambang   INT;
  v_gol      TEXT;
  v_angkatan INT;
  v_kelas    UUID;
  v_urutan   INT;
  v_kode     TEXT;
  v_coba     INT := 0;
BEGIN
  SELECT * INTO v_profil FROM public.profiles WHERE id = p_user;
  IF NOT FOUND OR v_profil.role <> 'mahasiswa' OR p_skor IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT COALESCE(ambang_diagnostik, 80) INTO v_ambang FROM public.courses WHERE id = p_course;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  v_gol := CASE WHEN p_skor >= v_ambang THEN 'mahir' ELSE 'remedial' END;
  -- v44: angkatan pendaftaran (dikunci dari klien oleh lock_profile_role di
  -- bawah). Akun lama tanpa angkatan sah: tahun saat tes, seperti v40.
  v_angkatan := COALESCE(public.angkatan_sah(v_profil.angkatan), extract(year FROM COALESCE(p_waktu, now()))::INT);

  -- Satu penempatan per (mata kuliah, golongan) pada satu waktu; dilepas saat transaksi selesai.
  PERFORM pg_advisory_xact_lock(228, p_course * 2 + CASE WHEN v_gol = 'mahir' THEN 1 ELSE 0 END);

  -- Sudah di kelas otomatis yang cocok (mis. tes ulang sesudah reset dengan
  -- golongan sama): tetap di kelasnya.
  SELECT id INTO v_kelas FROM public.classes
  WHERE id = v_profil.class_id AND course_id = p_course AND golongan = v_gol AND angkatan = v_angkatan;

  IF v_kelas IS NULL THEN
    SELECT c.id INTO v_kelas
    FROM public.classes c
    WHERE c.course_id = p_course AND c.golongan = v_gol AND c.angkatan = v_angkatan
      AND (SELECT count(*) FROM public.profiles p WHERE p.class_id = c.id) < c.max_students
    ORDER BY c.urutan
    LIMIT 1;
  END IF;

  IF v_kelas IS NULL THEN
    SELECT COALESCE(max(urutan), 0) + 1 INTO v_urutan
    FROM public.classes WHERE course_id = p_course AND golongan = v_gol AND angkatan = v_angkatan;
    v_kode := format('MK%s-%s-%s-%s', p_course, CASE v_gol WHEN 'mahir' THEN 'JC' ELSE 'BM' END, v_angkatan, huruf_kelas(v_urutan));
    WHILE EXISTS (SELECT 1 FROM public.classes WHERE code = v_kode) LOOP
      v_coba := v_coba + 1;
      IF v_coba > 20 THEN
        RAISE EXCEPTION 'Tidak menemukan kode kelas yang belum dipakai untuk %', v_kode;
      END IF;
      v_kode := format('MK%s-%s-%s-%s-%s', p_course, CASE v_gol WHEN 'mahir' THEN 'JC' ELSE 'BM' END, v_angkatan, huruf_kelas(v_urutan),
                       upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4)));
    END LOOP;
    INSERT INTO public.classes (name, angkatan, code, dosen_id, max_students, course_id, golongan, urutan)
    VALUES (
      CASE v_gol WHEN 'mahir' THEN 'Jalur Cepat ' ELSE 'Belajar Mendalam ' END || huruf_kelas(v_urutan),
      v_angkatan,
      v_kode,
      pengampu_mk(p_course),
      25,
      p_course,
      v_gol,
      v_urutan
    )
    RETURNING id INTO v_kelas;
  END IF;

  UPDATE public.profiles SET class_id = v_kelas, course_id = p_course WHERE id = p_user;
  RETURN v_kelas;
END;
$$;
REVOKE ALL ON FUNCTION tempatkan_mahasiswa(UUID, INT, INT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

-- ════════════════════════════════════════════
--  c. Kunci angkatan mahasiswa dari tulisan klien
-- ════════════════════════════════════════════
-- Isi sama dengan v40, ditambah angkatan (hanya baris mahasiswa; dosen tidak
-- punya kelas, jadi angkatannya tidak dikunci).
CREATE OR REPLACE FUNCTION lock_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      NEW.role := OLD.role;
    END IF;
    IF NEW.class_id IS DISTINCT FROM OLD.class_id THEN
      NEW.class_id := OLD.class_id;
    END IF;
    IF NEW.course_id IS DISTINCT FROM OLD.course_id THEN
      NEW.course_id := OLD.course_id;
    END IF;
    IF OLD.role = 'mahasiswa' AND NEW.angkatan IS DISTINCT FROM OLD.angkatan THEN
      NEW.angkatan := OLD.angkatan;  -- v44: angkatan ditetapkan saat daftar
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

-- Isi ulang angkatan mahasiswa yang mendaftar lewat aplikasi baru sebelum v44 dijalankan: angkatannya
-- tersimpan di data pendaftaran (auth.users) tetapi belum masuk profil (temuan pemeriksa #239). Jalan sebagai
-- pemilik (SQL Editor), jadi kunci profil tidak menghalangi. Aman dijalankan ulang (hanya yang masih kosong).
UPDATE public.profiles p
   SET angkatan = public.angkatan_sah(u.raw_user_meta_data->>'angkatan')::text
  FROM auth.users u
 WHERE p.id = u.id AND p.role = 'mahasiswa' AND p.angkatan IS NULL
   AND public.angkatan_sah(u.raw_user_meta_data->>'angkatan') IS NOT NULL;

NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════
--  Cek sesudah dijalankan
-- ════════════════════════════════════════════
-- 1) Fungsi bantu ada dan rentangnya benar (tahun ini, tahun ini - 10, lalu NULL NULL NULL):
--    SELECT angkatan_sah(extract(year FROM now())::TEXT), angkatan_sah((extract(year FROM now())::INT - 10)::TEXT),
--           angkatan_sah('1990'), angkatan_sah('abc'), angkatan_sah(NULL);
-- 2) Pemicu daftar sudah versi v44 (harus true):
--    SELECT prosrc LIKE '%Tahun angkatan tidak sah%' FROM pg_proc WHERE proname = 'handle_new_user';
-- 3) Kunci angkatan aktif (harus true) dan tetap SECURITY INVOKER (harus false):
--    SELECT prosrc LIKE '%NEW.angkatan := OLD.angkatan%', prosecdef FROM pg_proc WHERE proname = 'lock_profile_role';
-- 4) Sesudah mahasiswa baru mendaftar, angkatannya terisi:
--    SELECT full_name, angkatan, course_id, class_id FROM profiles WHERE role = 'mahasiswa' ORDER BY created_at DESC LIMIT 5;
-- Mahasiswa lama TIDAK diubah: angkatan kosong tetap kosong dan kelasnya
-- tetap. Kelas mereka berikutnya (sesudah reset tes) memakai tahun saat tes.
