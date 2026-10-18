-- SMART-FLIP 5.0 — migration v50: isi pertemuan kedua tiap topik (antrean #271)
--
-- Satu topik memakai dua minggu (src/lib/jadwal.ts: minggu materi, lalu minggu
-- tes formatif). Kolom lama video_url, duration_sec, dan pdf_path tetap menjadi
-- isi pertemuan pertama. Kolom baru di bawah adalah isi pertemuan kedua; semuanya
-- opsional, kosong = topik itu hanya punya isi pertemuan pertama.
--
-- RLS tidak berubah: kolom baru ikut kebijakan baris tabel yang sudah ada
-- (modules: hanya dosen pengampu yang boleh mengubah; video_progress: mahasiswa
-- mengelola barisnya sendiri). Trigger penjaga jaga_video_progress (v38) diperluas
-- di bawah supaya detik dan tanda selesai video kedua juga tidak bisa turun.
--
-- Jalankan sekali di Supabase SQL Editor. Aman diulang (IF NOT EXISTS).

ALTER TABLE modules ADD COLUMN IF NOT EXISTS video_url_2    TEXT;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS duration_sec_2 INT;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS pdf_path_2     TEXT;

-- Progres tonton video pertemuan kedua, di baris yang sama dengan video pertama.
ALTER TABLE video_progress ADD COLUMN IF NOT EXISTS seconds_2 INT     NOT NULL DEFAULT 0;
ALTER TABLE video_progress ADD COLUMN IF NOT EXISTS done_2    BOOLEAN NOT NULL DEFAULT false;

-- Fungsi trigger v38 yang sama, ditambah dua baris untuk kolom kedua. Triggernya sendiri sudah terpasang di v38.
CREATE OR REPLACE FUNCTION jaga_video_progress()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.seconds := GREATEST(COALESCE(NEW.seconds, 0), COALESCE(OLD.seconds, 0));
  NEW.done := COALESCE(NEW.done, FALSE) OR COALESCE(OLD.done, FALSE);
  NEW.seconds_2 := GREATEST(COALESCE(NEW.seconds_2, 0), COALESCE(OLD.seconds_2, 0));
  NEW.done_2 := COALESCE(NEW.done_2, FALSE) OR COALESCE(OLD.done_2, FALSE);
  RETURN NEW;
END;
$$;

-- Supaya PostgREST langsung mengenal kolom baru.
NOTIFY pgrst, 'reload schema';

-- Cek sesudah dijalankan (harus 5 baris):
-- select table_name, column_name from information_schema.columns
--  where (table_name = 'modules' and column_name in ('video_url_2', 'duration_sec_2', 'pdf_path_2'))
--     or (table_name = 'video_progress' and column_name in ('seconds_2', 'done_2'));
