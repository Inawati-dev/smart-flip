-- Uji lampiran gambar pada tabel `laporan` (migration v59, antrean #377). Johan menjalankannya di Supabase SQL Editor,
-- SESUDAH v59. Pola sama dengan uji_laporan.sql.
-- AMAN: seluruh pengujian berjalan di satu blok yang SENGAJA digagalkan di akhir (RAISE EXCEPTION), jadi semua baris uji
-- ikut dibatalkan dan tidak ada data tersisa. Hasil muncul sebagai teks pesan galat berjudul "HASIL UJI".
-- Butuh minimal satu mahasiswa dan satu dosen di tabel profiles; uji 9 butuh mahasiswa kedua (bila tidak ada: DILEWATI).
-- Harapan LULUS semua:
--   1 mahasiswa boleh mengirim laporan dengan lampiran PNG valid
--   2 penanda ada_lampiran terisi otomatis
--   3 lampiran bukan gambar (data:text/html) ditolak
--   4 lampiran SVG ditolak (bisa memuat skrip)
--   5 lampiran lebih dari 1.500.000 karakter ditolak
--   6 lampiran dengan karakter base64 tidak sah ditolak
--   7 mahasiswa TIDAK bisa mengubah lampiran sesudah terkirim
--   8 mahasiswa lain tidak melihat laporan (dan lampiran) milik orang lain
--   9 dosen bisa membaca lampiran
--  10 dosen TIDAK boleh mengubah lampiran
--  11 anon (belum masuk) TIDAK boleh membaca lampiran

DO $$
DECLARE
  mhs uuid;
  mhs2 uuid;
  dsn uuid;
  hasil text := '';
  n int;
  png text := 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
BEGIN
  SELECT id INTO mhs FROM profiles WHERE role = 'mahasiswa' LIMIT 1;
  SELECT id INTO mhs2 FROM profiles WHERE role = 'mahasiswa' AND id <> mhs LIMIT 1;
  SELECT id INTO dsn FROM profiles WHERE role = 'dosen' LIMIT 1;
  IF mhs IS NULL OR dsn IS NULL THEN
    RAISE EXCEPTION 'Butuh minimal satu mahasiswa dan satu dosen di tabel profiles';
  END IF;

  -- Masuk sebagai mahasiswa.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', mhs, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO laporan (jenis, isi, lampiran) VALUES ('bug', 'uji lampiran valid: isi cukup panjang', png);
    hasil := hasil || E'1  kirim dengan lampiran PNG valid: LULUS\n';
  EXCEPTION WHEN OTHERS THEN
    hasil := hasil || format(E'1  kirim dengan lampiran PNG valid: GAGAL (%s)\n', SQLERRM);
  END;

  SELECT count(*) INTO n FROM laporan WHERE user_id = mhs AND ada_lampiran AND isi LIKE 'uji lampiran valid%';
  hasil := hasil || CASE WHEN n = 1 THEN E'2  ada_lampiran terisi otomatis: LULUS\n' ELSE format(E'2  ada_lampiran terisi otomatis: GAGAL (%s baris)\n', n) END;

  BEGIN
    INSERT INTO laporan (jenis, isi, lampiran) VALUES ('bug', 'uji lampiran bukan gambar', 'data:text/html;base64,PHNjcmlwdD4=');
    hasil := hasil || E'3  lampiran bukan gambar: GAGAL (seharusnya ditolak)\n';
  EXCEPTION WHEN OTHERS THEN
    hasil := hasil || E'3  lampiran bukan gambar ditolak: LULUS\n';
  END;

  BEGIN
    INSERT INTO laporan (jenis, isi, lampiran) VALUES ('bug', 'uji lampiran svg', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=');
    hasil := hasil || E'4  lampiran SVG: GAGAL (seharusnya ditolak)\n';
  EXCEPTION WHEN OTHERS THEN
    hasil := hasil || E'4  lampiran SVG ditolak: LULUS\n';
  END;

  BEGIN
    INSERT INTO laporan (jenis, isi, lampiran) VALUES ('bug', 'uji lampiran terlalu besar', 'data:image/png;base64,' || repeat('A', 1500000));
    hasil := hasil || E'5  lampiran terlalu besar: GAGAL (seharusnya ditolak)\n';
  EXCEPTION WHEN OTHERS THEN
    hasil := hasil || E'5  lampiran terlalu besar ditolak: LULUS\n';
  END;

  BEGIN
    INSERT INTO laporan (jenis, isi, lampiran) VALUES ('bug', 'uji lampiran base64 rusak', 'data:image/png;base64,AAAA<script>');
    hasil := hasil || E'6  lampiran base64 rusak: GAGAL (seharusnya ditolak)\n';
  EXCEPTION WHEN OTHERS THEN
    hasil := hasil || E'6  lampiran base64 rusak ditolak: LULUS\n';
  END;

  BEGIN
    UPDATE laporan SET lampiran = NULL WHERE user_id = mhs;
    GET DIAGNOSTICS n = ROW_COUNT;
    hasil := hasil || CASE WHEN n = 0 THEN E'7  mahasiswa tidak bisa mengubah lampiran: LULUS\n' ELSE format(E'7  mahasiswa mengubah lampiran: GAGAL (%s baris)\n', n) END;
  EXCEPTION WHEN OTHERS THEN
    hasil := hasil || E'7  mahasiswa tidak boleh mengubah lampiran: LULUS\n';
  END;

  RESET ROLE;

  -- Masuk sebagai mahasiswa lain.
  IF mhs2 IS NULL THEN
    hasil := hasil || E'8  mahasiswa lain tidak melihat lampiran: DILEWATI (hanya satu mahasiswa)\n';
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', mhs2, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO n FROM laporan WHERE user_id = mhs;
    hasil := hasil || CASE WHEN n = 0 THEN E'8  mahasiswa lain tidak melihat lampiran: LULUS\n' ELSE format(E'8  mahasiswa lain melihat milik orang lain: GAGAL (%s baris)\n', n) END;
    RESET ROLE;
  END IF;

  -- Masuk sebagai dosen.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', dsn, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO n FROM laporan WHERE user_id = mhs AND lampiran = png;
  hasil := hasil || CASE WHEN n >= 1 THEN E'9  dosen membaca lampiran: LULUS\n' ELSE format(E'9  dosen membaca lampiran: GAGAL (%s baris)\n', n) END;

  BEGIN
    UPDATE laporan SET lampiran = NULL WHERE user_id = mhs;
    GET DIAGNOSTICS n = ROW_COUNT;
    hasil := hasil || CASE WHEN n = 0 THEN E'10 dosen tidak bisa mengubah lampiran: LULUS\n' ELSE format(E'10 dosen mengubah lampiran: GAGAL (%s baris)\n', n) END;
  EXCEPTION WHEN OTHERS THEN
    hasil := hasil || E'10 dosen tidak boleh mengubah lampiran: LULUS\n';
  END;

  RESET ROLE;

  -- Belum masuk (anon).
  SET LOCAL ROLE anon;
  BEGIN
    SELECT count(*) INTO n FROM laporan WHERE lampiran IS NOT NULL;
    hasil := hasil || E'11 anon membaca lampiran: GAGAL (seharusnya ditolak)\n';
  EXCEPTION WHEN OTHERS THEN
    hasil := hasil || E'11 anon tidak boleh membaca lampiran: LULUS\n';
  END;
  RESET ROLE;

  RAISE EXCEPTION E'HASIL UJI (dibatalkan otomatis, tidak ada data tersisa):\n%', hasil;
END
$$;
