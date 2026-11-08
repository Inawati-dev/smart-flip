-- Migration v57 (antrean #364, 8 Nov 2026): pilihan saklar notifikasi ikut akun.
-- Johan menjalankan berkas ini di Supabase SQL Editor. Aplikasi tetap jalan sebelum berkas ini
-- dijalankan: pilihan hanya tersimpan di perangkat (localStorage) seperti sebelumnya, dan tersambung
-- ke akun begitu kolomnya ada.
--
-- Kolom baru satu per akun. Kebijakan "user update own profile" (schema.sql) sudah mengizinkan
-- pengguna mengubah barisnya sendiri; pemicu pengunci kolom (v6, v44) tidak menyentuh kolom ini.
-- Bawaan menyala (TRUE), jadi semua akun lama tetap menerima notifikasi.
--
-- Aman dijalankan berulang.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_aktif BOOLEAN NOT NULL DEFAULT TRUE;

NOTIFY pgrst, 'reload schema';

-- Verifikasi (harapan 1 baris, tipe boolean, bawaan true):
-- SELECT column_name, data_type, column_default FROM information_schema.columns
--   WHERE table_name = 'profiles' AND column_name = 'notif_aktif';
-- Cek isi (harapan: semua true sampai ada yang mematikan):
-- SELECT notif_aktif, count(*) FROM profiles GROUP BY 1;
