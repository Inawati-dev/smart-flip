-- migration_v41_tempatkan_ulang_kelas.sql (antrean #228, keputusan Johan 18 Okt 2026:
-- "mahasiswa lama yang sudah punya kelas diurutkan ulang semua memakai skor
-- diagnostik yang ada; yang belum punya skor kehilangan kelas sampai tes";
-- untuk tugas dan tes yang ditujukan ke kelas lama: "Ke kelas baru mahasiswanya").
--
-- Syarat: migration_v40_kelas_otomatis.sql sudah dijalankan.
--
-- Berkas ini DUA BAGIAN. Jalankan BAGIAN 1 saja dulu (hanya membaca, tidak
-- mengubah apa pun), periksa angkanya, baru jalankan BAGIAN 2.
--
-- Aturan yang dipakai (sama dengan pemicu di v40):
--   - Mata kuliah tiap mahasiswa = profiles.course_id; kalau kosong, mata
--     kuliah tes diagnostik PERTAMA-nya (waktu paling awal).
--   - Skor = tes diagnostik PERTAMA di mata kuliah itu. Skor >= batas mata
--     kuliah (courses.ambang_diagnostik, bawaan 80) = Jalur Cepat, di bawahnya
--     = Belajar Mendalam. Tiap kelas paling banyak 25; urutan masuk = urutan
--     waktu mengerjakan tes (yang lebih dulu mengisi kelas A).
--   - Angkatan kelas = tahun saat tes dikerjakan.
--   - Mahasiswa tanpa skor: class_id dikosongkan. course_id-nya diisi bila
--     bisa ditebak dengan pasti: dosen kelas lamanya mengampu tepat satu mata
--     kuliah. Selain itu course_id tetap kosong; mahasiswa itu tidak tampil di
--     halaman Kelas dosen sampai ia mengerjakan tes diagnostik.
--   - Kelas lama TIDAK dihapus. Tugas akhir/paket proposal
--     (tugas_akhir_briefs.class_ids) dan tes khusus (test_sessions.class_ids)
--     yang menyebut kelas lama diarahkan ke kelas BARU mantan anggotanya: tiap
--     id kelas lama diganti himpunan kelas otomatis tempat anggotanya
--     dipindah (tanpa duplikat). Kelas lama yang tidak punya anggota berskor
--     dibiarkan di daftar. class_ids kosong ('{}' = semua kelas) tidak disentuh.
--     Hanya dua tabel itu yang menyimpan id kelas (dicek: grep class_ids
--     database/*.sql); group_sessions dan observasi_tugas tidak.

-- ════════════════════════════════════════════
--  BAGIAN 1 — PRATINJAU (hanya membaca, satu tabel hasil)
-- ════════════════════════════════════════════
-- Kolom: bagian, rincian, jumlah. Bagian:
--   1 sebaran kelas baru · 2 kelas lama yang jadi kosong · 3 dampak per dosen
--   (pemilik kelas lama -> pemilik kelas baru) · 4 mahasiswa dengan tes di
--   lebih dari satu mata kuliah · 5 baris class_ids yang akan dipetakan ·
--   6 contoh pemetaan kelas lama -> kelas baru · 7 tanpa skor dan tanpa mata
--   kuliah · 8 pindahan manual dosen yang akan tertimpa.
WITH tes_pertama AS (
  SELECT DISTINCT ON (qa.user_id, qa.course_id) qa.user_id, qa.course_id, qa.score, qa.attempted_at
  FROM quiz_attempts qa
  WHERE qa.kind = 'pre' AND qa.course_id IS NOT NULL
  ORDER BY qa.user_id, qa.course_id, qa.attempted_at, qa.id
), mhs AS (
  SELECT p.id, p.full_name, p.course_id, p.class_id AS kelas_lama, c.dosen_id AS dosen_lama
  FROM profiles p
  LEFT JOIN classes c ON c.id = p.class_id
  WHERE p.role = 'mahasiswa'
), sasaran AS (
  SELECT m.*,
         COALESCE(
           m.course_id,
           (SELECT t.course_id FROM tes_pertama t WHERE t.user_id = m.id ORDER BY t.attempted_at LIMIT 1),
           (SELECT min(co.id) FROM courses co WHERE co.dosen_id = m.dosen_lama HAVING count(*) = 1)
         ) AS mk
  FROM mhs m
), hasil AS (
  SELECT s.*, t.score, t.attempted_at,
         CASE WHEN t.score IS NULL THEN NULL
              WHEN t.score >= COALESCE(co.ambang_diagnostik, 80) THEN 'mahir' ELSE 'remedial' END AS gol,
         extract(year FROM t.attempted_at)::INT AS angkatan
  FROM sasaran s
  LEFT JOIN tes_pertama t ON t.user_id = s.id AND t.course_id = s.mk
  LEFT JOIN courses co ON co.id = s.mk
), rencana AS (
  -- Sama dengan BAGIAN 2: semua dilepas dulu, lalu diisi urut waktu tes, 25 per kelas.
  SELECT h.*,
         CASE WHEN h.gol IS NOT NULL THEN ((row_number() OVER (PARTITION BY h.mk, h.gol, h.angkatan ORDER BY h.attempted_at, h.id) - 1) / 25 + 1)::INT END AS urutan
  FROM hasil h
), rencana2 AS (
  SELECT r.*,
         CASE r.gol WHEN 'mahir' THEN 'Jalur Cepat ' WHEN 'remedial' THEN 'Belajar Mendalam ' END || huruf_kelas(r.urutan) AS kelas_baru,
         CASE WHEN r.gol IS NOT NULL THEN COALESCE(
           (SELECT c.dosen_id FROM classes c WHERE c.course_id = r.mk AND c.golongan = r.gol AND c.angkatan = r.angkatan AND c.urutan = r.urutan),
           pengampu_mk(r.mk)) END AS dosen_baru
  FROM rencana r
), kelas_dipetakan AS (
  SELECT DISTINCT kelas_lama FROM rencana2 WHERE kelas_lama IS NOT NULL AND gol IS NOT NULL
)
SELECT bagian, rincian, jumlah FROM (
  SELECT '1 sebaran kelas baru' AS bagian,
         COALESCE(co.code, '(tanpa mata kuliah)') || ' · ' || COALESCE(r.kelas_baru || ' · ' || r.angkatan, 'tanpa skor: kelas dikosongkan') AS rincian,
         count(*)::INT AS jumlah
  FROM rencana2 r LEFT JOIN courses co ON co.id = r.mk
  GROUP BY co.code, r.kelas_baru, r.angkatan
  UNION ALL
  SELECT '2 kelas lama jadi kosong', c.name || ' · ' || c.angkatan || ' · ' || c.code, count(p.id)::INT
  FROM classes c JOIN profiles p ON p.class_id = c.id AND p.role = 'mahasiswa'
  WHERE c.golongan IS NULL
  GROUP BY c.id, c.name, c.angkatan, c.code
  UNION ALL
  SELECT '3 dampak per dosen',
         COALESCE(dl.full_name, '(tanpa kelas)') || ' -> ' || COALESCE(db.full_name, '(tanpa kelas)'),
         count(*)::INT
  FROM rencana2 r
  LEFT JOIN profiles dl ON dl.id = r.dosen_lama
  LEFT JOIN profiles db ON db.id = r.dosen_baru
  GROUP BY dl.full_name, db.full_name
  UNION ALL
  SELECT '4 tes di >1 mata kuliah',
         COALESCE(r.full_name, '(tanpa nama)') || ': tes di ' ||
           (SELECT string_agg(co.code, ', ' ORDER BY t.attempted_at) FROM tes_pertama t JOIN courses co ON co.id = t.course_id WHERE t.user_id = r.id) ||
           '; kelas dari ' || COALESCE((SELECT code FROM courses WHERE id = r.mk), '-'),
         1
  FROM rencana2 r
  WHERE (SELECT count(*) FROM tes_pertama t WHERE t.user_id = r.id) > 1
  UNION ALL
  SELECT '5 class_ids dipetakan', 'test_sessions (tes khusus)', count(*)::INT
  FROM test_sessions WHERE class_ids <> '{}' AND class_ids && ARRAY(SELECT kelas_lama FROM kelas_dipetakan)
  UNION ALL
  SELECT '5 class_ids dipetakan', 'tugas_akhir_briefs (tugas akhir, paket proposal)', count(*)::INT
  FROM tugas_akhir_briefs WHERE class_ids <> '{}' AND class_ids && ARRAY(SELECT kelas_lama FROM kelas_dipetakan)
  UNION ALL
  SELECT '6 contoh pemetaan', c.name || ' · ' || c.angkatan || ' -> ' ||
           string_agg(DISTINCT COALESCE(co.code, '?') || ' ' || r.kelas_baru || ' · ' || r.angkatan, ', '),
         count(*)::INT
  FROM rencana2 r JOIN classes c ON c.id = r.kelas_lama LEFT JOIN courses co ON co.id = r.mk
  WHERE r.gol IS NOT NULL
  GROUP BY c.id, c.name, c.angkatan
  UNION ALL
  SELECT '7 tanpa skor dan tanpa mata kuliah', 'tidak tampil di halaman Kelas sampai tes', count(*)::INT
  FROM rencana2 WHERE gol IS NULL AND mk IS NULL
  UNION ALL
  SELECT '8 pindahan manual dosen yang akan tertimpa', 'BAGIAN 2 berhenti bila angka ini > 0', count(*)::INT
  FROM kelas_pindahan WHERE ditimpa_v41 IS NULL
) x
ORDER BY bagian, rincian;

-- ════════════════════════════════════════════
--  BAGIAN 2 — PENEMPATAN ULANG (mengubah data, satu transaksi)
-- ════════════════════════════════════════════
-- !!! PERINGATAN: BAGIAN 2 MENGURUTKAN ULANG SEMUA MAHASISWA. Pindahan kelas
-- !!! yang dilakukan dosen lewat halaman Kelas sesudah v40 IKUT TERTIMPA.
-- !!! Karena itu blok ini BERHENTI sendiri bila ada pindahan manual yang belum
-- !!! pernah tertimpa (bagian 8 pratinjau). Kalau memang ingin menimpanya,
-- !!! buka komentar baris SET LOCAL v41.timpa_pindahan di bawah.
--
-- Hapus tanda komentar /* dan */ di bawah, lalu jalankan HANYA blok ini.
-- Gagal di tengah = seluruhnya batal (tidak ada perubahan setengah jalan).
/*
BEGIN;
-- SET LOCAL v41.timpa_pindahan = 'ya';

DO $$
DECLARE
  n INT;
BEGIN
  SELECT count(*) INTO n FROM kelas_pindahan WHERE ditimpa_v41 IS NULL;
  IF n > 0 AND COALESCE(current_setting('v41.timpa_pindahan', true), '') <> 'ya' THEN
    RAISE EXCEPTION 'Berhenti: ada % pindahan kelas manual oleh dosen yang akan tertimpa. Periksa: SELECT * FROM kelas_pindahan WHERE ditimpa_v41 IS NULL; lalu buka komentar SET LOCAL v41.timpa_pindahan bila tetap lanjut.', n;
  END IF;
END $$;

CREATE TEMP TABLE v41_sasaran ON COMMIT DROP AS
WITH tes_pertama AS (
  SELECT DISTINCT ON (qa.user_id, qa.course_id) qa.user_id, qa.course_id, qa.score, qa.attempted_at
  FROM quiz_attempts qa
  WHERE qa.kind = 'pre' AND qa.course_id IS NOT NULL
  ORDER BY qa.user_id, qa.course_id, qa.attempted_at, qa.id
), mhs AS (
  SELECT p.id, p.class_id AS kelas_lama,
         COALESCE(
           p.course_id,
           (SELECT t.course_id FROM tes_pertama t WHERE t.user_id = p.id ORDER BY t.attempted_at LIMIT 1),
           (SELECT min(co.id) FROM courses co WHERE co.dosen_id = c.dosen_id HAVING count(*) = 1)
         ) AS course_id
  FROM profiles p
  LEFT JOIN classes c ON c.id = p.class_id
  WHERE p.role = 'mahasiswa'
)
SELECT m.id, m.kelas_lama, m.course_id, t.score, t.attempted_at
FROM mhs m
LEFT JOIN tes_pertama t ON t.user_id = m.id AND t.course_id = m.course_id;

-- Lepas semua mahasiswa dari kelasnya, isi mata kuliah pendaftarannya.
UPDATE profiles p
SET class_id = NULL, course_id = s.course_id
FROM v41_sasaran s
WHERE p.id = s.id;

-- Tempatkan ulang yang punya skor, urut waktu tes (yang lebih dulu ke kelas A).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM v41_sasaran WHERE score IS NOT NULL ORDER BY attempted_at, id LOOP
    PERFORM tempatkan_mahasiswa(r.id, r.course_id, r.score, r.attempted_at);
  END LOOP;
END $$;

-- Kelas lama -> himpunan kelas baru mantan anggotanya.
CREATE TEMP TABLE v41_peta ON COMMIT DROP AS
SELECT s.kelas_lama, array_agg(DISTINCT p.class_id) AS baru
FROM v41_sasaran s
JOIN profiles p ON p.id = s.id
WHERE s.kelas_lama IS NOT NULL AND p.class_id IS NOT NULL
GROUP BY s.kelas_lama;

UPDATE test_sessions t
SET class_ids = (
  SELECT array_agg(DISTINCT x ORDER BY x)
  FROM unnest(t.class_ids) AS e
  LEFT JOIN v41_peta m ON m.kelas_lama = e
  CROSS JOIN LATERAL unnest(COALESCE(m.baru, ARRAY[e])) AS x
)
WHERE t.class_ids <> '{}' AND t.class_ids && ARRAY(SELECT kelas_lama FROM v41_peta);

UPDATE tugas_akhir_briefs t
SET class_ids = (
  SELECT array_agg(DISTINCT x ORDER BY x)
  FROM unnest(t.class_ids) AS e
  LEFT JOIN v41_peta m ON m.kelas_lama = e
  CROSS JOIN LATERAL unnest(COALESCE(m.baru, ARRAY[e])) AS x
)
WHERE t.class_ids <> '{}' AND t.class_ids && ARRAY(SELECT kelas_lama FROM v41_peta);

UPDATE kelas_pindahan SET ditimpa_v41 = now() WHERE ditimpa_v41 IS NULL;

COMMIT;
*/

-- ════════════════════════════════════════════
--  Cek sesudah BAGIAN 2
-- ════════════════════════════════════════════
-- 1) Sebaran kelas otomatis; tiap baris anggota <= 25, angkanya sama dengan
--    bagian 1 pratinjau:
--    SELECT co.code, c.name, c.angkatan, count(p.id) AS anggota
--    FROM classes c JOIN courses co ON co.id = c.course_id
--    LEFT JOIN profiles p ON p.class_id = c.id
--    WHERE c.golongan IS NOT NULL GROUP BY co.code, c.name, c.angkatan, c.urutan
--    ORDER BY co.code, c.name;
-- 2) Kelas lama sudah kosong (anggota = 0 di semua baris):
--    SELECT c.name, count(p.id) FROM classes c LEFT JOIN profiles p ON p.class_id = c.id
--    WHERE c.golongan IS NULL GROUP BY c.id, c.name;
-- 3) Tugas/tes yang masih menyebut kelas lama (hanya kelas lama yang tidak
--    punya anggota berskor; angka ini boleh > 0):
--    SELECT 'test_sessions' AS tabel, count(*) FROM test_sessions t
--    WHERE EXISTS (SELECT 1 FROM unnest(t.class_ids) e JOIN classes c ON c.id = e WHERE c.golongan IS NULL)
--    UNION ALL
--    SELECT 'tugas_akhir_briefs', count(*) FROM tugas_akhir_briefs t
--    WHERE EXISTS (SELECT 1 FROM unnest(t.class_ids) e JOIN classes c ON c.id = e WHERE c.golongan IS NULL);
-- 4) Mahasiswa tanpa kelas = mahasiswa tanpa skor di pratinjau:
--    SELECT count(*) FROM profiles WHERE role = 'mahasiswa' AND class_id IS NULL;
