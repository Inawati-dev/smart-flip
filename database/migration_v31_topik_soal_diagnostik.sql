-- v31 (antrean #142 opsi B, 10 Okt 2026): tanda topik pada soal tes diagnostik.
-- Dipakai layar hasil mahasiswa untuk menampilkan jumlah benar per topik.
-- Kolom terpisah dari module_id karena module_id dikunci hanya untuk soal
-- formatif (CHECK di migration_v17). Soal tanpa tanda tetap sah.
-- Aman dijalankan ulang.

ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS topik_id INT REFERENCES modules(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
