-- migration_v40_kelas_otomatis.sql (antrean #228, disetujui Johan 18 Okt 2026)
--
-- Kata Johan: "tidak perlu ada kode kelas, melainkan kelas itu otomatis terisi
-- jika lolos dari diagnostik awal ... setiap kelas memiliki kuota 25 mhs ...
-- import mahasiswa juga tidak perlu".
--
-- Keputusan Johan yang dipakai di berkas ini:
--   1. Gerbang daftar = SATU kode per mata kuliah (bukan per kelas). Mahasiswa
--      tanpa kode yang dikenali TIDAK dibuat akunnya (pemicu menolak).
--   2. Mahasiswa yang belum tes diagnostik belum punya kelas.
--   3. Mahasiswa lama diurutkan ulang di berkas TERPISAH (migration_v41).
--   4. Nama kelas: "Jalur Cepat A, B, ..." (skor >= batas) dan
--      "Belajar Mendalam A, B, ..." (skor < batas).
--
-- Desain (alasan lengkap di laporan antrean #228):
--   - Kode mata kuliah disimpan di tabel terkunci course_join_codes, bukan
--     kolom di courses. Alasannya: courses bisa dibaca semua pengguna masuk
--     (policy "all read courses", v23), jadi kolom kode di sana terbaca
--     mahasiswa mana pun. Polanya sama dengan dosen_invite_codes (v6/v16):
--     tabel tanpa policy, pintunya hanya fungsi SECURITY DEFINER.
--   - classes mendapat course_id, golongan ('mahir'|'remedial') dan urutan
--     (1 = A). Kelas otomatis = golongan terisi. Kelas lama (golongan kosong)
--     dibiarkan, karena tugas akhir, tes kelompok, dan paket proposal
--     menyimpan class_ids-nya.
--   - profiles mendapat course_id = mata kuliah tempat mahasiswa mendaftar.
--     profiles.class_id tetap SATU. Akibatnya penempatan hanya mengikuti tes
--     diagnostik mata kuliah pendaftarannya; tes diagnostik mata kuliah lain
--     tidak memindahkan kelas. Mahasiswa yang ikut dua mata kuliah tetap punya
--     satu kelas (kelas mata kuliah pendaftarannya).
--   - Penempatan terjadi saat baris quiz_attempts kind='pre' PERTAMA untuk
--     mahasiswa + mata kuliah itu tersimpan. Indeks unik
--     quiz_attempts_one_pre_post_course (v23) sudah membatasi satu tes
--     diagnostik per mata kuliah; reset dosen (v28) menghapus barisnya, jadi
--     tes sesudah reset dihitung "pertama" lagi dan penempatan diulang.
--   - Aman serentak: pg_advisory_xact_lock per (mata kuliah, golongan) +
--     indeks unik (course_id, golongan, angkatan, urutan) sebagai jaring kedua.
--   - Pemilik kelas otomatis = pengampu mata kuliah (courses.dosen_id). Kalau
--     kosong: dosen yang memiliki kelas terbanyak. Mengatur kode mata kuliah
--     dari aplikasi sekaligus mengisi courses.dosen_id yang kosong; sesudah
--     itu hanya pengampu yang boleh mengganti kodenya.
--   - Angkatan kelas otomatis = tahun saat tes (waktu server), bukan isian
--     profil mahasiswa.
--   - Mahasiswa tidak bisa lagi menghapus/mengubah tes diagnostiknya sendiri
--     (policy quiz_attempts dipecah, bagian 5b); reset tetap lewat dosen.
--   - Pindahan kelas oleh dosen dicatat di kelas_pindahan, supaya
--     migration_v41 tidak menimpanya tanpa sengaja.
--
-- Aman dijalankan ulang. Jalankan di Supabase SQL Editor sesudah v39.

-- ════════════════════════════════════════════
--  1. Kolom baru
-- ════════════════════════════════════════════
ALTER TABLE classes ADD COLUMN IF NOT EXISTS course_id INT REFERENCES courses(id) ON DELETE SET NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS golongan TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS urutan INT;
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_golongan_sah;
ALTER TABLE classes ADD CONSTRAINT classes_golongan_sah CHECK (golongan IS NULL OR golongan IN ('mahir', 'remedial'));
-- Dua penyimpanan bersamaan tidak boleh membuat dua "Jalur Cepat B".
CREATE UNIQUE INDEX IF NOT EXISTS classes_otomatis_unik
  ON classes (course_id, golongan, angkatan, urutan) WHERE golongan IS NOT NULL;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS course_id INT REFERENCES courses(id) ON DELETE SET NULL;

-- ════════════════════════════════════════════
--  2. Kode mata kuliah (tabel terkunci, pola dosen_invite_codes)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS course_join_codes (
  course_id  INT PRIMARY KEY REFERENCES courses(id) ON DELETE CASCADE,
  code       TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9-]{6,20}$'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE course_join_codes ENABLE ROW LEVEL SECURITY;
-- Sengaja tanpa policy dan tanpa GRANT: klien tidak bisa membaca atau menulis.

-- Boleh dipanggil anon (pendaftaran terjadi sebelum ada sesi). Hanya membalas
-- benar/salah; kode dan nama mata kuliah tidak dikirim.
CREATE OR REPLACE FUNCTION verify_course_code(submitted TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_join_codes k
    JOIN public.courses c ON c.id = k.course_id
    WHERE k.code = upper(btrim(COALESCE(submitted, ''))) AND c.is_active
  );
$$;

CREATE OR REPLACE FUNCTION get_course_code(p_course_id INT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dosen') THEN
    RAISE EXCEPTION 'Hanya dosen yang boleh melihat kode mata kuliah.' USING ERRCODE = '42501';
  END IF;
  SELECT code INTO v_code FROM public.course_join_codes WHERE course_id = p_course_id;
  RETURN v_code;
END;
$$;

-- Hanya dosen pengampu mata kuliah itu (courses.dosen_id) yang boleh mengganti,
-- atau dosen mana pun bila pengampunya masih kosong; dosen itu lalu tercatat
-- sebagai pengampu. Kode lama langsung tidak berlaku. (Sanggahan pemeriksa #228 no. 8.)
CREATE OR REPLACE FUNCTION set_course_code(p_course_id INT, p_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code     TEXT := upper(btrim(COALESCE(p_code, '')));
  v_pengampu UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dosen') THEN
    RAISE EXCEPTION 'Hanya dosen yang boleh mengganti kode mata kuliah.' USING ERRCODE = '42501';
  END IF;
  IF v_code !~ '^[A-Z0-9-]{6,20}$' THEN
    RAISE EXCEPTION 'Kode mata kuliah 6 sampai 20 karakter: huruf, angka, atau tanda hubung.' USING ERRCODE = '22023';
  END IF;
  SELECT dosen_id INTO v_pengampu FROM public.courses WHERE id = p_course_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mata kuliah tidak ditemukan.' USING ERRCODE = '22023';
  END IF;
  IF v_pengampu IS NOT NULL AND v_pengampu <> auth.uid() THEN
    RAISE EXCEPTION 'Hanya dosen pengampu mata kuliah ini yang boleh mengganti kodenya.' USING ERRCODE = '42501';
  END IF;
  BEGIN
    INSERT INTO public.course_join_codes (course_id, code, updated_at)
    VALUES (p_course_id, v_code, now())
    ON CONFLICT (course_id) DO UPDATE SET code = EXCLUDED.code, updated_at = now();
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Kode itu sudah dipakai mata kuliah lain.' USING ERRCODE = '23505';
  END;
  -- Mata kuliah tanpa pengampu: dosen yang mengatur kodenya jadi pengampu,
  -- supaya kelas otomatis punya pemilik yang jelas.
  IF v_pengampu IS NULL THEN
    UPDATE public.courses SET dosen_id = auth.uid() WHERE id = p_course_id;
  END IF;
  RETURN v_code;
END;
$$;

-- Supabase memberi EXECUTE fungsi baru di skema public langsung ke anon dan
-- authenticated (default privileges), bukan lewat PUBLIC. Jadi fungsi internal
-- dicabut dari keduanya secara eksplisit, bukan hanya dari PUBLIC.
REVOKE ALL ON FUNCTION verify_course_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_course_code(INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION set_course_code(INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION verify_course_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_course_code(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_course_code(INT, TEXT) TO authenticated;

-- Kode kelas tidak dipakai lagi untuk mendaftar (v33).
DROP FUNCTION IF EXISTS verify_class_code(TEXT);

-- ════════════════════════════════════════════
--  3. Kunci kolom profil dari tulisan klien (v6/v7 + course_id)
-- ════════════════════════════════════════════
-- PERBAIKAN (ditemukan uji pglite antrean #228): versi v6/v7 memakai
-- SECURITY DEFINER. Di dalam fungsi seperti itu current_user = pemilik fungsi
-- (postgres), jadi syarat "current_user NOT IN ('postgres', ...)" tidak pernah
-- terpenuhi dan kuncinya tidak pernah bekerja: mahasiswa bisa mengganti role
-- dan class_id-nya sendiri dari konsol peramban. Versi ini SECURITY INVOKER
-- (bawaan), sehingga current_user = peran pemanggil ('authenticated' dari
-- peramban). Fungsi SECURITY DEFINER milik postgres (penempatan, pindah kelas)
-- dan SQL Editor tetap boleh mengubah.
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
      NEW.course_id := OLD.course_id;  -- v40: mata kuliah pendaftaran tidak bisa diganti sendiri
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

-- ════════════════════════════════════════════
--  4. Pengampu dan hak lihat dosen
-- ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION pengampu_mk(p_course INT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT COALESCE(
    (SELECT dosen_id FROM public.courses WHERE id = p_course),
    -- shortcut: mata kuliah tanpa pengampu ikut dosen dengan kelas terbanyak; isi courses.dosen_id supaya pasti.
    (SELECT c.dosen_id FROM public.classes c WHERE c.dosen_id IS NOT NULL
      GROUP BY c.dosen_id ORDER BY count(*) DESC, min(c.created_at) LIMIT 1)
  );
$$;
REVOKE ALL ON FUNCTION pengampu_mk(INT) FROM PUBLIC, anon, authenticated;

-- v13 + v40: dosen juga melihat mahasiswa mata kuliahnya yang belum punya
-- kelas (belum tes diagnostik), supaya daftar "belum tes" bisa tampil.
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
  ) OR EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = student_id AND p.class_id IS NULL AND p.course_id IS NOT NULL
      AND pengampu_mk(p.course_id) = auth.uid()
  );
$$;

-- ════════════════════════════════════════════
--  5. Penempatan otomatis
-- ════════════════════════════════════════════
-- 1 -> A, 26 -> Z, 27 -> AA.
CREATE OR REPLACE FUNCTION huruf_kelas(n INT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE WHEN n <= 26 THEN chr(64 + n) ELSE chr(64 + (n - 1) / 26) || chr(65 + (n - 1) % 26) END;
$$;

-- Tempatkan satu mahasiswa ke kelas otomatis mata kuliah p_course berdasarkan
-- skor diagnostiknya. Dipakai pemicu di bawah dan migration_v41. Tidak
-- dibuka ke klien.
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
  -- Angkatan kelas = tahun saat tes. Bukan profiles.angkatan: kolom itu diisi
  -- mahasiswa sendiri, jadi bisa dipakai memilih kelas atau membuat kelas baru
  -- (sanggahan pemeriksa #228 no. 2). Pemicu mengirim now() dari server.
  v_angkatan := extract(year FROM COALESCE(p_waktu, now()))::INT;

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
    -- Kode kelas tidak dipakai mendaftar lagi, tetapi classes.code tetap UNIQUE.
    -- Kode yang sudah dipakai (mis. kelas buatan tangan) diberi akhiran acak.
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

CREATE OR REPLACE FUNCTION tempatkan_dari_tes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_course_mhs INT;
BEGIN
  IF NEW.user_id IS NULL OR NEW.course_id IS NULL THEN
    RETURN NULL;
  END IF;
  -- Hanya tes diagnostik PERTAMA mata kuliah ini yang menempatkan.
  IF EXISTS (
    SELECT 1 FROM public.quiz_attempts
    WHERE user_id = NEW.user_id AND kind = 'pre' AND course_id = NEW.course_id AND id <> NEW.id
  ) THEN
    RETURN NULL;
  END IF;
  -- Tes mata kuliah lain tidak memindahkan kelas (profiles.class_id hanya satu).
  -- Akun lama tanpa course_id: mata kuliah tes pertamanya yang dipakai.
  SELECT course_id INTO v_course_mhs FROM public.profiles WHERE id = NEW.user_id;
  IF v_course_mhs IS NOT NULL AND v_course_mhs <> NEW.course_id THEN
    RETURN NULL;
  END IF;
  -- Gagal menempatkan tidak boleh membatalkan simpan tes mahasiswa.
  BEGIN
    -- now(), bukan NEW.attempted_at: waktu itu dikirim peramban dan bisa dipalsukan.
    PERFORM public.tempatkan_mahasiswa(NEW.user_id, NEW.course_id, NEW.score, now());
  EXCEPTION WHEN OTHERS THEN
    -- Tidak diam: tercatat di Supabase > Logs > Postgres, dan mahasiswa itu
    -- muncul di daftar "belum tes" dosen walau skornya tersimpan.
    RAISE WARNING 'SMARTFLIP kelas otomatis GAGAL: mahasiswa %, mata kuliah %, skor %: % (SQLSTATE %)',
      NEW.user_id, NEW.course_id, NEW.score, SQLERRM, SQLSTATE;
  END;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION tempatkan_dari_tes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS quiz_attempts_tempatkan_kelas ON quiz_attempts;
CREATE TRIGGER quiz_attempts_tempatkan_kelas
  AFTER INSERT ON quiz_attempts
  FOR EACH ROW WHEN (NEW.kind = 'pre')
  EXECUTE FUNCTION tempatkan_dari_tes();

-- ════════════════════════════════════════════
--  5b. Mahasiswa tidak bisa menghapus atau mengubah tes diagnostiknya sendiri
-- ════════════════════════════════════════════
-- Policy lama "user manage own attempts" (schema.sql, FOR ALL) mengizinkan
-- mahasiswa menghapus baris kind='pre' miliknya lalu menyimpan tes baru, yang
-- dihitung "pertama" lagi dan memilih ulang kelas (sanggahan pemeriksa #228
-- no. 2). Dipecah: baca dan tambah tetap; ubah dan hapus hanya untuk baris
-- selain 'pre' (aplikasi tidak pernah mengubah atau menghapus pengerjaan dari
-- sisi mahasiswa). Reset oleh dosen tetap lewat policy
-- "dosen reset own class pretest" (v28).
-- BATAS yang sudah ada sebelum v40 dan TIDAK diperbaiki di sini: skor dihitung
-- di peramban lalu dikirim, jadi mahasiswa yang paham konsol bisa menyimpan
-- skor palsu pada tes diagnostik pertamanya.
DROP POLICY IF EXISTS "user manage own attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "user read own attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "user insert own attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "user update own non-pre attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "user delete own non-pre attempts" ON quiz_attempts;
CREATE POLICY "user read own attempts" ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user insert own attempts" ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user update own non-pre attempts" ON quiz_attempts FOR UPDATE
  USING (auth.uid() = user_id AND kind <> 'pre') WITH CHECK (auth.uid() = user_id AND kind <> 'pre');
CREATE POLICY "user delete own non-pre attempts" ON quiz_attempts FOR DELETE
  USING (auth.uid() = user_id AND kind <> 'pre');

-- ════════════════════════════════════════════
--  6. Dosen memindahkan mahasiswa antar kelas (modal di halaman Kelas)
-- ════════════════════════════════════════════
-- Tiap pindahan dicatat, supaya migration_v41 BAGIAN 2 (urut ulang semua) bisa
-- berhenti sebelum menimpa pindahan dosen (sanggahan pemeriksa #228 no. 5).
CREATE TABLE IF NOT EXISTS kelas_pindahan (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dari_kelas  UUID REFERENCES classes(id) ON DELETE SET NULL,
  ke_kelas    UUID REFERENCES classes(id) ON DELETE SET NULL,
  oleh        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  dibuat      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ditimpa_v41 TIMESTAMPTZ
);
ALTER TABLE kelas_pindahan ENABLE ROW LEVEL SECURITY;
-- Tanpa policy dan tanpa GRANT: hanya fungsi di bawah dan SQL Editor yang menulis/membaca.

CREATE OR REPLACE FUNCTION pindah_mahasiswa(p_user UUID, p_class UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_kelas  public.classes%ROWTYPE;
  v_jumlah INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dosen') THEN
    RAISE EXCEPTION 'Hanya dosen yang boleh memindahkan mahasiswa.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_kelas FROM public.classes WHERE id = p_class AND dosen_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kelas tujuan bukan milik Anda.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user AND role = 'mahasiswa') OR NOT public.is_dosen_of(p_user) THEN
    RAISE EXCEPTION 'Mahasiswa ini tidak ada di kelas atau mata kuliah Anda.' USING ERRCODE = '42501';
  END IF;
  IF v_kelas.course_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(228, v_kelas.course_id * 2 + CASE WHEN v_kelas.golongan = 'mahir' THEN 1 ELSE 0 END);
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user AND class_id = p_class) THEN
    RETURN;
  END IF;
  SELECT count(*) INTO v_jumlah FROM public.profiles WHERE class_id = p_class;
  IF v_jumlah >= v_kelas.max_students THEN
    RAISE EXCEPTION 'Kelas % sudah penuh (% dari %).', v_kelas.name, v_jumlah, v_kelas.max_students USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.kelas_pindahan (user_id, dari_kelas, ke_kelas, oleh)
  SELECT p_user, class_id, p_class, auth.uid() FROM public.profiles WHERE id = p_user;
  UPDATE public.profiles SET class_id = p_class, course_id = COALESCE(v_kelas.course_id, course_id) WHERE id = p_user;
END;
$$;
REVOKE ALL ON FUNCTION pindah_mahasiswa(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION pindah_mahasiswa(UUID, UUID) TO authenticated;

-- ════════════════════════════════════════════
--  7. Pendaftaran: kode mata kuliah wajib bagi mahasiswa
-- ════════════════════════════════════════════
-- Isi sama dengan v36, kecuali: kode kelas tidak dibaca lagi, dan mahasiswa
-- tanpa kode mata kuliah yang dikenali DITOLAK (akun tidak dibuat; Supabase
-- membalas "Database error saving new user"). Akibatnya akun mahasiswa juga
-- tidak bisa lagi dibuat lewat Dashboard > Authentication > Add user tanpa
-- metadata; pakai halaman daftar dengan kode mata kuliah.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role   TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'mahasiswa');
  submitted_code   TEXT := NEW.raw_user_meta_data->>'dosen_invite_code';
  real_code        TEXT;
  final_role       TEXT := 'mahasiswa';
  submitted_course TEXT := upper(btrim(COALESCE(NEW.raw_user_meta_data->>'course_code', '')));
  final_course     INT := NULL;
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
  END IF;

  INSERT INTO public.profiles (id, full_name, role, class_id, course_id, nim_nidn)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengguna Baru'),
    final_role,
    NULL,
    final_course,
    NULLIF(trim(NEW.raw_user_meta_data->>'nim_nidn'), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ════════════════════════════════════════════
--  8. Hapus akun (v34): ikut mencakup mahasiswa mata kuliah yang belum berkelas
-- ════════════════════════════════════════════
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
    WHERE p.id = ANY(p_ids)
      AND p.role = 'mahasiswa'
      AND public.is_dosen_of(p.id)
  ), terhapus AS (
    DELETE FROM auth.users u USING sasaran s WHERE u.id = s.id RETURNING u.id
  )
  SELECT count(*) INTO jumlah FROM terhapus;

  RETURN jumlah;
END;
$$;
REVOKE ALL ON FUNCTION hapus_mahasiswa(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION hapus_mahasiswa(UUID[]) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════
--  Cek sesudah dijalankan
-- ════════════════════════════════════════════
-- 1) Kolom dan pemicu baru ada (harus 4 baris):
--    SELECT table_name, column_name FROM information_schema.columns
--    WHERE (table_name = 'classes' AND column_name IN ('course_id','golongan','urutan'))
--       OR (table_name = 'profiles' AND column_name = 'course_id');
--    SELECT tgname FROM pg_trigger WHERE tgname = 'quiz_attempts_tempatkan_kelas';   -- 1 baris
-- 2) Mata kuliah tanpa pengampu (sebaiknya 0 baris; isi lewat
--    UPDATE courses SET dosen_id = '<uuid dosen>' WHERE id = <id>;):
--    SELECT id, code, name FROM courses WHERE dosen_id IS NULL;
-- 3) Kode mata kuliah belum ada sampai dosen mengaturnya di halaman Kelas.
--    Sebelum ada kode, mahasiswa baru TIDAK bisa mendaftar:
--    SELECT c.code, c.name, k.code AS kode_daftar FROM courses c LEFT JOIN course_join_codes k ON k.course_id = c.id;
-- 4) select verify_course_code('KODE-SALAH');   -- false
-- 4b) Karena kunci peran v6/v7 tadinya tidak bekerja (lihat bagian 3),
--    periksa daftar akun dosen; semua nama harus dosen sungguhan:
--    SELECT id, full_name, nim_nidn, created_at FROM profiles WHERE role = 'dosen' ORDER BY created_at;
-- 4c) Policy tes milik mahasiswa sudah dipecah (harus 4 baris, tanpa "user manage own attempts"):
--    SELECT policyname, cmd FROM pg_policies WHERE tablename = 'quiz_attempts' AND policyname LIKE 'user %';
-- 5) Lanjut ke migration_v41_tempatkan_ulang_kelas.sql (bagian 1 dulu: pratinjau).
