-- ════════════════════════════════════════════
--  MIGRATION v14 — Aktivitas Mandiri (Observasi Lapangan)
-- ════════════════════════════════════════════
-- Konteks: halaman /asesmen baru punya poin 1 dari konsep Asesmen (tes
-- formatif pilihan ganda + nilainya). Poin 2 & 3 belum ada sama sekali:
--   2. aktivitas mandiri berbentuk observasi lapangan
--   3. menu progres tugas observasi — hasilnya bisa berupa UNGGAHAN FILE
--      maupun TULISAN LANGSUNG di dalam sistem
-- Migration ini menambah dua tabel untuk itu: satu berisi tugas yang ditulis
-- dosen, satu berisi jawaban mahasiswa. Dua jalur pengumpulan (file & teks)
-- sengaja jadi DUA KOLOM di baris yang sama (`file_url` + `isi_teks`), bukan
-- dua tabel atau kolom "tipe" — satu mahasiswa boleh mengunggah laporan PDF
-- sekaligus menuliskan ringkasannya, dan progres dihitung per-mahasiswa
-- per-tugas apa pun jalur yang dipakai.
--
-- Jalankan sekali di Supabase SQL Editor (Dashboard > SQL Editor > New query),
-- SETELAH schema.sql dan v1–v13 terpasang. Aman diulang — semua statement
-- idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT).

-- ════════════════════════════════════════════
--  Helper RLS — kebalikan arah dari is_dosen_of() (migration_v13)
-- ════════════════════════════════════════════
-- v13 menjawab "apakah SAYA (dosen) memegang mahasiswa ini?". Di sini butuh
-- arah sebaliknya: "apakah SAYA (mahasiswa) diampu dosen ini?", supaya daftar
-- tugas observasi ikut ter-scope per dosen dan mahasiswa tidak melihat tugas
-- milik dosen kelas lain. Tanpa fungsi ini satu-satunya pilihan realistis
-- adalah "semua authenticated boleh SELECT" (pola `modules`), dan itu keliru:
-- modules memang kurikulum bersama, tugas observasi tidak.
--
-- SECURITY DEFINER + search_path pinned, persis pola is_dosen_of() — perlu
-- karena policy-nya sendiri membaca `profiles`, yang punya RLS: tanpa
-- SECURITY DEFINER, evaluasi policy akan rekursif ke policy profiles.
CREATE OR REPLACE FUNCTION is_my_dosen(dosen uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN classes c ON c.id = p.class_id
    WHERE p.id = auth.uid() AND c.dosen_id = dosen
  );
$$;

-- ════════════════════════════════════════════
--  Tabel 1 — observasi_tugas (ditulis dosen)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS observasi_tugas (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  judul       text NOT NULL,
  -- Instruksi lapangan: apa yang diamati, di mana, bukti apa yang dikumpulkan.
  deskripsi   text NOT NULL DEFAULT '',
  -- Opsional: observasi boleh berdiri sendiri (tugas lapangan lintas modul),
  -- makanya nullable. SET NULL, bukan CASCADE — dosen merapikan daftar modul
  -- tidak boleh diam-diam menghapus tugas beserta jawaban mahasiswanya
  -- (alasan yang sama dipakai `drafts.module_id`, lihat lib/manajemen.ts).
  module_id   int REFERENCES modules(id) ON DELETE SET NULL,
  deadline    timestamptz,
  order_num   integer NOT NULL DEFAULT 0,
  created_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS observasi_tugas_created_by_idx ON observasi_tugas (created_by);

-- ════════════════════════════════════════════
--  Tabel 2 — observasi_submissions (dikumpulkan mahasiswa)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS observasi_submissions (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tugas_id      bigint NOT NULL REFERENCES observasi_tugas(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Jalur A — tulis langsung di sistem.
  isi_teks      text NOT NULL DEFAULT '',
  -- Jalur B — unggah berkas (public URL dari bucket `observasi-file` di bawah).
  file_url      text,
  file_name     text,
  -- Status & catatan meniru `drafts` + migration_v12: dosen menandai sudah
  -- diperiksa / minta revisi, mahasiswa membaca catatannya di baris yang sama.
  status        text NOT NULL DEFAULT 'submitted'
                CHECK (status IN ('submitted', 'reviewed', 'revision')),
  catatan_dosen text,
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- Satu baris per mahasiswa per tugas: mengumpulkan ulang = memperbarui baris
  -- yang sama (upsert), bukan menumpuk versi baru. Ini yang bikin hitungan
  -- progres "X dari Y mahasiswa sudah mengumpulkan" jadi sekadar COUNT baris,
  -- tanpa perlu DISTINCT ON atau ambil-yang-terbaru di sisi klien.
  UNIQUE (tugas_id, user_id),

  -- Minimal satu jalur terisi. Baris kosong akan tampil sebagai "sudah
  -- mengumpulkan" di rekap progres padahal tidak ada isinya — dicegah di DB
  -- supaya tidak bergantung pada validasi klien saja.
  CONSTRAINT observasi_submissions_ada_isinya
    CHECK (btrim(isi_teks) <> '' OR file_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS observasi_submissions_tugas_id_idx ON observasi_submissions (tugas_id);
CREATE INDEX IF NOT EXISTS observasi_submissions_user_id_idx ON observasi_submissions (user_id);

-- ════════════════════════════════════════════
--  GRANTS
-- ════════════════════════════════════════════
-- Postgres memeriksa GRANT tabel DULU, sebelum RLS dievaluasi sama sekali.
-- Tabel yang dibuat lewat SQL mentah (bukan dashboard) tidak mendapat grant
-- ini otomatis — tanpa baris di bawah setiap request `authenticated` gagal
-- dengan "permission denied for table ..." (42501) sekalipun policy-nya sudah
-- benar. Lihat catatan panjang yang sama di migration_v7_kelas.sql.
GRANT SELECT, INSERT, UPDATE, DELETE ON observasi_tugas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON observasi_submissions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE observasi_tugas_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE observasi_submissions_id_seq TO authenticated;

ALTER TABLE observasi_tugas ENABLE ROW LEVEL SECURITY;
ALTER TABLE observasi_submissions ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════
--  RLS — observasi_tugas
-- ════════════════════════════════════════════
-- Dosen: penuh atas tugas yang DIA tulis sendiri (bukan "semua yang role-nya
-- dosen") — pola multi-tenancy migration_v13, dosen lain tidak boleh mengubah
-- apalagi menghapus tugas milik dosen ini.
DROP POLICY IF EXISTS "dosen kelola tugas observasi sendiri" ON observasi_tugas;
CREATE POLICY "dosen kelola tugas observasi sendiri" ON observasi_tugas
  FOR ALL USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Mahasiswa: baca saja, dan hanya tugas dari dosen yang mengampu kelasnya.
-- Mahasiswa tanpa class_id (belum masuk kelas mana pun) otomatis tidak
-- melihat tugas apa pun — fail-closed, konsisten dengan ProtectedRoute.
DROP POLICY IF EXISTS "mahasiswa lihat tugas observasi dosennya" ON observasi_tugas;
CREATE POLICY "mahasiswa lihat tugas observasi dosennya" ON observasi_tugas
  FOR SELECT USING (is_my_dosen(created_by));

-- ════════════════════════════════════════════
--  RLS — observasi_submissions
-- ════════════════════════════════════════════
-- Mahasiswa: penuh atas barisnya sendiri (kirim, perbaiki, tarik kembali).
-- Sama seperti "user manage own drafts" di schema.sql, policy FOR ALL ini
-- secara teknis juga mengizinkan mahasiswa menyentuh `status`/`catatan_dosen`
-- di barisnya sendiri lewat API langsung. Dibiarkan konsisten dengan
-- precedent `drafts` alih-alih memasang trigger kolom-terkunci di sini;
-- dampaknya terbatas pada data miliknya sendiri, bukan lintas pengguna.
DROP POLICY IF EXISTS "mahasiswa kelola jawaban observasi sendiri" ON observasi_submissions;
CREATE POLICY "mahasiswa kelola jawaban observasi sendiri" ON observasi_submissions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Dosen: baca jawaban HANYA dari mahasiswa di kelas yang dia pegang.
DROP POLICY IF EXISTS "dosen lihat jawaban observasi kelas sendiri" ON observasi_submissions;
CREATE POLICY "dosen lihat jawaban observasi kelas sendiri" ON observasi_submissions
  FOR SELECT USING (is_dosen_of(user_id));

-- Dosen memberi status/catatan. USING + WITH CHECK dua-duanya diisi: tanpa
-- WITH CHECK, Postgres menyalin ekspresi USING — kebetulan benar di sini,
-- tapi ditulis eksplisit karena migration_v6 sudah kena masalah nyata gara-
-- gara WITH CHECK yang dibiarkan implisit.
DROP POLICY IF EXISTS "dosen nilai jawaban observasi kelas sendiri" ON observasi_submissions;
CREATE POLICY "dosen nilai jawaban observasi kelas sendiri" ON observasi_submissions
  FOR UPDATE USING (is_dosen_of(user_id)) WITH CHECK (is_dosen_of(user_id));

-- ════════════════════════════════════════════
--  STORAGE — bucket `observasi-file` untuk jalur unggahan
-- ════════════════════════════════════════════
-- Pola sama persis dengan migration_v3 (`modul-pdf`): bucket public supaya
-- getPublicUrl() bisa dipakai langsung tanpa signed URL. Bedanya di sini
-- yang MENGUNGGAH adalah mahasiswa (bukan dosen), jadi policy insert-nya
-- cukup "authenticated", sementara update/delete dibatasi pemilik objeknya.
insert into storage.buckets (id, name, public)
values ('observasi-file', 'observasi-file', true)
on conflict (id) do nothing;

drop policy if exists "observasi-file read" on storage.objects;
create policy "observasi-file read"
  on storage.objects for select
  using (bucket_id = 'observasi-file');

drop policy if exists "observasi-file insert auth" on storage.objects;
create policy "observasi-file insert auth"
  on storage.objects for insert
  with check (bucket_id = 'observasi-file' and auth.uid() is not null);

-- storage.objects.owner diisi otomatis dengan auth.uid() saat upload, jadi
-- mahasiswa hanya bisa menimpa/menghapus berkasnya sendiri — dosen tidak
-- perlu menghapus berkas mahasiswa dari sini (cukup ubah status/catatan).
drop policy if exists "observasi-file update own" on storage.objects;
create policy "observasi-file update own"
  on storage.objects for update
  using (bucket_id = 'observasi-file' and owner = auth.uid());

drop policy if exists "observasi-file delete own" on storage.objects;
create policy "observasi-file delete own"
  on storage.objects for delete
  using (bucket_id = 'observasi-file' and owner = auth.uid());

-- ════════════════════════════════════════════
--  CATATAN — langkah setelah run migration ini
-- ════════════════════════════════════════════
-- 1. Verifikasi bucket muncul di Storage > observasi-file dan bertanda Public.
--    Kalau `insert into storage.buckets` di atas ditolak (sebagian project
--    mengunci tabel itu), buat bucket manual lewat Dashboard > Storage > New
--    bucket, nama persis `observasi-file`, centang Public — lalu jalankan
--    ulang HANYA blok `create policy "observasi-file ..."` di atas.
-- 2. Bucket ini PUBLIC: siapa pun yang punya URL berkasnya bisa membuka tanpa
--    login (sama seperti `modul-pdf`). Nama objek berisi UUID mahasiswa +
--    timestamp sehingga praktis tidak bisa ditebak, tapi kalau nanti laporan
--    observasi dianggap data sensitif, ubah bucket jadi private lalu ganti
--    getPublicUrl() → createSignedUrl() di src/lib/observasi.ts (satu tempat,
--    fungsi uploadObservasiFile()).
-- 3. Mahasiswa yang belum punya `class_id` TIDAK akan melihat satu pun tugas
--    observasi (lihat policy "mahasiswa lihat tugas observasi dosennya").
--    Pastikan mahasiswa uji coba sudah bergabung ke kelas lewat Kode Kelas.
-- 4. Tidak ada backfill data — tabel dimulai kosong. Dosen membuat tugas
--    pertamanya dari /asesmen > tab "Aktivitas Mandiri".
