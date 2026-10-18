-- migration_v39: pengguna aplikasi tidak lagi bisa menghapus baris catatan baca dan catatan tonton (antrean #226 butir 3, 18 Okt 2026).
-- Alasan: penjaga v38 hanya menjaga INSERT dan UPDATE. Lewat permintaan buatan tangan, mahasiswa bisa DELETE barisnya
-- lalu menulis ulang dengan nilai lebih rendah. Aplikasi tidak pernah menghapus baris user_progress atau video_progress
-- (grep `.delete()` di src, 18 Okt 2026). Penghapusan dari SQL Editor (peran postgres) dan ON DELETE CASCADE saat modul
-- atau profil dihapus tetap berjalan, karena keduanya tidak memakai hak peran anon/authenticated.
-- Jalankan sekali di Supabase SQL Editor.

REVOKE DELETE ON public.user_progress FROM anon, authenticated;

DO $$
BEGIN
  IF to_regclass('public.video_progress') IS NOT NULL THEN
    REVOKE DELETE ON public.video_progress FROM anon, authenticated;
  END IF;
END $$;

-- Verifikasi (jalankan manual): hasil yang benar 0 baris.
--   select table_name, grantee from information_schema.role_table_grants
--   where table_name in ('user_progress', 'video_progress') and privilege_type = 'DELETE'
--     and grantee in ('anon', 'authenticated');
-- Membatalkan: GRANT DELETE ON public.user_progress TO authenticated; (dan video_progress bila perlu)
