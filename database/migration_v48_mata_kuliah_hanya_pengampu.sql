-- migration_v48_mata_kuliah_hanya_pengampu.sql (antrean #250, 18 Okt 2026)
--
-- Keputusan Johan: "Hanya pengampu" boleh mengubah atau menghapus mata kuliah.
-- Sebelumnya policy "dosen manage courses" (v23) FOR ALL mengizinkan dosen mana pun.
-- Sekarang:
--   - semua pengguna masuk tetap boleh membaca (policy "all read courses", tidak diubah);
--   - dosen mana pun boleh menambah mata kuliah baru;
--   - mengubah dan menghapus hanya oleh pengampu (courses.dosen_id = pemanggil),
--     atau oleh dosen mana pun bila mata kuliah itu belum punya pengampu.
-- Perpindahan pengampu tetap dijaga pemicu kunci_pengampu_mata_kuliah (v45).
-- SQL Editor (pemilik basis data) tidak terkena policy. Aman dijalankan ulang.

-- LANGKAH 1 (pratinjau): mata kuliah dan pengampunya. Mata kuliah tanpa pengampu
-- tetap bisa diubah dosen mana pun sampai seseorang mengisi kodenya di halaman Kelas.
-- select co.id, co.code, co.name, p.full_name as pengampu from courses co left join profiles p on p.id = co.dosen_id order by co.order_num;

DROP POLICY IF EXISTS "dosen manage courses" ON courses;
DROP POLICY IF EXISTS "dosen tambah courses" ON courses;
DROP POLICY IF EXISTS "pengampu ubah courses" ON courses;
DROP POLICY IF EXISTS "pengampu hapus courses" ON courses;

-- pengampu mata kuliah baru hanya diri sendiri atau kosong (sanggahan pemeriksa #250)
CREATE POLICY "dosen tambah courses" ON courses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen') AND (dosen_id = auth.uid() OR dosen_id IS NULL));
CREATE POLICY "pengampu ubah courses" ON courses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen') AND (dosen_id = auth.uid() OR dosen_id IS NULL))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen'));
CREATE POLICY "pengampu hapus courses" ON courses FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dosen') AND (dosen_id = auth.uid() OR dosen_id IS NULL));

NOTIFY pgrst, 'reload schema';

-- Cek sesudah dijalankan (harus 4 baris: all read courses, dosen tambah courses,
-- pengampu hapus courses, pengampu ubah courses; tidak ada "dosen manage courses"):
-- select policyname, cmd from pg_policies where tablename = 'courses' order by policyname;
