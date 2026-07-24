-- SMART-FLIP 5.0 — migration v3
-- Adds a public Storage bucket for dosen-uploaded module PDFs, plus RLS
-- policies: any authenticated user can read (students need to open the
-- file), only dosen can upload/replace/delete.
--
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Safe to re-run — every statement is idempotent (ON CONFLICT / IF NOT EXISTS).

insert into storage.buckets (id, name, public)
values ('modul-pdf', 'modul-pdf', true)
on conflict (id) do nothing;

-- Anyone (including anon) can read — the bucket is public so this mostly
-- documents intent; getPublicUrl() already bypasses RLS for public buckets.
drop policy if exists "modul-pdf read" on storage.objects;
create policy "modul-pdf read"
  on storage.objects for select
  using (bucket_id = 'modul-pdf');

-- Only dosen may upload/replace a module PDF. Checks profiles.role directly
-- (a self-contained EXISTS check) rather than assuming a specific helper
-- function name/signature already exists in this project's live database.
drop policy if exists "modul-pdf insert dosen" on storage.objects;
create policy "modul-pdf insert dosen"
  on storage.objects for insert
  with check (
    bucket_id = 'modul-pdf'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'dosen')
  );

drop policy if exists "modul-pdf update dosen" on storage.objects;
create policy "modul-pdf update dosen"
  on storage.objects for update
  using (
    bucket_id = 'modul-pdf'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'dosen')
  );

drop policy if exists "modul-pdf delete dosen" on storage.objects;
create policy "modul-pdf delete dosen"
  on storage.objects for delete
  using (
    bucket_id = 'modul-pdf'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'dosen')
  );

-- ✅ Checklist:
-- [ ] Jalankan file ini di Supabase SQL Editor (project smart-flip)
-- [ ] Verifikasi bucket muncul di Storage > modul-pdf, marked Public
-- [ ] Login sebagai dosen di Manajemen Modul, upload 1 PDF test, cek
--     modules.pdf_path ke-update dan mahasiswa bisa buka di /ebook
