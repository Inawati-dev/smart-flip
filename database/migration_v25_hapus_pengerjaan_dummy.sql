-- SMART-FLIP 5.0 - migration v25: hapus riwayat pengerjaan akun dummy
-- (antrean #71, keputusan Johan 16 Sep 2026: "kerjakan #71").
--
-- Tabel "Tes formatif per topik" dan grafik di Asesmen membaca quiz_attempts
-- sungguhan. Angka yang tampil selama ini berasal dari 20 akun dummy
-- "Mahasiswa Dummy 01" sampai "Mahasiswa Dummy 20" (kelas A sampai D,
-- dibuat 24 Jul 2026). Berkas ini menghapus riwayat pengerjaan, progres
-- baca, dan progres video akun itu supaya tabel mulai dari nol sampai
-- mahasiswa asli mengerjakan. AKUNNYA TETAP ADA (profiles dan auth tidak
-- disentuh), hanya datanya yang dihapus. TIDAK bisa dibatalkan.
--
-- Aman dijalankan ulang: kalau sudah kosong, tidak ada baris yang terhapus.

-- Cek dulu berapa yang akan terhapus (boleh dijalankan terpisah):
-- select count(*) from quiz_attempts  where user_id in (select id from profiles where full_name ilike 'Mahasiswa Dummy%');
-- select count(*) from user_progress  where user_id in (select id from profiles where full_name ilike 'Mahasiswa Dummy%');
-- select count(*) from video_progress where user_id in (select id from profiles where full_name ilike 'Mahasiswa Dummy%');

DELETE FROM quiz_attempts  WHERE user_id IN (SELECT id FROM profiles WHERE full_name ILIKE 'Mahasiswa Dummy%');
DELETE FROM user_progress  WHERE user_id IN (SELECT id FROM profiles WHERE full_name ILIKE 'Mahasiswa Dummy%');
DELETE FROM video_progress WHERE user_id IN (SELECT id FROM profiles WHERE full_name ILIKE 'Mahasiswa Dummy%');

-- ════════════════════════════════════════════
--  Verifikasi (jalankan manual di SQL Editor)
-- ════════════════════════════════════════════
-- select count(*) as sisa from quiz_attempts where user_id in (select id from profiles where full_name ilike 'Mahasiswa Dummy%');
--   -> 0
-- select count(*) as akun_dummy from profiles where full_name ilike 'Mahasiswa Dummy%';
--   -> 20 (akun tetap ada)
