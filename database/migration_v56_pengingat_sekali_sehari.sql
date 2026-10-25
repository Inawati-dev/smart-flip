-- Migration v56 (antrean #342, 25 Okt 2026): pengingat dobel dari dua tab.
-- Johan menjalankan berkas ini di Supabase SQL Editor, SESUDAH v55.
--
-- Kebijakan v55 menolak pengingat kedua dalam 24 jam lewat NOT EXISTS, tetapi
-- dua kiriman yang berjalan bersamaan (dua tab dosen) sama-sama lolos karena
-- belum saling melihat. Indeks unik ini membuat basis data menolak baris kedua
-- dari dosen yang sama ke mahasiswa yang sama pada tanggal yang sama (WIB),
-- apa pun urutannya. Aplikasi menghitung penolakan itu sebagai "gagal" di modal.
-- Baris lama tanpa sender_id (sebelum v55) tidak ikut dibatasi.
--
-- Aman dijalankan berulang. Bila CREATE INDEX gagal karena sudah ada baris
-- dobel, jalankan kueri cek di bawah dulu dan kirim hasilnya; jangan hapus
-- baris tanpa keputusan.

CREATE UNIQUE INDEX IF NOT EXISTS notifications_pengingat_sekali_sehari
  ON notifications (sender_id, user_id, ((created_at AT TIME ZONE 'Asia/Jakarta')::date))
  WHERE type = 'pengingat';

NOTIFY pgrst, 'reload schema';

-- Cek baris dobel (harapan 0 baris):
-- SELECT sender_id, user_id, (created_at AT TIME ZONE 'Asia/Jakarta')::date AS tanggal, count(*)
--   FROM notifications WHERE type = 'pengingat' AND sender_id IS NOT NULL
--   GROUP BY 1, 2, 3 HAVING count(*) > 1;
-- Verifikasi sesudahnya (harapan 1 baris):
-- SELECT indexname FROM pg_indexes WHERE tablename = 'notifications' AND indexname = 'notifications_pengingat_sekali_sehari';
