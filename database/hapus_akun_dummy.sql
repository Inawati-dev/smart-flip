-- Hapus akun "Mahasiswa Dummy" (antrean #174, 10 Okt 2026). SEKALI JALAN, bukan migrasi.
-- TIDAK bisa dibatalkan: akun, profil, dan seluruh pengerjaannya ikut terhapus.
--
-- LANGKAH 1. Jalankan blok ini dulu dan baca hasilnya. Yang tampil adalah
-- persis akun yang akan dihapus di langkah 2. Kalau ada nama yang bukan
-- akun uji, BERHENTI dan jangan lanjut.

select p.full_name, p.nim_nidn, p.role, c.name as kelas, c.code as kode_kelas
from profiles p
left join classes c on c.id = p.class_id
where p.full_name ilike 'Mahasiswa Dummy%'
  and p.role = 'mahasiswa'
order by p.full_name;

-- LANGKAH 2. Sesudah daftar di atas benar, hapus tanda "--" di depan dua
-- baris berikut, lalu jalankan HANYA dua baris itu.

-- delete from auth.users
-- where id in (select id from profiles where full_name ilike 'Mahasiswa Dummy%' and role = 'mahasiswa');

-- LANGKAH 3. Cek sesudahnya (harus 0):
-- select count(*) from profiles where full_name ilike 'Mahasiswa Dummy%';

-- Kelas berkode DUMMY-… tidak ikut terhapus; kelasnya menjadi kosong dan bisa
-- dihapus dari halaman Kelas dengan tombol tempat sampah.
