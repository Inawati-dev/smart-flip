-- migration_v45_aksi_dosen_akun.sql (antrean #246, disetujui Johan 18 Okt 2026, pilihan "Tombol dosen")
--
-- Masalah: mahasiswa yang mendaftar dengan email rekaan tidak pernah menerima
-- surel konfirmasi, jadi tidak bisa masuk ("Email belum dikonfirmasi").
-- Berkas ini memberi dosen PENGAMPU (is_dosen_of, v13/v40) tiga fungsi untuk
-- mahasiswanya sendiri, dipanggil dari halaman Kelas lewat modal:
--   1. status_konfirmasi_mahasiswa(ids) : mana yang emailnya belum dikonfirmasi
--   2. konfirmasi_akun_mahasiswa(ids)   : isi auth.users.email_confirmed_at
--   3. atur_sandi_mahasiswa(id, sandi)  : ganti kata sandi dengan sandi sementara
-- Hapus akun tetap lewat hapus_mahasiswa (v34/v40), tidak diubah di sini.
--
-- Pengaman di setiap fungsi: pemanggil berperan dosen, target berperan
-- mahasiswa, dan is_dosen_of(target) (mahasiswa di kelas dosen itu, atau
-- mahasiswa mata kuliah yang dia ampu yang belum berkelas). Target lain
-- diabaikan diam-diam (fungsi daftar) atau ditolak (fungsi satu orang).
--
-- Kata sandi tidak pernah dikembalikan, disimpan polos, atau ditulis ke
-- tabel lain; yang disimpan hanya hash bcrypt di auth.users.encrypted_password,
-- format yang sama dengan yang dibuat Supabase Auth sendiri. Batas: argumen
-- RPC tetap lewat PostgREST, jadi bila log pernyataan Postgres dinyalakan
-- penuh (log_statement = 'all'), panggilan bisa tercatat di log server.
-- Bawaan Supabase tidak mencatat argumen fungsi.
--
-- Syarat: pgcrypto terpasang di skema `extensions` (bawaan semua proyek
-- Supabase). Cek dulu (harus 1 baris, schema = extensions):
--   SELECT e.extname, n.nspname AS schema FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pgcrypto';
-- Bila kosong: CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
-- Aman dijalankan ulang.

-- ════════════════════════════════════════════
--  1. Status konfirmasi (baca saja)
-- ════════════════════════════════════════════
-- Mengembalikan hanya mahasiswa milik dosen pemanggil dari daftar p_ids.
CREATE OR REPLACE FUNCTION status_konfirmasi_mahasiswa(p_ids UUID[])
RETURNS TABLE (id UUID, terkonfirmasi BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND role = 'dosen') THEN
    RAISE EXCEPTION 'Hanya dosen yang boleh melihat status konfirmasi akun.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT u.id, u.email_confirmed_at IS NOT NULL
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE u.id = ANY(p_ids) AND p.role = 'mahasiswa' AND public.is_dosen_of(u.id);
END;
$$;

-- ════════════════════════════════════════════
--  2. Konfirmasi akun
-- ════════════════════════════════════════════
-- Hanya mengisi yang masih kosong. Mengembalikan jumlah akun yang berubah.
-- (auth.users.confirmed_at di Supabase adalah kolom turunan; tidak disentuh.)
CREATE OR REPLACE FUNCTION konfirmasi_akun_mahasiswa(p_ids UUID[])
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  jumlah INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dosen') THEN
    RAISE EXCEPTION 'Hanya dosen yang boleh mengonfirmasi akun mahasiswa.' USING ERRCODE = '42501';
  END IF;
  UPDATE auth.users u
  SET email_confirmed_at = now(), updated_at = now()
  FROM public.profiles p
  WHERE p.id = u.id
    AND u.id = ANY(p_ids)
    AND u.email_confirmed_at IS NULL
    AND p.role = 'mahasiswa'
    AND public.is_dosen_of(u.id);
  GET DIAGNOSTICS jumlah = ROW_COUNT;
  RETURN jumlah;
END;
$$;

-- ════════════════════════════════════════════
--  3. Atur ulang kata sandi
-- ════════════════════════════════════════════
-- Minimal 8 karakter (sama dengan halaman daftar). bcrypt biaya 10, sama
-- dengan Supabase Auth. Tidak mengembalikan apa pun.
CREATE OR REPLACE FUNCTION atur_sandi_mahasiswa(p_id UUID, p_sandi TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dosen') THEN
    RAISE EXCEPTION 'Hanya dosen yang boleh mengatur ulang kata sandi mahasiswa.' USING ERRCODE = '42501';
  END IF;
  -- bcrypt hanya memakai 72 byte pertama; sandi yang isinya spasi saja ditolak.
  IF p_sandi IS NULL OR length(p_sandi) < 8 OR btrim(p_sandi) = '' OR octet_length(p_sandi) > 72 THEN
    RAISE EXCEPTION 'Kata sandi sementara minimal 8 karakter, paling banyak 72 byte, dan tidak boleh hanya spasi.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_id AND role = 'mahasiswa') OR NOT public.is_dosen_of(p_id) THEN
    RAISE EXCEPTION 'Mahasiswa ini tidak ada di kelas atau mata kuliah Anda.' USING ERRCODE = '42501';
  END IF;
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_sandi, extensions.gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = p_id;
END;
$$;

-- ════════════════════════════════════════════
--  4. Kunci pengampu mata kuliah
-- ════════════════════════════════════════════
-- Policy "dosen manage courses" (v23) mengizinkan dosen mana pun mengubah
-- baris courses, termasuk dosen_id. Tanpa kunci ini dosen lain bisa menulis
-- dirinya sebagai pengampu, lalu mahasiswa mata kuliah itu yang belum berkelas
-- ikut dianggap "miliknya" oleh is_dosen_of dan sandinya bisa diganti
-- (sanggahan pemeriksa #246 no. 1). Dari aplikasi, pengampu hanya boleh diubah
-- oleh pengampu sendiri, atau diisi diri sendiri bila masih kosong
-- (set_course_code, v40). SQL Editor (auth.uid() kosong) tidak dibatasi.
CREATE OR REPLACE FUNCTION kunci_pengampu_mata_kuliah()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.dosen_id IS DISTINCT FROM OLD.dosen_id
     AND NOT (OLD.dosen_id = auth.uid() OR (OLD.dosen_id IS NULL AND NEW.dosen_id = auth.uid())) THEN
    RAISE EXCEPTION 'Hanya dosen pengampu yang boleh mengganti pengampu mata kuliah ini.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS kunci_pengampu_mata_kuliah ON courses;
CREATE TRIGGER kunci_pengampu_mata_kuliah BEFORE UPDATE OF dosen_id ON courses
  FOR EACH ROW EXECUTE FUNCTION kunci_pengampu_mata_kuliah();

-- Supabase memberi EXECUTE fungsi baru langsung ke anon dan authenticated
-- (default privileges), jadi anon dicabut eksplisit, bukan hanya PUBLIC.
REVOKE ALL ON FUNCTION status_konfirmasi_mahasiswa(UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION konfirmasi_akun_mahasiswa(UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION atur_sandi_mahasiswa(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION status_konfirmasi_mahasiswa(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION konfirmasi_akun_mahasiswa(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION atur_sandi_mahasiswa(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════
--  Cek sesudah dijalankan
-- ════════════════════════════════════════════
-- 1) Tiga fungsi ada dan SECURITY DEFINER (3 baris, prosecdef = true):
--    SELECT proname, prosecdef FROM pg_proc WHERE proname IN
--      ('status_konfirmasi_mahasiswa', 'konfirmasi_akun_mahasiswa', 'atur_sandi_mahasiswa');
-- 2) anon tidak bisa menjalankan (3 baris false):
--    SELECT p, has_function_privilege('anon', p, 'execute') FROM unnest(ARRAY[
--      'status_konfirmasi_mahasiswa(uuid[])', 'konfirmasi_akun_mahasiswa(uuid[])', 'atur_sandi_mahasiswa(uuid,text)']) p;
-- 3) Hash buatan pgcrypto dikenali (harus true):
--    SELECT extensions.crypt('uji-sandi-1', h) = h FROM (SELECT extensions.crypt('uji-sandi-1', extensions.gen_salt('bf', 10)) AS h) x;
-- 4) Pemicu kunci pengampu terpasang (1 baris):
--    SELECT tgname FROM pg_trigger WHERE tgname = 'kunci_pengampu_mata_kuliah';
-- 5) Mahasiswa yang belum dikonfirmasi (sebelum dan sesudah dosen menekan tombol):
--    SELECT p.full_name, u.email, u.email_confirmed_at FROM auth.users u JOIN profiles p ON p.id = u.id
--    WHERE p.role = 'mahasiswa' AND u.email_confirmed_at IS NULL;
