-- SMART-FLIP 5.0 — migration v4
-- Adds the diagnostic placement test (Tes Diagnostik Awal) + jalur
-- cepat/mendalam adaptive routing, per
-- docs/superpowers/specs/2026-07-23-diagnostic-adaptive-roadmap-design.md.
--
-- ⚠️ WAJIB dijalankan SEBELUM (atau bersamaan dengan) deploy commit yang
-- menambahkan `jalur` ke query profiles di AuthContext.tsx — begitu kode itu
-- live, setiap fetch profil akan gagal kalau kolom `jalur` belum ada.
--
-- Run once in Supabase SQL Editor. Idempotent — safe to re-run.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS jalur TEXT CHECK (jalur IN ('cepat', 'mendalam'));
-- NULL = mahasiswa belum mengambil tes diagnostik

CREATE TABLE IF NOT EXISTS diagnostic_questions (
  id           SERIAL PRIMARY KEY,
  pertanyaan   TEXT NOT NULL,
  opsi         JSONB NOT NULL,   -- array 4 string opsi
  jawaban      INT NOT NULL,     -- index 0-based ke opsi
  order_num    INT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE diagnostic_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diagnostic_questions read all" ON diagnostic_questions;
CREATE POLICY "diagnostic_questions read all"
  ON diagnostic_questions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "diagnostic_questions write dosen" ON diagnostic_questions;
CREATE POLICY "diagnostic_questions write dosen"
  ON diagnostic_questions FOR ALL
  USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'dosen'))
  WITH CHECK (exists (select 1 from public.profiles where id = auth.uid() and role = 'dosen'));

-- Starter question bank (draft — dosen bisa edit lewat /manajemen setelah UI
-- CRUD-nya dibangun). Idempotent lewat ON CONFLICT (order_num).
INSERT INTO diagnostic_questions (pertanyaan, opsi, jawaban, order_num) VALUES
('Apa tujuan utama penelitian R&D (Research & Development) dalam pendidikan?',
 '["Mendeskripsikan fenomena secara alamiah", "Menguji hipotesis dengan statistik inferensial", "Menghasilkan produk dan menguji efektivitasnya", "Menganalisis dokumen kurikulum"]', 2, 1),
('Ciri utama yang membedakan R&D dari jenis penelitian lain adalah...',
 '["Sampel acak besar", "Menghasilkan produk yang divalidasi dan diujicobakan", "Fokus menguji teori baru", "Selalu kualitatif"]', 1, 2),
('ADDIE adalah singkatan dari...',
 '["Analyze, Design, Develop, Implement, Evaluate", "Assess, Design, Deliver, Instruct, Evaluate", "Analyze, Develop, Design, Implement, Extend", "Assess, Develop, Deliver, Implement, Evaluate"]', 0, 3),
('Tahap ADDIE yang fokus pada analisis kebutuhan dan kesenjangan adalah...',
 '["Design", "Analyze", "Develop", "Evaluate"]', 1, 4),
('Needs assessment dalam pengembangan produk pendidikan dilakukan untuk...',
 '["Menentukan harga produk", "Mengidentifikasi kesenjangan antara kondisi ideal dan aktual", "Menulis laporan akhir", "Memilih dosen pembimbing"]', 1, 5),
('Bagian yang wajib ada di Bab Pendahuluan proposal R&D adalah...',
 '["Daftar riwayat hidup peneliti", "Latar belakang, rumusan masalah, dan tujuan pengembangan", "Anggaran biaya penelitian", "Jadwal wisuda"]', 1, 6),
('Fungsi storyboard dalam pengembangan produk digital adalah...',
 '["Mencatat anggaran produksi", "Menggambarkan alur dan tampilan produk sebelum dibangun", "Mengganti laporan akhir", "Mengukur kepuasan pengguna"]', 1, 7),
('Instrumen validasi ahli digunakan untuk mengukur...',
 '["Kelayakan produk dari sisi materi dan media sebelum uji coba", "Nilai ujian akhir mahasiswa", "Kehadiran mahasiswa", "Anggaran proyek"]', 0, 8),
('Skala yang umum dipakai pada lembar validasi ahli adalah...',
 '["Skala Likert", "Skala Celsius", "Skala Richter", "Skala Ordinal biner saja"]', 0, 9),
('Teknik analisis yang umum dipakai untuk data validasi ahli kuantitatif adalah...',
 '["Analisis regresi berganda", "Rata-rata skor dan kategori kelayakan", "Analisis jalur (path analysis)", "Uji ANOVA dua arah"]', 1, 10),
('Tujuan utama uji coba terbatas sebelum peluncuran penuh sebuah produk adalah...',
 '["Mempercepat kelulusan mahasiswa", "Menemukan masalah dan mengumpulkan masukan sebelum skala penuh", "Menghemat biaya cetak", "Mengganti validasi ahli"]', 1, 11),
('Diseminasi hasil penelitian R&D umumnya dilakukan melalui...',
 '["Menyimpan laporan di rak pribadi", "Publikasi artikel ilmiah dan forum akademik", "Menghapus data setelah selesai", "Tidak perlu didiseminasikan"]', 1, 12),
('Perbedaan utama penelitian kuantitatif dan kualitatif dari sisi data adalah...',
 '["Kuantitatif pakai angka/statistik, kualitatif pakai deskripsi mendalam", "Kuantitatif selalu lebih valid", "Kualitatif tidak butuh data", "Tidak ada perbedaan"]', 0, 13),
('Studi pustaka penting dilakukan sebelum menyusun instrumen penelitian karena...',
 '["Supaya laporan lebih tebal", "Memberi landasan teori dan menghindari duplikasi penelitian", "Wajib menurut kampus tanpa alasan akademik", "Mempercepat pengumpulan data"]', 1, 14),
('Yang dimaksud "produk" dalam konteks penelitian R&D pendidikan adalah...',
 '["Hanya barang fisik seperti alat peraga", "Bisa berupa modul, media, model, atau perangkat pembelajaran apa pun yang diuji efektivitasnya", "Selalu berupa aplikasi digital", "Laporan penelitian itu sendiri"]', 1, 15)
ON CONFLICT (order_num) DO NOTHING;

-- ✅ Checklist:
-- [ ] Jalankan file ini di Supabase SQL Editor (project smart-flip) SEBELUM
--     deploy commit yang menyentuh jalur di AuthContext.tsx
-- [ ] Verifikasi: select count(*) from diagnostic_questions; → 15
-- [ ] Verifikasi: profiles.jalur kolom muncul, semua row existing NULL
-- [ ] Login sebagai mahasiswa baru, cek redirect /dashboard → /diagnostik
