-- v32 (antrean #173, 10 Okt 2026): kiriman Mini Projek hanya berkas Word .docx.
-- Aplikasi sudah menolak berkas selain .docx; ini menutup jalur unggah
-- langsung ke penyimpanan. Kiriman PDF dan DOC yang SUDAH tersimpan tidak
-- terhapus dan tetap bisa dibuka; yang ditolak hanya unggahan baru.
-- Aman dijalankan ulang.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
WHERE id = 'tugas-akhir';

-- Cek sesudah jalan (harus satu baris, satu jenis berkas):
-- select id, allowed_mime_types from storage.buckets where id = 'tugas-akhir';
