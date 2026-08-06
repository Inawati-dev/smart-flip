-- ════════════════════════════════════════════
--  MIGRATION v16 — Kode undangan dosen bisa dikelola dari aplikasi
-- ════════════════════════════════════════════
-- Konteks: sejak migration_v6, kode undangan dosen disimpan di tabel
-- `dosen_invite_codes` (satu baris) dengan RLS aktif TANPA satu pun policy —
-- artinya benar-benar tidak ada klien (anon maupun authenticated) yang bisa
-- membacanya. Yang bisa melihat isinya cuma handle_new_user(), karena
-- SECURITY DEFINER berjalan dengan hak pemilik fungsi, bukan hak pemanggil.
--
-- Konsekuensinya sampai sekarang: mengganti kode HARUS lewat SQL Editor, dan
-- kode juga digandakan di env build-time VITE_DOSEN_INVITE_CODE untuk
-- pengecekan sisi klien di Register.tsx. Dua sumber kebenaran yang gampang
-- lepas sinkron — ganti kode di DB tanpa rebuild frontend = pendaftaran dosen
-- ikut rusak, karena klien menolak duluan sebelum servernya sempat menilai.
--
-- Migration ini membuka jalur terkontrol lewat tiga RPC SECURITY DEFINER,
-- tanpa pernah memberi policy langsung ke tabelnya (tabel tetap tertutup
-- rapat; hanya fungsi-fungsi di bawah ini pintunya):
--
--   1. verify_dosen_invite_code(text) -> boolean
--      Boleh dipanggil siapa saja TERMASUK anon — dipakai Register.tsx
--      menggantikan perbandingan terhadap env build-time. Hanya membalas
--      true/false; kode aslinya TIDAK PERNAH ikut terkirim ke klien, jadi
--      ini tidak membocorkan apa pun yang belum diketahui pemanggil.
--      (Penebakan kasar tetap mungkin secara teori — sama persis seperti
--      sebelumnya lewat percobaan signUp berulang — jadi ini bukan pelemahan
--      dibanding keadaan sekarang. Pakai kode yang panjang & acak.)
--
--   2. get_dosen_invite_code() -> text
--      HANYA untuk dosen. Dipakai halaman Pengaturan supaya dosen bisa
--      melihat kode yang berlaku dan membagikannya ke calon dosen lain.
--
--   3. set_dosen_invite_code(text) -> void
--      HANYA untuk dosen. Mengganti kode sekaligus mencatat waktunya.
--
-- Jalankan di Supabase SQL Editor SETELAH v6 (dan v13) sudah diterapkan.

-- ── 1. Verifikasi kode (boleh dipanggil anon, hanya balas boolean) ──
CREATE OR REPLACE FUNCTION verify_dosen_invite_code(submitted TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  real_code TEXT;
BEGIN
  IF submitted IS NULL OR btrim(submitted) = '' THEN
    RETURN FALSE;
  END IF;
  SELECT code INTO real_code FROM dosen_invite_codes WHERE id = true;
  -- Fail-closed: kalau barisnya belum ada, tolak — jangan sampai tabel
  -- kosong malah berarti "semua kode diterima".
  IF real_code IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN btrim(submitted) = real_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 2. Baca kode yang berlaku (dosen saja) ──
CREATE OR REPLACE FUNCTION get_dosen_invite_code()
RETURNS TEXT AS $$
DECLARE
  caller_role TEXT;
  real_code   TEXT;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS DISTINCT FROM 'dosen' THEN
    RAISE EXCEPTION 'Hanya dosen yang boleh melihat kode undangan.';
  END IF;
  SELECT code INTO real_code FROM dosen_invite_codes WHERE id = true;
  RETURN real_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 3. Ganti kode (dosen saja) ──
CREATE OR REPLACE FUNCTION set_dosen_invite_code(new_code TEXT)
RETURNS VOID AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS DISTINCT FROM 'dosen' THEN
    RAISE EXCEPTION 'Hanya dosen yang boleh mengganti kode undangan.';
  END IF;
  IF new_code IS NULL OR length(btrim(new_code)) < 6 THEN
    RAISE EXCEPTION 'Kode undangan minimal 6 karakter.';
  END IF;

  INSERT INTO dosen_invite_codes (id, code, updated_at)
  VALUES (true, btrim(new_code), NOW())
  ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── Hak eksekusi ──
-- verify_* sengaja dibuka ke anon: pendaftaran terjadi SEBELUM ada sesi.
GRANT EXECUTE ON FUNCTION verify_dosen_invite_code(TEXT) TO anon, authenticated;
-- get_*/set_* cuma untuk sesi yang sudah login; pengecekan peran dosen
-- tetap dilakukan di dalam fungsinya, GRANT ini lapis pertama saja.
GRANT EXECUTE ON FUNCTION get_dosen_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION set_dosen_invite_code(TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION get_dosen_invite_code() FROM anon;
REVOKE EXECUTE ON FUNCTION set_dosen_invite_code(TEXT) FROM anon;

-- ════════════════════════════════════════════
--  CATATAN — langkah setelah run
-- ════════════════════════════════════════════
-- 1. Cek kode yang sedang berlaku:
--      SELECT code FROM dosen_invite_codes WHERE id = true;
--    Kalau masih 'GANTI_KODE_INI_SEKARANG' (nilai bawaan v6), segera ganti —
--    lewat halaman Pengaturan di aplikasi, atau langsung:
--      UPDATE dosen_invite_codes SET code = 'kode-rahasia-anda', updated_at = NOW() WHERE id = true;
--
-- 2. Setelah migration ini, Register.tsx memverifikasi lewat RPC di atas,
--    BUKAN lagi ke env VITE_DOSEN_INVITE_CODE. Jadi mengganti kode dari
--    halaman Pengaturan langsung berlaku tanpa perlu rebuild/redeploy.
--    Env VITE_DOSEN_INVITE_CODE boleh dibiarkan (sudah tidak dibaca) atau
--    dihapus dari Vercel sekalian biar tidak menyesatkan di kemudian hari.
--
-- 3. Semua dosen bisa melihat & mengganti kode ini. Itu memang disengaja —
--    proyek ini tidak punya peran "admin" terpisah, dosen adalah tingkat
--    kepercayaan tertinggi. Kalau nanti perlu dibatasi ke satu orang saja,
--    tambahkan kolom penanda (mis. profiles.is_owner) dan ketatkan pengecekan
--    peran di dalam get_/set_ di atas.
