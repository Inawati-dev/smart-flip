-- Migration v59 (antrean #377, 8 Nov 2026): lampiran gambar pada laporan (menu Kirim).
-- Johan menjalankan berkas ini di Supabase SQL Editor, SESUDAH v58. Aplikasi tetap jalan sebelum berkas ini
-- dijalankan: kirim tanpa lampiran berfungsi seperti biasa, dan kirim dengan lampiran memberi pesan "belum aktif".
--
-- Lampiran disimpan sebagai data URL gambar di kolom `lampiran` (tanpa bucket Storage baru), paling besar 1 MB
-- (batas klien) dengan pagar 1.500.000 karakter di basis data (1 MB dalam base64 sekitar 1,4 juta karakter).
-- Hanya png, jpeg, dan webp. Daftar laporan tidak memuat kolom ini: aplikasi hanya membaca penanda
-- `ada_lampiran` dan mengambil gambarnya satu per satu saat dibuka. Hak baca ikut kebijakan v58
-- (pengirim sendiri dan dosen); hak tulis hanya saat mengirim (INSERT), tidak bisa diubah sesudahnya.
--
-- Aman dijalankan berulang.

ALTER TABLE laporan ADD COLUMN IF NOT EXISTS lampiran TEXT;

ALTER TABLE laporan DROP CONSTRAINT IF EXISTS laporan_lampiran_sah;
ALTER TABLE laporan ADD CONSTRAINT laporan_lampiran_sah CHECK (
  lampiran IS NULL
  OR (lampiran ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' AND char_length(lampiran) <= 1500000)
);

ALTER TABLE laporan ADD COLUMN IF NOT EXISTS ada_lampiran BOOLEAN GENERATED ALWAYS AS (lampiran IS NOT NULL) STORED;

GRANT INSERT (lampiran) ON laporan TO authenticated;
-- SELECT sudah diberikan di v58 pada seluruh tabel, jadi kolom baru ikut terbaca (dibatasi kebijakan baris v58).

NOTIFY pgrst, 'reload schema';

-- Verifikasi (harapan: 2 baris, lampiran text dan ada_lampiran boolean):
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'laporan' AND column_name IN ('lampiran', 'ada_lampiran') ORDER BY column_name;
-- Hak kolom (harapan: INSERT pada user_id, jenis, isi, halaman, lampiran):
-- SELECT privilege_type, column_name FROM information_schema.column_privileges
--   WHERE table_name = 'laporan' AND grantee = 'authenticated' AND privilege_type = 'INSERT' ORDER BY column_name;
