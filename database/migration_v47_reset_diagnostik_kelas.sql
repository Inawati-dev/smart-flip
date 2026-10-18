-- migration_v47_reset_diagnostik_kelas.sql (antrean #255, 18 Okt 2026)
--
-- Laporan Johan: "padahal sudah di reset akun johan tapi masih bisa bebas nih di dashboard".
-- Dua sebab di basis data:
--  1. Reset tes diagnostik (v28) hanya menghapus pengerjaan. Kelas otomatis mahasiswa
--     tetap terpasang, jadi dashboard masih menampilkan "Belajar Mendalam A".
--  2. Reset ditolak diam-diam (0 baris) bila kelas otomatis mahasiswa dimiliki dosen
--     lain, padahal pemilik kelas otomatis seharusnya pengampu mata kuliah (v40).
--
-- Berkas ini:
--  A. Fungsi reset_diagnostik_mahasiswa(ids, course): menghapus tes diagnostik mata
--     kuliah itu DAN mengeluarkan mahasiswa dari kelas otomatis mata kuliah itu, supaya
--     ia kembali ke daftar "belum tes", diarahkan ke tes saat masuk, lalu ditempatkan
--     ulang oleh pemicu v40 sesudah tes. Hanya untuk mahasiswa milik dosen pemanggil.
--  B. Pemilik kelas otomatis diselaraskan dengan pengampu mata kuliah (LANGKAH 2,
--     pratinjau dulu). Kelas buatan dosen (golongan kosong) tidak disentuh.
-- Aman dijalankan ulang.

-- ════════════════════════════════════════════
--  LANGKAH 1 (pratinjau, boleh dijalankan sendiri dulu): kelas otomatis yang pemiliknya
--  bukan pengampu mata kuliahnya. Baris-baris inilah yang diubah LANGKAH 2.
-- ════════════════════════════════════════════
-- select co.name as mata_kuliah, c.name as kelas, c.angkatan, pk.full_name as pemilik_sekarang,
--        pp.full_name as pengampu, (select count(*) from profiles p where p.class_id = c.id) as mahasiswa
-- from classes c join courses co on co.id = c.course_id
-- left join profiles pk on pk.id = c.dosen_id left join profiles pp on pp.id = co.dosen_id
-- where c.golongan is not null and co.dosen_id is not null and c.dosen_id is distinct from co.dosen_id;

-- ════════════════════════════════════════════
--  A. Reset tes diagnostik + keluarkan dari kelas otomatis
-- ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION reset_diagnostik_mahasiswa(p_ids UUID[], p_course INT)
RETURNS TABLE (dihapus INT, dikeluarkan INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ids UUID[];
  v_hapus INT;
  v_keluar INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dosen') THEN
    RAISE EXCEPTION 'Hanya dosen yang boleh mereset tes diagnostik.' USING ERRCODE = '42501';
  END IF;
  -- Sasaran dihitung sekali sebelum diubah: is_dosen_of bergantung pada kelas mahasiswa.
  SELECT array_agg(p.id) INTO v_ids FROM public.profiles p
   WHERE p.id = ANY(p_ids) AND p.role = 'mahasiswa' AND public.is_dosen_of(p.id);
  IF v_ids IS NULL THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;
  DELETE FROM public.quiz_attempts
   WHERE kind = 'pre' AND course_id = p_course AND user_id = ANY(v_ids);
  GET DIAGNOSTICS v_hapus = ROW_COUNT;
  UPDATE public.profiles p SET class_id = NULL
   WHERE p.id = ANY(v_ids)
     AND p.class_id IN (SELECT c.id FROM public.classes c WHERE c.course_id = p_course AND c.golongan IS NOT NULL);
  GET DIAGNOSTICS v_keluar = ROW_COUNT;
  RETURN QUERY SELECT v_hapus, v_keluar;
END;
$$;
REVOKE ALL ON FUNCTION reset_diagnostik_mahasiswa(UUID[], INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reset_diagnostik_mahasiswa(UUID[], INT) TO authenticated;

-- ════════════════════════════════════════════
--  B. LANGKAH 2: pemilik kelas otomatis = pengampu mata kuliah
-- ════════════════════════════════════════════
UPDATE public.classes c
   SET dosen_id = co.dosen_id
  FROM public.courses co
 WHERE co.id = c.course_id AND c.golongan IS NOT NULL
   AND co.dosen_id IS NOT NULL AND c.dosen_id IS DISTINCT FROM co.dosen_id;

NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════
--  Cek sesudah dijalankan
-- ════════════════════════════════════════════
-- 1) Fungsi ada, SECURITY DEFINER, anon tidak bisa menjalankan (true, false):
--    SELECT prosecdef, has_function_privilege('anon', 'reset_diagnostik_mahasiswa(uuid[],int)', 'execute')
--    FROM pg_proc WHERE proname = 'reset_diagnostik_mahasiswa';
-- 2) Pratinjau LANGKAH 1 sekarang kosong (0 baris).
-- 3) Akun Johan (atau mahasiswa lain): kelas, mata kuliah, dan tes diagnostik per mata kuliah:
--    select p.full_name, p.course_id, c.name as kelas, c.course_id as kelas_mk, pk.full_name as pemilik_kelas,
--           (select string_agg(q.course_id || ':' || q.score, ', ') from quiz_attempts q where q.user_id = p.id and q.kind = 'pre') as tes_diagnostik
--    from profiles p left join classes c on c.id = p.class_id left join profiles pk on pk.id = c.dosen_id
--    where p.full_name ilike 'Johan Iriawan%';
