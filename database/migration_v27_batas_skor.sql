-- migration_v27_batas_skor.sql (antrean #136, 10 Okt 2026)
-- Batas skor per mata kuliah, diisi dosen lewat modal "Batas skor" di halaman
-- Asesmen. Hanya MENAMBAH dua kolom; tidak ada data yang dihapus atau diubah.
--   ambang_diagnostik: skor tes diagnostik awal mulai dari sini = Jalur cepat.
--   ambang_formatif  : skor tes formatif mulai dari sini = lulus.
-- Nilai awal 80 dan 70 mengikuti naskah Bagian I. Pasangan di aplikasi:
-- src/lib/ambang.ts (AMBANG_DIAGNOSTIK, AMBANG_FORMATIF).
-- Kolom quiz_attempts.passed (score >= 80, migration_v17) dibiarkan apa
-- adanya dan tidak lagi dibaca aplikasi.
-- Hak ubah sudah ada: policy "dosen manage courses" di migration_v23.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS ambang_diagnostik INT NOT NULL DEFAULT 80
    CHECK (ambang_diagnostik BETWEEN 0 AND 100);

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS ambang_formatif INT NOT NULL DEFAULT 70
    CHECK (ambang_formatif BETWEEN 0 AND 100);

-- Supaya PostgREST langsung mengenali kolom baru (tanpa ini simpan dari aplikasi
-- bisa ditolak "schema cache" sampai cache-nya dimuat ulang sendiri):
NOTIFY pgrst, 'reload schema';

-- Cek sesudah dijalankan (harus menampilkan 80 dan 70 untuk tiap mata kuliah):
-- SELECT id, code, name, ambang_diagnostik, ambang_formatif FROM courses ORDER BY order_num;
