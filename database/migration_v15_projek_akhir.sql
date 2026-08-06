-- SMART-FLIP 5.0 — migration v15
-- Fitur "Projek Akhir / Luaran Pembelajaran": tiap mahasiswa menggarap SATU
-- proposal penelitian & pengembangan sebagai luaran akhir mata kuliah — boleh
-- lewat unggah berkas, ditulis langsung di sistem, atau dua-duanya — dan dosen
-- mengontrol status + umpan baliknya dari akunnya sendiri.
--
-- KENAPA TABEL BARU, BUKAN MENUMPANG `drafts`:
-- `drafts` itu ALIRAN: banyak baris per mahasiswa, satu per modul, versi
-- bertambah tiap kirim ulang, dan seluruh UI /draf berdiri di atas asumsi
-- "daftar draf per modul" (module_id NOT NULL secara praktik, filter modul,
-- utas komentar). Projek akhir kebalikannya: SATU baris jangka panjang per
-- mahasiswa, tanpa modul induk, dengan struktur bab proposal yang tetap
-- (ringkasan/latar belakang/rumusan/tujuan/metode) dan siklus status sendiri
-- (draf → diajukan → revisi → disetujui). Menumpangkannya ke `drafts` berarti
-- membuat module_id nullable, menambah kolom pembeda `kind` yang harus ikut
-- disaring di SETIAP query dan setiap tampilan /draf yang sudah jalan, plus
-- menaruh dua kosakata status di satu kolom — jelas lebih banyak kerusakan di
-- fitur lama ketimbang satu tabel kecil yang berdiri sendiri di sini.
-- Yang TIDAK diduplikasi: helper tanggal relatif dipakai ulang dari
-- src/lib/draf.ts (formatDraftDate), bukan ditulis ulang.
--
-- Jalankan sekali di Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Aman diulang — semua statement idempoten (IF NOT EXISTS / DROP ... IF EXISTS).

-- ════════════════════════════════════════════
--  1. TABEL
-- ════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS final_projects (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- UNIQUE: satu proposal akhir per mahasiswa. Ini yang bikin simpan cukup
  -- pakai upsert on_conflict(user_id) dan tidak perlu logika "cari baris
  -- terakhir" seperti di `drafts` yang memang berversi.
  user_id         uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  judul           text NOT NULL DEFAULT '',
  ringkasan       text NOT NULL DEFAULT '',
  latar_belakang  text NOT NULL DEFAULT '',
  rumusan_masalah text NOT NULL DEFAULT '',
  tujuan          text NOT NULL DEFAULT '',
  metode          text NOT NULL DEFAULT '',
  -- Menyimpan PATH objek Storage (mis. '<uuid>/1720000000-proposal.pdf'),
  -- bukan public URL — bucket-nya privat (lihat bagian 4), jadi tautan unduh
  -- selalu dibuatkan signed URL berumur pendek saat dibutuhkan.
  file_path       text,
  file_name       text,
  status          text NOT NULL DEFAULT 'draf'
                    CHECK (status IN ('draf', 'diajukan', 'revisi', 'disetujui')),
  catatan_dosen   text NOT NULL DEFAULT '',
  submitted_at    timestamptz,
  reviewed_at     timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS final_projects_status_idx ON final_projects (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON final_projects TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE final_projects_id_seq TO authenticated;

-- ════════════════════════════════════════════
--  2. PENJAGA KOLOM (trigger)
-- ════════════════════════════════════════════
-- RLS di Postgres bekerja per-BARIS, bukan per-KOLOM. Policy "mahasiswa kelola
-- baris sendiri" di bawah otomatis juga mengizinkan mahasiswa meng-UPDATE
-- kolom `status` dan `catatan_dosen` di barisnya sendiri lewat REST API —
-- artinya tanpa penjagaan ini seorang mahasiswa bisa "menyetujui" proposalnya
-- sendiri dari devtools. Trigger ini mengembalikan kolom yang bukan haknya ke
-- nilai lama, jadi wewenangnya tegas: mahasiswa memegang ISI, dosen memegang
-- VONIS. Sengaja diam-diam mengembalikan nilai (bukan RAISE) supaya operasi
-- normal — mahasiswa menyimpan isi proposal saat statusnya sedang 'revisi' —
-- tetap lolos, bukan malah gagal total gara-gara ikut mengirim status lama.
CREATE OR REPLACE FUNCTION final_projects_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draf', 'diajukan') THEN
      NEW.status := 'draf';
    END IF;
    IF NEW.status = 'diajukan' AND NEW.submitted_at IS NULL THEN
      NEW.submitted_at := now();
    END IF;
    NEW.catatan_dosen := '';
    NEW.reviewed_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.user_id = auth.uid() THEN
    -- Jalur mahasiswa (pemilik baris): hanya boleh menggeser status antara
    -- 'draf' dan 'diajukan'. 'revisi'/'disetujui' cuma boleh datang dari dosen.
    IF NEW.status NOT IN ('draf', 'diajukan') THEN
      NEW.status := OLD.status;
    END IF;
    IF NEW.status = 'diajukan' AND OLD.status IS DISTINCT FROM 'diajukan' THEN
      NEW.submitted_at := now();
    END IF;
    NEW.catatan_dosen := OLD.catatan_dosen;
    NEW.reviewed_at := OLD.reviewed_at;
  ELSE
    -- Jalur dosen penilai: isi proposal tetap milik mahasiswa, dosen hanya
    -- menyentuh status + catatan. reviewed_at diisi server, bukan klien,
    -- supaya jam tinjauan tidak bisa dikarang dari sisi browser.
    NEW.user_id         := OLD.user_id;
    NEW.judul           := OLD.judul;
    NEW.ringkasan       := OLD.ringkasan;
    NEW.latar_belakang  := OLD.latar_belakang;
    NEW.rumusan_masalah := OLD.rumusan_masalah;
    NEW.tujuan          := OLD.tujuan;
    NEW.metode          := OLD.metode;
    NEW.file_path       := OLD.file_path;
    NEW.file_name       := OLD.file_name;
    NEW.submitted_at    := OLD.submitted_at;
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.catatan_dosen IS DISTINCT FROM OLD.catatan_dosen THEN
      NEW.reviewed_at := now();
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS final_projects_guard_trg ON final_projects;
CREATE TRIGGER final_projects_guard_trg
  BEFORE INSERT OR UPDATE ON final_projects
  FOR EACH ROW EXECUTE FUNCTION final_projects_guard();

-- ════════════════════════════════════════════
--  3. RLS
-- ════════════════════════════════════════════
ALTER TABLE final_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mahasiswa kelola projek akhir sendiri" ON final_projects;
CREATE POLICY "mahasiswa kelola projek akhir sendiri" ON final_projects
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Lewat is_dosen_of() (migration_v13) — WAJIB, supaya seorang dosen hanya
-- melihat mahasiswa dari kelas yang dia pegang, bukan seluruh sistem.
DROP POLICY IF EXISTS "dosen lihat projek akhir kelasnya" ON final_projects;
CREATE POLICY "dosen lihat projek akhir kelasnya" ON final_projects
  FOR SELECT USING (is_dosen_of(user_id));

-- Pasangan UPDATE-nya dibuat eksplisit di sini. Pelajaran dari
-- migration_v12: tanpa policy UPDATE, aksi dosen ter-RLS-filter jadi 0 baris
-- dan Postgres TIDAK melempar error — perubahan status tampak berhasil
-- padahal tidak pernah tersimpan.
DROP POLICY IF EXISTS "dosen nilai projek akhir kelasnya" ON final_projects;
CREATE POLICY "dosen nilai projek akhir kelasnya" ON final_projects
  FOR UPDATE USING (is_dosen_of(user_id)) WITH CHECK (is_dosen_of(user_id));

-- ════════════════════════════════════════════
--  4. STORAGE — bucket berkas proposal (PRIVAT)
-- ════════════════════════════════════════════
-- Beda dari bucket 'modul-pdf' yang publik: modul memang bahan ajar untuk
-- semua, sedangkan proposal adalah karya pribadi mahasiswa. Bucket privat +
-- signed URL memastikan berkas tidak bisa dibuka siapa pun yang kebetulan
-- menebak/menyimpan tautannya.
INSERT INTO storage.buckets (id, name, public)
VALUES ('projek-akhir', 'projek-akhir', false)
ON CONFLICT (id) DO NOTHING;

-- Konvensi nama objek: '<user_id>/<timestamp>-<nama berkas>'. Folder terdepan
-- dipakai sebagai penanda pemilik di semua policy di bawah.
DROP POLICY IF EXISTS "projek-akhir owner read" ON storage.objects;
CREATE POLICY "projek-akhir owner read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'projek-akhir'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Dosen boleh mengunduh berkas mahasiswa yang benar-benar kelasnya. Regex
-- UUID-nya bukan hiasan: cast ke uuid akan meledak untuk objek yang folder
-- terdepannya bukan UUID, dan error di dalam policy = seluruh SELECT gagal.
DROP POLICY IF EXISTS "projek-akhir dosen read" ON storage.objects;
CREATE POLICY "projek-akhir dosen read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'projek-akhir'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_dosen_of(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "projek-akhir owner insert" ON storage.objects;
CREATE POLICY "projek-akhir owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'projek-akhir'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "projek-akhir owner update" ON storage.objects;
CREATE POLICY "projek-akhir owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'projek-akhir'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "projek-akhir owner delete" ON storage.objects;
CREATE POLICY "projek-akhir owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'projek-akhir'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ✅ Checklist setelah dijalankan:
-- [ ] Tabel `final_projects` muncul di Table Editor, RLS aktif (3 policy)
-- [ ] Bucket `projek-akhir` muncul di Storage, TIDAK bertanda Public
-- [ ] Login sebagai mahasiswa: isi + unggah berkas di /projek-akhir, klik Ajukan
-- [ ] Login sebagai dosen kelas itu: baris mahasiswa tampil, berkas bisa diunduh,
--     status bisa diubah ke "Perlu Revisi" dan catatan tersimpan
-- [ ] Login sebagai dosen kelas LAIN: baris tersebut TIDAK muncul
