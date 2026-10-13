-- SMART-FLIP 5.0 - migration v38: penjaga catatan baca dan tonton (antrean #225, 13 Okt 2026).
--
-- Idempoten, aman dijalankan ulang. Saat dijalankan, tidak ada baris yang diubah atau dihapus.
--
-- Masalah yang ditutup: catatan baca ditulis ulang dari peramban, dan tulisan terakhir menang.
-- Mahasiswa yang membuka topik yang sama di dua tab atau dua perangkat bisa menimpa catatan
-- 60% dengan 33%, dan topik yang sudah selesai bisa kembali berstatus "in_progress"
-- (status itu dibaca analitik dosen). Penjaga ini membuat basis data yang memutuskan:
--   1. pct (dijepit 0 sampai 100), time_spent, dan furthest_page hanya bisa naik;
--   2. status tidak bisa mundur (not_started -> in_progress -> completed), dan "completed"
--      hanya diterima bila pct sudah 100;
--   3. started_at dan completed_at diisi sekali, saat pertama terpenuhi, lalu tidak ditimpa;
--   4. detik tonton video hanya bisa naik dan tanda selesai video tidak bisa dicabut.
-- Kolom baru furthest_page menyimpan halaman terjauh yang sudah dihitung dibaca, supaya PDF
-- panjang (di atas 100 halaman) tidak lagi dipulihkan dari persen bulat.
--
-- Yang perlu diketahui:
--   - Penjaga berlaku untuk INSERT dan UPDATE dari siapa pun, termasuk dari SQL Editor.
--     UPDATE yang menurunkan angka diabaikan diam-diam (bukan galat).
--   - Mengulang catatan seorang mahasiswa dari nol: HAPUS barisnya (DELETE).
--   - Mengoreksi satu baris ke angka yang lebih kecil:
--       ALTER TABLE user_progress DISABLE TRIGGER jaga_user_progress;
--       -- UPDATE ...;
--       ALTER TABLE user_progress ENABLE TRIGGER jaga_user_progress;
--   - Baris lama yang sudah 100% atau "completed" tetapi completed_at-nya kosong akan diisi
--     dengan last_opened baris itu (bukan tanggal hari ini) saat pertama kali ditulis lagi.
--     Hitung dulu jumlahnya bila ingin tahu (lihat Verifikasi butir 3).
--   - Batas yang diketahui: bila jumlah halaman PDF sebuah topik berubah, halaman terjauh
--     dihitung ulang dari persen; waktu baca dari dua tab yang terbuka bersamaan dicatat
--     sebesar yang terbesar, bukan jumlahnya.

ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS furthest_page INT;

CREATE OR REPLACE FUNCTION jaga_user_progress()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  sudah_selesai BOOLEAN := FALSE;
BEGIN
  NEW.pct := LEAST(100, GREATEST(0, COALESCE(NEW.pct, 0)));

  IF TG_OP = 'UPDATE' THEN
    sudah_selesai := OLD.status = 'completed' OR COALESCE(OLD.pct, 0) >= 100;
    NEW.pct := GREATEST(NEW.pct, LEAST(100, COALESCE(OLD.pct, 0)));
    NEW.time_spent := GREATEST(COALESCE(NEW.time_spent, 0), COALESCE(OLD.time_spent, 0));
    IF NEW.total_pages IS NOT NULL AND OLD.total_pages IS NOT NULL AND NEW.total_pages <> OLD.total_pages THEN
      -- PDF diganti dengan jumlah halaman lain. Nomor halaman lama tidak berlaku: bila penulis tidak
      -- mengirim halaman terjauh yang baru, kosongkan supaya aplikasi menghitungnya dari persen.
      IF NEW.furthest_page IS NOT DISTINCT FROM OLD.furthest_page THEN
        NEW.furthest_page := NULL;
      END IF;
    ELSIF NEW.furthest_page IS NULL OR NEW.furthest_page < OLD.furthest_page THEN
      NEW.furthest_page := OLD.furthest_page;
    END IF;
    NEW.started_at := COALESCE(OLD.started_at, NEW.started_at);
  END IF;

  IF NEW.furthest_page IS NOT NULL THEN
    NEW.furthest_page := GREATEST(0, NEW.furthest_page);
    IF NEW.total_pages IS NOT NULL THEN
      NEW.furthest_page := LEAST(NEW.furthest_page, NEW.total_pages);
    END IF;
  END IF;

  -- Status diturunkan dari persen akhir dan status lama; status "completed" kiriman penulis tidak dipercaya.
  IF NEW.pct >= 100 OR sudah_selesai THEN
    NEW.status := 'completed';
  ELSIF NEW.pct > 0 OR (TG_OP = 'UPDATE' AND OLD.status = 'in_progress') OR NEW.status = 'completed' THEN
    NEW.status := 'in_progress';
  ELSE
    NEW.status := COALESCE(NEW.status, 'not_started');
  END IF;

  IF NEW.pct > 0 OR COALESCE(NEW.current_page, 0) > 0 THEN
    NEW.started_at := COALESCE(NEW.started_at, now());
  END IF;

  IF NEW.status = 'completed' THEN
    IF TG_OP = 'UPDATE' AND OLD.completed_at IS NOT NULL THEN
      NEW.completed_at := OLD.completed_at;
    ELSIF sudah_selesai THEN
      -- baris lama yang sudah selesai sebelum penjaga ada: pakai tanggal terakhir dibuka, bukan hari ini
      NEW.completed_at := COALESCE(OLD.last_opened, NEW.completed_at, now());
    ELSE
      NEW.completed_at := COALESCE(NEW.completed_at, now());
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jaga_user_progress ON user_progress;
CREATE TRIGGER jaga_user_progress
  BEFORE INSERT OR UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION jaga_user_progress();

-- Tonton video (tabel dari migration_v19): detik hanya naik, tanda selesai tidak bisa dicabut.
CREATE OR REPLACE FUNCTION jaga_video_progress()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.seconds := GREATEST(COALESCE(NEW.seconds, 0), COALESCE(OLD.seconds, 0));
  NEW.done := COALESCE(NEW.done, FALSE) OR COALESCE(OLD.done, FALSE);
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.video_progress') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS jaga_video_progress ON video_progress;
    CREATE TRIGGER jaga_video_progress
      BEFORE UPDATE ON video_progress
      FOR EACH ROW EXECUTE FUNCTION jaga_video_progress();
  END IF;
END;
$$;

-- Supaya PostgREST langsung mengenal kolom furthest_page.
NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════
--  Verifikasi (jalankan manual di SQL Editor)
-- ════════════════════════════════════════════
-- 1. select column_name from information_schema.columns where table_name = 'user_progress' and column_name = 'furthest_page';
--      -> 1 baris
-- 2. select tgrelid::regclass, tgname from pg_trigger where tgname in ('jaga_user_progress', 'jaga_video_progress');
--      -> 2 baris
-- 3. Baris lama yang tanggal selesainya akan diisi dari last_opened saat ditulis lagi:
--    select count(*) from user_progress where (status = 'completed' or pct >= 100) and completed_at is null;
-- 4. Uji tanpa meninggalkan jejak (ganti <id-baris> dengan id satu baris yang persennya di atas 0):
--      begin;
--      update user_progress set pct = 0, status = 'not_started', time_spent = 0 where id = <id-baris>;
--      select pct, status, time_spent, completed_at from user_progress where id = <id-baris>;
--        -> angka dan status sama seperti sebelum update
--      rollback;
