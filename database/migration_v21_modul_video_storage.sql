-- SMART-FLIP 5.0 — migration v21
-- Adds a public Storage bucket for dosen-uploaded module video files
-- (antrean #44a, "tambahkan video juga tidak hanya tautan"), mirroring
-- migration_v3_modul_pdf_storage.sql: any authenticated user can read
-- (students watch the file), only dosen can upload/replace/delete.
-- 100 MB limit, mp4/webm only — matches the client-side check in Video.tsx.
--
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Safe to re-run — every statement is idempotent (ON CONFLICT / IF NOT EXISTS).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('modul-video', 'modul-video', true, 104857600, array['video/mp4', 'video/webm'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone (including anon) can read — the bucket is public so this mostly
-- documents intent; getPublicUrl() already bypasses RLS for public buckets.
drop policy if exists "modul-video read" on storage.objects;
create policy "modul-video read"
  on storage.objects for select
  using (bucket_id = 'modul-video');

-- Only dosen may upload/replace a module video. Checks profiles.role
-- directly (a self-contained EXISTS check), same pattern as modul-pdf.
drop policy if exists "modul-video insert dosen" on storage.objects;
create policy "modul-video insert dosen"
  on storage.objects for insert
  with check (
    bucket_id = 'modul-video'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'dosen')
  );

drop policy if exists "modul-video update dosen" on storage.objects;
create policy "modul-video update dosen"
  on storage.objects for update
  using (
    bucket_id = 'modul-video'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'dosen')
  );

drop policy if exists "modul-video delete dosen" on storage.objects;
create policy "modul-video delete dosen"
  on storage.objects for delete
  using (
    bucket_id = 'modul-video'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'dosen')
  );

-- ✅ Checklist:
-- [ ] Jalankan file ini di Supabase SQL Editor (project smart-flip)
-- [ ] Verifikasi bucket muncul di Storage > modul-video, marked Public, limit 100 MB
-- [ ] Login sebagai dosen di Video, unggah 1 file mp4 test, cek modules.video_url
--     ke-update dan mahasiswa bisa memutarnya di /video

-- Verifikasi cepat (jalankan setelah migrasi):
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'modul-video';
