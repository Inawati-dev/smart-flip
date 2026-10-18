-- SMART-FLIP 5.0 - migration v43: waktu baca dari dua tab dijumlah (antrean #226 butir 4).
--
-- Idempoten, aman dijalankan ulang. Tidak mengubah atau menghapus baris yang ada.
--
-- Masalah: v38 membuat time_spent hanya bisa naik (GREATEST), tetapi aplikasi mengirim angka MUTLAK
-- (baseline + detiknya sendiri). Dua tab dengan baseline sama hanya tercatat yang terbesar, jadi
-- 120 detik + 120 detik menjadi 120, bukan 240.
-- Perbaikan: aplikasi mengirim SELISIH detik lewat fungsi ini, dan basis data yang menjumlahkan.
--
--   - Satu kiriman dibatasi 600 detik (lebih besar dipotong, negatif dianggap 0).
--   - Memakai auth.uid() sebagai pemilik baris; tanpa login ditolak.
--   - Baris dibuat bila belum ada (status/pct/current_page mengikuti default kolom, last_opened = sekarang).
--   - Trigger v38 tetap berlaku: kiriman mutlak lama yang lebih kecil tidak menurunkan angka,
--     dan penambahan lewat fungsi ini lolos trigger karena nilai barunya lebih besar.
--   - Selama v43 belum dijalankan, aplikasi jatuh ke cara lama (kirim angka mutlak).

CREATE OR REPLACE FUNCTION public.tambah_waktu_baca(p_module_id INT, p_detik INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid UUID := auth.uid();
  baru INT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Harus login untuk mencatat waktu baca.' USING ERRCODE = '28000';
  END IF;

  INSERT INTO user_progress AS up (user_id, module_id, time_spent, last_opened)
  VALUES (uid, p_module_id, LEAST(GREATEST(COALESCE(p_detik, 0), 0), 600), now())
  ON CONFLICT (user_id, module_id) DO UPDATE
    SET time_spent  = COALESCE(up.time_spent, 0) + LEAST(GREATEST(COALESCE(p_detik, 0), 0), 600),
        last_opened = now()
  RETURNING up.time_spent INTO baru;

  RETURN baru;
END;
$$;

REVOKE ALL ON FUNCTION public.tambah_waktu_baca(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tambah_waktu_baca(INT, INT) TO authenticated;

-- Supaya PostgREST langsung mengenal fungsi baru.
NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════
--  Verifikasi (jalankan manual di SQL Editor)
-- ════════════════════════════════════════════
-- 1. select proname, prosecdef from pg_proc where proname = 'tambah_waktu_baca';
--      -> 1 baris, prosecdef = true
-- 2. select has_function_privilege('anon', 'public.tambah_waktu_baca(int,int)', 'execute') as anon,
--           has_function_privilege('authenticated', 'public.tambah_waktu_baca(int,int)', 'execute') as login;
--      -> anon = false, login = true
-- 3. Uji tanpa meninggalkan jejak (ganti <uuid-mahasiswa> dan <id-topik>; SQL Editor berjalan sebagai postgres,
--    jadi tiruan login lewat setelan klaim):
--      begin;
--      select set_config('request.jwt.claim.sub', '<uuid-mahasiswa>', true);
--      select set_config('request.jwt.claims', '{"sub":"<uuid-mahasiswa>"}', true);
--      select time_spent from user_progress where user_id = '<uuid-mahasiswa>' and module_id = <id-topik>;   -- catat angka awal
--      select tambah_waktu_baca(<id-topik>, 120);   -- angka awal + 120
--      select tambah_waktu_baca(<id-topik>, 120);   -- angka awal + 240
--      select tambah_waktu_baca(<id-topik>, 5000);  -- bertambah 600 saja
--      rollback;
