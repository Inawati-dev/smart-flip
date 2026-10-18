-- migration_v41b: BAGIAN 2 dari migration_v41_tempatkan_ulang_kelas.sql, tanpa tanda komentar, supaya bisa ditempel utuh.
-- Dijalankan Johan sesudah pratinjau v41 (18 Okt 2026): 3 mahasiswa, 0 pindahan manual, 0 tugas/tes yang perlu dipetakan.
-- Mengubah data dalam satu transaksi; gagal di tengah = seluruhnya batal.

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
