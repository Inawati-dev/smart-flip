-- Uji hak akses tabel `laporan` (migration v58, antrean #373). Johan menjalankannya di Supabase SQL Editor.
-- AMAN: seluruh pengujian dijalankan di dalam satu blok yang SENGAJA digagalkan di akhir (RAISE EXCEPTION), jadi semua
-- baris uji ikut dibatalkan dan tidak ada data tersisa. Hasilnya muncul sebagai teks pesan galat berjudul "HASIL UJI".
-- Butuh minimal satu mahasiswa dan satu dosen di tabel profiles. Yang diuji, harapan LULUS semua:
--   1 mahasiswa boleh mengirim laporan valid
--   2 mahasiswa TIDAK boleh mengisi status sendiri (hak per kolom)
--   3 isi terlalu pendek ditolak (CHECK)
--   4 mahasiswa hanya melihat laporannya sendiri
--   5 mahasiswa TIDAK bisa mengubah status (kebijakan hanya dosen)
--   6 batas 10 kiriman per jam: tepat 9 lagi berhasil sesudah satu kiriman, sisanya ditolak
--   7 dosen melihat laporan mahasiswa
--   8 dosen boleh mengubah status
--   9 dosen TIDAK boleh mengubah isi laporan (hak per kolom)
--  10 anon (belum masuk) TIDAK boleh membaca

DO $$
DECLARE
  mhs uuid;
  dsn uuid;
  hasil text := '';
  n int;
  berhasil int := 0;
  i int;
BEGIN
  SELECT id INTO mhs FROM profiles WHERE role = 'mahasiswa' LIMIT 1;
  SELECT id INTO dsn FROM profiles WHERE role = 'dosen' LIMIT 1;
  IF mhs IS NULL OR dsn IS NULL THEN
    RAISE EXCEPTION 'Butuh minimal satu mahasiswa dan satu dosen di tabel profiles';
  END IF;

  -- Masuk sebagai mahasiswa.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', mhs, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO laporan (jenis, isi, halaman) VALUES ('bug', 'uji otomatis: isi cukup panjang', '/uji');
    hasil := hasil || E'1  mahasiswa kirim laporan valid: LULUS\n';
  EXCEPTION WHEN OTHERS THEN
    hasil := hasil || format(E'1  mahasiswa kirim laporan valid: GAGAL (%s)\n', SQLERRM);
  END;

  BEGIN
    INSERT INTO laporan (jenis, isi, status) VALUES ('saran', 'uji otomatis: status curang', 'selesai');
    hasil := hasil || E'2  mahasiswa mengisi status sendiri: GAGAL (seharusnya ditolak)\n';
  EXCEPTION WHEN OTHERS THEN
    hasil := hasil || E'2  mahasiswa tidak boleh mengisi status: LULUS\n';
  END;

  BEGIN
    INSERT INTO laporan (jenis, isi) VALUES ('saran', 'ab');
    hasil := hasil || E'3  isi terlalu pendek: GAGAL (seharusnya ditolak)\n';
  EXCEPTION WHEN OTHERS THEN
    hasil := hasil || E'3  isi terlalu pendek ditolak: LULUS\n';
  END;

  SELECT count(*) INTO n FROM laporan WHERE user_id <> mhs;
  hasil := hasil || CASE WHEN n = 0 THEN E'4  mahasiswa hanya melihat miliknya: LULUS\n' ELSE format(E'4  mahasiswa melihat milik orang lain: GAGAL (%s baris)\n', n) END;

  UPDATE laporan SET status = 'dibaca' WHERE user_id = mhs;
  GET DIAGNOSTICS n = ROW_COUNT;
  hasil := hasil || CASE WHEN n = 0 THEN E'5  mahasiswa tidak bisa mengubah status: LULUS\n' ELSE format(E'5  mahasiswa mengubah status: GAGAL (%s baris)\n', n) END;

  FOR i IN 1..15 LOOP
    BEGIN
      INSERT INTO laporan (jenis, isi) VALUES ('saran', 'uji otomatis batas kiriman ke-' || i);
      berhasil := berhasil + 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
  hasil := hasil || CASE WHEN berhasil = 9 THEN E'6  batas 10 kiriman per jam: LULUS\n' ELSE format(E'6  batas 10 kiriman per jam: GAGAL (%s berhasil, seharusnya 9)\n', berhasil) END;

  RESET ROLE;

  -- Masuk sebagai dosen.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', dsn, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO n FROM laporan WHERE user_id = mhs;
  hasil := hasil || CASE WHEN n >= 10 THEN E'7  dosen melihat laporan mahasiswa: LULUS\n' ELSE format(E'7  dosen melihat laporan mahasiswa: GAGAL (%s baris)\n', n) END;

  UPDATE laporan SET status = 'dibaca' WHERE user_id = mhs AND status = 'baru';
  GET DIAGNOSTICS n = ROW_COUNT;
  hasil := hasil || CASE WHEN n > 0 THEN E'8  dosen mengubah status: LULUS\n' ELSE E'8  dosen mengubah status: GAGAL (0 baris)\n' END;

  BEGIN
    UPDATE laporan SET isi = 'isi diubah dosen' WHERE user_id = mhs;
    hasil := hasil || E'9  dosen mengubah isi: GAGAL (seharusnya ditolak)\n';
  EXCEPTION WHEN OTHERS THEN
    hasil := hasil || E'9  dosen tidak boleh mengubah isi: LULUS\n';
  END;

  RESET ROLE;

  -- Belum masuk (anon).
  SET LOCAL ROLE anon;
  BEGIN
    SELECT count(*) INTO n FROM laporan;
    hasil := hasil || E'10 anon membaca laporan: GAGAL (seharusnya ditolak)\n';
  EXCEPTION WHEN OTHERS THEN
    hasil := hasil || E'10 anon tidak boleh membaca: LULUS\n';
  END;
  RESET ROLE;

  RAISE EXCEPTION E'HASIL UJI (dibatalkan otomatis, tidak ada data tersisa):\n%', hasil;
END
$$;
