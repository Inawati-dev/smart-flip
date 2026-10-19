-- SMART-FLIP 5.0 — migration v51: gambar kecil video unggahan (antrean #275)
--
-- Kartu Video menampilkan gambar kecil untuk video unggahan. Gambarnya satu
-- bingkai video yang diambil peramban dosen lalu disimpan di bucket
-- `modul-video` di samping videonya, bernama <nama video>.sampul.jpg
-- (src/lib/sampulVideo.ts). Bucket itu sejak v21 hanya menerima mp4/webm, jadi
-- jenis image/jpeg ditambahkan. Kebijakan unggah tetap: hanya dosen.
--
-- Jalankan sekali di Supabase SQL Editor. Aman diulang.

UPDATE storage.buckets
   SET allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'image/jpeg']
 WHERE id = 'modul-video';

-- Cek sesudah dijalankan (harus memuat image/jpeg):
-- select id, allowed_mime_types from storage.buckets where id = 'modul-video';
