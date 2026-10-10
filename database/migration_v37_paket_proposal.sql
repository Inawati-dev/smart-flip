-- v37 (antrean #179, 11 Okt 2026): Paket Rancangan Proposal.
-- Empat Mini Projek berurutan (Bab 1, Bab 2, Bab 3, Rancangan Proposal
-- Lengkap) dibuat dosen sekali klik dan dikenali lewat paket_id yang sama.
-- urutan = 1..4, bobot = persen sumbangan ke nilai Mini Projek (jumlah
-- keempatnya 100, dijaga aplikasi). Mini Projek biasa tetap paket_id NULL.
-- Kunci buka per bab (jadwal topik, Bab 3 dinilai) ada di sisi aplikasi,
-- sama seperti kunci jadwal v29; basis data tidak ikut menolak.
-- Aman dijalankan ulang.

ALTER TABLE tugas_akhir_briefs ADD COLUMN IF NOT EXISTS paket_id UUID;
ALTER TABLE tugas_akhir_briefs ADD COLUMN IF NOT EXISTS urutan INT CHECK (urutan IS NULL OR urutan BETWEEN 1 AND 4);
ALTER TABLE tugas_akhir_briefs ADD COLUMN IF NOT EXISTS bobot INT CHECK (bobot IS NULL OR bobot BETWEEN 0 AND 100);

-- Satu paket tidak boleh punya dua bab bernomor sama.
CREATE UNIQUE INDEX IF NOT EXISTS tugas_akhir_briefs_paket_urutan
  ON tugas_akhir_briefs (paket_id, urutan) WHERE paket_id IS NOT NULL;

-- Cek sesudah jalan (harus tiga baris):
-- select column_name from information_schema.columns
--   where table_name = 'tugas_akhir_briefs' and column_name in ('paket_id','urutan','bobot');
