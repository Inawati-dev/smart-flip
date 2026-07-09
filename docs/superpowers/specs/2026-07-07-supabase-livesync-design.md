# Supabase Live Sync — Design Spec

Date: 2026-07-07
Status: approved (user opted for full scope, minimal review cycles, refactor allowed)

## Goal
Ganti seluruh data layer SMART-FLIP dari localStorage-demo ke Supabase asli, tanpa mengubah kontrak `DataLayer.*` yang dipakai 13+ halaman. Fallback ke localStorage kalau Supabase call gagal (network/RLS), supaya UI tidak blank.

## Constraint kunci
- `database/schema.sql` SUDAH live di project Supabase produksi → migrasi harus additive (`ALTER TABLE ADD COLUMN`, `CREATE TABLE IF NOT EXISTS`), tidak boleh drop/rename yang merusak data lama. Pengecualian: `draft_comments.dosen_id` → rename ke `author_id` (kolom lama belum dipakai data nyata, aman).
- Tiap tabel/kolom baru via SQL wajib RLS + GRANT eksplisit (anon/authenticated) — RLS saja tidak cukup, tabel bakal kosong di frontend kalau GRANT lupa.
- Tidak ada `supabase.js` di worktree ini (gitignored) → tidak bisa browser-test Supabase call di sini. User test manual di folder utama setelah migration dijalankan.

## Perubahan schema (`database/migration_v1_livesync.sql`)
- `profiles` + prodi, angkatan, vark_scores(jsonb), vark_dominant(text), vark_completed_at(timestamptz)
- `user_progress` + pct(int), current_page(int), last_opened(timestamptz), seq_state(jsonb), refleksi_checks(jsonb) — waktu belajar pakai `time_spent` yang sudah ada (increment langsung via read-modify-write, tanpa tabel log baru)
- `drafts` + content(text), status(text, check submitted/revision/reviewed)
- `draft_comments`: rename `dosen_id`→`author_id`, + `author_role`(text, check mahasiswa/dosen); RLS diperluas: pemilik draf juga boleh insert komentar balasan di draf miliknya sendiri
- `forum_posts` + likes(int default 0); RPC `increment_forum_likes(post_id)` (atomic increment)
- Tabel baru: `notifications`, `feedback`, `validasi_ahli` — masing-masing RLS (own row) + GRANT
- Manajemen modul (edit metadata/reorder dosen) pakai UPDATE langsung ke `modules` (RLS "dosen manage modules" sudah ada di schema.sql) — tidak perlu tabel `module_custom` terpisah

## data-layer.js
- `USE_SUPABASE` jadi auto-detect: `typeof sb !== 'undefined'` (bukan hardcode `false`)
- Semua ~26 method public aktifkan Supabase call sesuai nama tabel/kolom final di atas (komentar TODO lama di file ini salah/tidak sinkron dengan schema asli — diganti total, bukan di-uncomment)
- Try/catch per method: gagal Supabase → fallback baca localStorage, `console.warn`, tidak throw ke UI

## Halaman yang butuh fix tambahan (bypass DataLayer, hardcode demo)
- `analitik.html` — array `STUDENTS` hardcode → ganti query agregat real per mahasiswa (profiles + user_progress + quiz_attempts + feedback)
- `dashboard-dos.html` konsumen `DataLayer.getClassStats()` — ganti agregat real per modul (modules + user_progress + quiz_attempts)
- `ngain.html` — `dummyData` hardcode pre/post-test → ganti baca quiz_attempts asli (2 attempt pertama per modul sebagai pre/post proxy, atau kolom baru jika perlu — cek isi file saat eksekusi)

## Out of scope
- Laporan Akhir, Artikel Ilmiah, HKI (sudah didefer di CLAUDE.md roadmap)
- Storage bucket (belum ada upload file draf sebagai file — masih textarea content)
