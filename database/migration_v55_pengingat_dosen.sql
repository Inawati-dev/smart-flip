-- Migration v55 (antrean #338, 25 Okt 2026): tombol "Ingatkan" di tab Perlu
-- Perhatian Dashboard dosen. Johan menjalankan berkas ini di Supabase SQL Editor.
--
-- Tabel notifications (v1) dipakai untuk pengingat dosen ke mahasiswa:
--   type      = 'pengingat'
--   sender_id = dosen pengirim (diisi otomatis auth.uid())
-- Kebijakan lama "user manage own notifications" tetap: mahasiswa membaca dan
-- menandai dibaca baris miliknya sendiri. Kebijakan baru:
--   - dosen boleh INSERT pengingat hanya untuk mahasiswanya (is_dosen_of, v40),
--     sebagai dirinya sendiri, dan paling banyak satu per mahasiswa per 24 jam;
--   - dosen boleh SELECT pengingat yang ia kirim, untuk label "diingatkan ... lalu".
-- Sebelum berkas ini dijalankan, tombol Ingatkan menampilkan pesan gagal kirim.
--
-- Aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user manage own notifications" ON notifications;
CREATE POLICY "user manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS notifications_user_type_idx ON notifications (user_id, type, created_at DESC);

-- Jeda 24 jam diperiksa di fungsi SECURITY DEFINER supaya subkueri ke tabel
-- yang sama tidak bergantung pada kebijakan SELECT.
CREATE OR REPLACE FUNCTION boleh_ingatkan(target uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_dosen_of(target)
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = target AND n.type = 'pengingat'
        AND n.sender_id = auth.uid()
        AND n.created_at > now() - interval '24 hours'
    );
$$;
REVOKE ALL ON FUNCTION boleh_ingatkan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION boleh_ingatkan(uuid) TO authenticated;

DROP POLICY IF EXISTS "dosen kirim pengingat" ON notifications;
CREATE POLICY "dosen kirim pengingat" ON notifications FOR INSERT TO authenticated
  WITH CHECK (type = 'pengingat' AND sender_id = auth.uid() AND public.boleh_ingatkan(user_id));

DROP POLICY IF EXISTS "dosen lihat pengingat kirimannya" ON notifications;
CREATE POLICY "dosen lihat pengingat kirimannya" ON notifications FOR SELECT TO authenticated
  USING (type = 'pengingat' AND sender_id = auth.uid());

-- Hak per kolom (temuan pemeriksa): klien hanya boleh mengisi user_id, type,
-- title, body saat INSERT dan hanya `read` saat UPDATE. created_at dan
-- sender_id selalu dari DEFAULT server, jadi jeda 24 jam tidak bisa ditembus
-- dengan created_at lama, dan mahasiswa tidak bisa mengunci pengingat dengan
-- created_at masa depan atau sender_id palsu.
REVOKE INSERT, UPDATE ON notifications FROM authenticated, anon;
GRANT SELECT ON notifications TO authenticated;
GRANT INSERT (user_id, type, title, body) ON notifications TO authenticated;
GRANT UPDATE (read) ON notifications TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE notifications_id_seq TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Verifikasi (jalankan sesudahnya):
-- 1) harapan 3 baris kebijakan:
-- SELECT policyname FROM pg_policies WHERE tablename = 'notifications' ORDER BY 1;
-- 2) harapan 1 baris kolom:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'sender_id';
-- 3) harapan 5 baris (INSERT: body, title, type, user_id; UPDATE: read), tanpa created_at dan sender_id:
-- SELECT privilege_type, column_name FROM information_schema.column_privileges
--   WHERE table_name = 'notifications' AND grantee = 'authenticated' AND privilege_type IN ('INSERT', 'UPDATE') ORDER BY 1, 2;
