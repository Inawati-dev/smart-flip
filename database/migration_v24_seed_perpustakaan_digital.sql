-- SMART-FLIP 5.0 - migration v24: seed bank soal mata kuliah Perpustakaan
-- Digital (DRAF untuk direview dosen, belum siap dipakai mahasiswa).
-- Tanggal 16 Sep 2026. Syarat: migration_v23_mata_kuliah.sql sudah
-- dijalankan (courses.id = 2, 9 topik course_id = 2, kolom
-- quiz_questions.course_id sudah ada).
--
-- Isi: 10 soal pre-test, 10 soal post-test, 27 soal formatif (3 x 9 topik),
-- 5 soal tes kelompok. Total 52 soal, 4 opsi, kunci di answer_idx (0 = A).
-- Materi: pengetahuan umum perpustakaan digital (definisi, komponen,
-- sejarah internet, pengembangan koleksi, metadata Dublin Core 15 elemen
-- dan perbandingan MARC, alih media/OCR, perangkat lunak DSpace/Greenstone/
-- SLiMS/Eprints, temu kembali informasi/OPAC, preservasi/LOCKSS, hak
-- cipta/Creative Commons, peran pustakawan digital dan literasi informasi).
-- Pola penulisan dan gaya idempoten mengikuti migration_v20_seed_soal.sql.
--
-- Formatif: dipilih SATU INSERT dengan subquery module_id per baris dan
-- SATU WHERE NOT EXISTS untuk seluruh course 2 (bukan 9 blok terpisah)
-- karena lebih sederhana - satu pernyataan, satu baca ulang saat idempoten
-- dicek, dan urutan topik tetap terjaga lewat kolom v.topic.

-- ════════════════════════════════════════════
--  1. Pre-test (10 soal, mencakup 9 topik)
-- ════════════════════════════════════════════
INSERT INTO quiz_questions (kind, module_id, course_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('pre', NULL::INT, 2, 'Definisi perpustakaan digital yang paling tepat adalah…', '["Ruangan fisik yang menyimpan buku cetak dalam jumlah besar", "Kumpulan koleksi digital yang dikelola dan dapat diakses melalui jaringan disertai layanan kepada pemustaka", "Situs web berita yang diperbarui setiap hari", "Aplikasi pengolah kata untuk menulis skripsi"]'::JSONB, 1, 'Perpustakaan digital adalah kumpulan koleksi digital terkelola yang diakses lewat jaringan dan disertai layanan, bukan sekadar ruangan fisik atau situs berita.', 1),
  ('pre', NULL::INT, 2, 'Salah satu alasan utama perpustakaan melakukan digitalisasi koleksi adalah…', '["Mengurangi jumlah pemustaka yang berkunjung", "Memperluas akses pemustaka tanpa dibatasi jarak dan waktu", "Menghapus kebutuhan katalog", "Meniadakan hak cipta pengarang"]'::JSONB, 1, 'Digitalisasi memperluas akses karena koleksi bisa dibuka kapan saja dan dari mana saja lewat jaringan.', 2),
  ('pre', NULL::INT, 2, 'Format berkas yang umum dipakai untuk koleksi buku digital agar tata letak halaman tetap terjaga adalah…', '["PDF", "MP3", "CSV", "EXE"]'::JSONB, 0, 'PDF mempertahankan tata letak halaman persis seperti dokumen aslinya.', 3),
  ('pre', NULL::INT, 2, 'Unsur metadata Dublin Core yang mencatat nama pengarang atau pihak yang membuat karya adalah…', '["Publisher", "Creator", "Coverage", "Format"]'::JSONB, 1, 'Creator adalah elemen Dublin Core untuk pencipta atau pengarang karya.', 4),
  ('pre', NULL::INT, 2, 'Dibanding Dublin Core, format metadata MARC pada umumnya…', '["Lebih sederhana karena hanya punya 5 elemen", "Dirancang untuk laman web saja", "Lebih rinci dan kompleks, dipakai pada katalog perpustakaan tradisional", "Tidak bisa memuat judul buku"]'::JSONB, 2, 'MARC memiliki struktur ruas dan subruas yang jauh lebih rinci dibanding 15 elemen Dublin Core yang sederhana.', 5),
  ('pre', NULL::INT, 2, 'Proses mengubah hasil pindaian gambar teks menjadi teks yang bisa dicari dan disalin disebut…', '["Metadata", "OCR (Optical Character Recognition)", "Migrasi format", "Deposit mandiri"]'::JSONB, 1, 'OCR mengenali karakter dari gambar hasil pindaian dan mengubahnya menjadi teks yang dapat dicari.', 6),
  ('pre', NULL::INT, 2, 'Perangkat lunak sumber terbuka yang umum dipakai untuk membangun repositori institusi antara lain…', '["DSpace dan Eprints", "Microsoft Excel dan Word", "Photoshop dan Illustrator", "Zoom dan Google Meet"]'::JSONB, 0, 'DSpace dan Eprints adalah perangkat lunak repositori institusi sumber terbuka yang umum dipakai perpustakaan.', 7),
  ('pre', NULL::INT, 2, 'Sistem yang memungkinkan pemustaka menelusuri katalog perpustakaan secara daring disebut…', '["OPAC (Online Public Access Catalog)", "OCR", "LOCKSS", "Dublin Core"]'::JSONB, 0, 'OPAC adalah katalog daring yang dipakai pemustaka untuk menelusuri koleksi perpustakaan.', 8),
  ('pre', NULL::INT, 2, 'Strategi LOCKSS dalam preservasi digital bekerja dengan cara…', '["Menghapus salinan lama agar hemat penyimpanan", "Menyimpan banyak salinan tersebar di berbagai lokasi agar data tetap aman", "Mengunci koleksi supaya tidak bisa diakses", "Mengubah semua berkas menjadi format audio"]'::JSONB, 1, 'LOCKSS (Lots of Copies Keep Stuff Safe) menjaga keamanan data lewat banyak salinan yang tersebar.', 9),
  ('pre', NULL::INT, 2, 'Kemampuan menelusuri, menilai, dan memanfaatkan informasi secara efektif disebut…', '["Literasi informasi", "Migrasi format", "Katalogisasi", "Diseminasi"]'::JSONB, 0, 'Literasi informasi adalah kemampuan menemukan, menilai, dan memanfaatkan informasi secara efektif.', 10)
) AS v(kind, module_id, course_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'pre' AND course_id = 2);

-- ════════════════════════════════════════════
--  2. Post-test (10 soal, paralel dengan pre-test)
-- ════════════════════════════════════════════
INSERT INTO quiz_questions (kind, module_id, course_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('post', NULL::INT, 2, 'Ciri utama yang membedakan perpustakaan digital dari perpustakaan konvensional adalah…', '["Koleksinya berbentuk digital dan diakses lewat jaringan, bukan rak buku fisik", "Hanya bisa dikunjungi pada jam kerja", "Tidak memerlukan katalog", "Hanya menyimpan koran"]'::JSONB, 0, 'Perpustakaan digital berbasis koleksi digital yang diakses lewat jaringan, berbeda dari rak buku fisik perpustakaan konvensional.', 1),
  ('post', NULL::INT, 2, 'Manfaat digitalisasi koleksi bagi pemustaka yang paling terasa adalah…', '["Koleksi hanya bisa dipinjam satu orang dalam satu waktu", "Akses menjadi lebih luas karena bisa dibuka dari jarak jauh", "Biaya cetak buku meningkat", "Koleksi menjadi lebih mudah rusak"]'::JSONB, 1, 'Digitalisasi membuat koleksi bisa diakses dari jarak jauh kapan saja, memperluas jangkauan layanan.', 2),
  ('post', NULL::INT, 2, 'Alasan format EPUB dipilih untuk buku digital yang perlu menyesuaikan ukuran layar pembaca adalah…', '["EPUB bersifat reflowable sehingga teks menyesuaikan ukuran layar", "EPUB hanya bisa dibuka di satu jenis perangkat", "EPUB tidak mendukung gambar", "EPUB berukuran lebih besar dari video"]'::JSONB, 0, 'EPUB bersifat reflowable, teks menyesuaikan ukuran layar, berbeda dengan PDF yang tata letaknya tetap.', 3),
  ('post', NULL::INT, 2, 'Elemen Dublin Core yang mencatat topik atau kata kunci sebuah karya adalah…', '["Subject", "Contributor", "Identifier", "Relation"]'::JSONB, 0, 'Subject adalah elemen Dublin Core untuk topik atau kata kunci karya.', 4),
  ('post', NULL::INT, 2, 'Salah satu kelebihan Dublin Core dibanding MARC untuk sumber daya web adalah…', '["Elemennya lebih sedikit dan sederhana sehingga lebih mudah dipakai lintas jenis dokumen", "Dublin Core hanya dipakai untuk buku cetak", "MARC tidak bisa mencatat judul", "Dublin Core mempunyai ratusan subruas seperti MARC"]'::JSONB, 0, 'Dublin Core dirancang sederhana (15 elemen) sehingga mudah dipakai lintas jenis sumber daya digital, berbeda dari MARC yang rinci.', 5),
  ('post', NULL::INT, 2, 'Resolusi pindaian yang umum direkomendasikan untuk digitalisasi bahan pustaka berbasis teks adalah…', '["72 dpi", "150 dpi", "300 dpi", "1200 dpi"]'::JSONB, 2, '300 dpi adalah resolusi umum yang direkomendasikan agar hasil pindaian teks cukup jelas untuk dibaca dan diproses OCR.', 6),
  ('post', NULL::INT, 2, 'SLiMS pada perangkat lunak perpustakaan digital umumnya dipakai untuk…', '["Mengedit video pembelajaran", "Mengelola katalog dan sirkulasi perpustakaan (sistem otomasi perpustakaan)", "Menghitung anggaran kampus", "Menggantikan fungsi email"]'::JSONB, 1, 'SLiMS adalah perangkat lunak otomasi perpustakaan untuk mengelola katalog dan sirkulasi.', 7),
  ('post', NULL::INT, 2, 'Pengindeksan pada sistem temu kembali informasi bertujuan untuk…', '["Mempercepat proses pencarian dengan menyusun kata kunci dari dokumen", "Menghapus dokumen lama", "Mengubah dokumen menjadi gambar", "Membatasi akses pemustaka"]'::JSONB, 0, 'Pengindeksan menyusun kata kunci dari dokumen agar pencarian menjadi lebih cepat dan relevan.', 8),
  ('post', NULL::INT, 2, 'Migrasi format dalam preservasi digital dilakukan untuk…', '["Mengubah berkas ke format terbaru agar tetap bisa dibuka seiring teknologi berubah", "Menghapus metadata lama", "Mengunci akses pengguna", "Mengurangi ukuran layar"]'::JSONB, 0, 'Migrasi format menjaga berkas lama tetap bisa dibuka meski perangkat lunak dan teknologi berubah.', 9),
  ('post', NULL::INT, 2, 'Salah satu bentuk evaluasi layanan perpustakaan digital adalah…', '["Mengukur tingkat kepuasan dan pemanfaatan koleksi oleh pemustaka", "Menghitung jumlah rak buku", "Mengganti nama gedung perpustakaan", "Menutup layanan tanpa alasan"]'::JSONB, 0, 'Evaluasi layanan mengukur kepuasan dan pemanfaatan koleksi oleh pemustaka sebagai dasar perbaikan layanan.', 10)
) AS v(kind, module_id, course_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'post' AND course_id = 2);

-- ════════════════════════════════════════════
--  3. Formatif (27 soal, 3 per topik x 9 topik)
--     module_id dicari lewat modules.order_num (bukan id tetap), sama
--     seperti pola v20. Kolom v.topic = order_num topik (1..9).
-- ════════════════════════════════════════════
INSERT INTO quiz_questions (kind, module_id, course_id, question, options, answer_idx, explanation, order_num)
SELECT 'formatif', (SELECT id FROM modules WHERE course_id = 2 AND order_num = v.topic), 2,
       v.question, v.options, v.answer_idx, v.explanation, v.order_num
FROM (VALUES
  -- Topik 1: Konsep Dasar Perpustakaan Digital
  (1, 'Salah satu komponen utama perpustakaan digital selain koleksi digital adalah…', '["Infrastruktur teknologi dan layanan kepada pemustaka", "Rak buku kayu", "Mesin fotokopi", "Loket pembayaran denda"]'::JSONB, 0, 'Komponen perpustakaan digital mencakup koleksi, infrastruktur teknologi, dan layanan, bukan sekadar perabot fisik.', 1),
  (1, 'Perbedaan mendasar perpustakaan digital dengan perpustakaan konvensional terletak pada…', '["Bentuk koleksi dan cara aksesnya", "Jumlah pegawai", "Warna gedung", "Jam operasional yang selalu sama"]'::JSONB, 0, 'Perbedaan utamanya pada bentuk koleksi (digital atau fisik) dan cara mengaksesnya (jaringan atau datang langsung).', 2),
  (1, 'Arsitektur perpustakaan digital umumnya terdiri atas lapisan…', '["Koleksi, sistem pengelolaan, dan antarmuka pengguna", "Hanya rak dan katalog kartu", "Hanya gedung dan parkir", "Hanya staf keamanan"]'::JSONB, 0, 'Arsitektur perpustakaan digital umumnya mencakup koleksi, sistem pengelolaan di belakang layar, dan antarmuka yang dipakai pengguna.', 3),
  -- Topik 2: Internet dan Alasan Digitalisasi
  (2, 'Internet pada awalnya berkembang dari jaringan penelitian bernama…', '["ARPANET", "OPAC", "Dublin Core", "LOCKSS"]'::JSONB, 0, 'Internet berawal dari ARPANET, jaringan penelitian yang dikembangkan sejak akhir 1960-an.', 1),
  (2, 'World Wide Web mempermudah akses informasi karena menyediakan…', '["Tautan (hyperlink) antar halaman yang bisa diakses lewat peramban", "Hanya surel", "Hanya faksimile", "Hanya surat kertas"]'::JSONB, 0, 'WWW memakai tautan antar halaman yang bisa dibuka lewat peramban, mempermudah penjelajahan informasi.', 2),
  (2, 'Salah satu alasan lembaga melakukan digitalisasi selain memperluas akses adalah…', '["Melindungi bahan pustaka asli yang rapuh dari kerusakan akibat sering dipegang", "Menghilangkan seluruh koleksi cetak", "Mengurangi jumlah pemustaka", "Menaikkan biaya cetak"]'::JSONB, 0, 'Digitalisasi juga melindungi bahan asli yang rapuh karena pemustaka cukup mengakses salinan digitalnya.', 3),
  -- Topik 3: Pengembangan Koleksi Digital
  (3, 'Kebijakan seleksi koleksi digital berfungsi untuk…', '["Menentukan kriteria bahan yang layak didigitalkan atau diadakan", "Menentukan warna sampul buku", "Menentukan jam buka perpustakaan", "Menentukan gaji pegawai"]'::JSONB, 0, 'Kebijakan seleksi menetapkan kriteria bahan pustaka mana yang layak didigitalkan atau diadakan dalam koleksi.', 1),
  (3, 'Format yang cocok untuk koleksi digital berupa gambar hasil pindaian halaman naskah kuno adalah…', '["Gambar beresolusi tinggi seperti TIFF atau JPEG", "Berkas audio MP3", "Berkas video MP4", "Berkas terkompresi ZIP tanpa gambar"]'::JSONB, 0, 'Naskah hasil pindaian umumnya disimpan sebagai berkas gambar beresolusi tinggi agar detail tulisan tetap terlihat.', 2),
  (3, 'Lisensi dalam pengembangan koleksi digital penting untuk mengatur…', '["Hak penggunaan dan penyebarluasan sebuah karya", "Warna latar aplikasi", "Ukuran font", "Jumlah rak di gedung"]'::JSONB, 0, 'Lisensi mengatur hak pengguna dalam memakai dan menyebarluaskan sebuah karya digital.', 3),
  -- Topik 4: Metadata dan Dublin Core
  (4, 'Jumlah elemen inti Dublin Core yang disepakati secara umum adalah…', '["15 elemen", "5 elemen", "50 elemen", "100 elemen"]'::JSONB, 0, 'Dublin Core inti terdiri atas 15 elemen seperti title, creator, subject, hingga rights.', 1),
  (4, 'Metadata berfungsi membantu pemustaka terutama dalam hal…', '["Menemukan dan mengidentifikasi sumber daya digital dengan tepat", "Mencetak dokumen lebih cepat", "Mengganti judul dokumen secara otomatis", "Menghapus dokumen yang sudah usang"]'::JSONB, 0, 'Metadata memudahkan penemuan dan identifikasi sumber daya digital yang relevan.', 2),
  (4, 'Elemen Dublin Core yang mencatat bahasa sebuah dokumen adalah…', '["Language", "Format", "Source", "Coverage"]'::JSONB, 0, 'Language adalah elemen Dublin Core untuk mencatat bahasa yang dipakai dalam dokumen.', 3),
  -- Topik 5: Alih Media dan Digitalisasi Bahan Pustaka
  (5, 'Langkah pertama dalam alur kerja digitalisasi bahan pustaka pada umumnya adalah…', '["Persiapan dan pemeriksaan kondisi fisik bahan sebelum dipindai", "Mengunggah langsung ke internet", "Menghapus bahan asli", "Mencetak ulang bahan"]'::JSONB, 0, 'Sebelum dipindai, bahan pustaka perlu diperiksa kondisinya agar proses pemindaian aman dan hasilnya baik.', 1),
  (5, 'Penamaan berkas hasil digitalisasi yang konsisten penting supaya…', '["Berkas mudah ditelusuri dan tidak tertukar antar koleksi", "Ukuran berkas otomatis mengecil", "Warna gambar berubah", "Proses OCR menjadi tidak perlu"]'::JSONB, 0, 'Penamaan berkas yang konsisten memudahkan penelusuran dan mencegah berkas tertukar.', 2),
  (5, 'Standar kualitas berkas hasil pemindaian biasanya memperhatikan…', '["Resolusi, format berkas, dan kejelasan hasil pindaian", "Warna sampul gedung", "Jumlah staf", "Harga kertas"]'::JSONB, 0, 'Standar kualitas pemindaian meliputi resolusi, format berkas, dan kejelasan hasil agar layak disimpan jangka panjang.', 3),
  -- Topik 6: Perangkat Lunak Perpustakaan Digital
  (6, 'Greenstone adalah perangkat lunak perpustakaan digital yang dikembangkan oleh…', '["Universitas Waikato, Selandia Baru", "Microsoft", "Google", "Universitas Indonesia"]'::JSONB, 0, 'Greenstone dikembangkan oleh proyek di Universitas Waikato, Selandia Baru, bekerja sama dengan UNESCO.', 1),
  (6, 'DSpace umumnya dipakai perguruan tinggi untuk…', '["Membangun repositori institusi berisi karya ilmiah sivitas akademik", "Mengelola gaji dosen", "Mengedit foto", "Mengatur jadwal kuliah"]'::JSONB, 0, 'DSpace dipakai untuk membangun repositori institusi yang menyimpan karya ilmiah sivitas akademik.', 2),
  (6, 'Salah satu pertimbangan memilih perangkat lunak perpustakaan digital adalah…', '["Kesesuaian fitur dengan kebutuhan dan kemudahan pengelolaan", "Warna tampilan saja", "Nama pengembangnya", "Jumlah huruf pada nama aplikasi"]'::JSONB, 0, 'Pemilihan perangkat lunak mempertimbangkan kesesuaian fitur dengan kebutuhan lembaga dan kemudahan pengelolaan.', 3),
  -- Topik 7: Temu Kembali Informasi dan Portal Web
  (7, 'Fungsi utama OPAC bagi pemustaka adalah…', '["Menelusuri ketersediaan dan lokasi koleksi perpustakaan", "Mencetak kartu anggota", "Mengatur suhu ruangan", "Membayar denda secara otomatis tanpa katalog"]'::JSONB, 0, 'OPAC membantu pemustaka menelusuri ketersediaan dan lokasi koleksi yang dicari.', 1),
  (7, 'Personalisasi layanan pada portal perpustakaan digital dapat berupa…', '["Rekomendasi koleksi berdasarkan riwayat pencarian pemustaka", "Menyamakan tampilan untuk semua pengguna tanpa pengecualian", "Menghapus riwayat pencarian setiap hari", "Menonaktifkan fitur pencarian"]'::JSONB, 0, 'Personalisasi memberi rekomendasi koleksi berdasarkan riwayat dan minat pencarian pemustaka.', 2),
  (7, 'Penjelajahan (browsing) berbeda dari pencarian (searching) karena penjelajahan…', '["Menyusuri kategori atau struktur koleksi tanpa kata kunci tertentu", "Selalu memerlukan kata kunci yang spesifik", "Hanya bisa dilakukan oleh pustakawan", "Tidak bisa dipakai di portal digital"]'::JSONB, 0, 'Penjelajahan menyusuri kategori atau struktur koleksi, berbeda dari pencarian yang memakai kata kunci tertentu.', 3),
  -- Topik 8: Preservasi Digital dan Hak Cipta
  (8, 'Cadangan (backup) data dalam preservasi digital penting untuk…', '["Mencegah hilangnya data akibat kerusakan perangkat atau bencana", "Mempercepat koneksi internet", "Mengurangi jumlah metadata", "Mengganti hak cipta pencipta"]'::JSONB, 0, 'Cadangan data melindungi koleksi digital dari kehilangan akibat kerusakan perangkat atau bencana.', 1),
  (8, 'Lisensi Creative Commons dipakai untuk…', '["Mengatur cara sebuah karya boleh dipakai dan disebarluaskan secara terbuka oleh publik", "Menghapus hak cipta pencipta sepenuhnya", "Melarang seluruh bentuk penyalinan", "Menggantikan fungsi metadata"]'::JSONB, 0, 'Creative Commons adalah lisensi terbuka yang mengatur cara karya boleh dipakai dan disebarluaskan sesuai izin penciptanya.', 2),
  (8, 'Akses terbuka (open access) dalam perpustakaan digital berarti…', '["Karya ilmiah dapat diakses publik secara bebas tanpa hambatan biaya berlangganan", "Semua koleksi wajib berbayar", "Hanya anggota tertentu yang boleh membaca", "Koleksi hanya tersedia dalam bentuk cetak"]'::JSONB, 0, 'Akses terbuka memungkinkan publik membaca karya ilmiah secara bebas tanpa hambatan biaya berlangganan.', 3),
  -- Topik 9: Peran Pustakawan Digital dan Evaluasi Layanan
  (9, 'Kompetensi yang perlu dimiliki pustakawan di era digital antara lain…', '["Kemampuan mengelola teknologi informasi dan literasi digital", "Kemampuan menjilid buku secara manual saja", "Kemampuan mengetik surat dinas", "Kemampuan memasak"]'::JSONB, 0, 'Pustakawan digital perlu menguasai teknologi informasi dan literasi digital untuk mengelola layanan perpustakaan digital.', 1),
  (9, 'Literasi informasi yang diajarkan pustakawan kepada pemustaka bertujuan agar pemustaka mampu…', '["Menemukan, menilai, dan memanfaatkan informasi secara tepat", "Menghafal seluruh judul koleksi", "Menulis ulang katalog", "Mengabaikan sumber digital"]'::JSONB, 0, 'Literasi informasi melatih pemustaka menemukan, menilai, dan memanfaatkan informasi secara tepat.', 2),
  (9, 'Evaluasi layanan perpustakaan digital dapat dilakukan dengan mengukur…', '["Tingkat kepuasan pemustaka dan pemanfaatan koleksi", "Jumlah lampu di ruang baca", "Warna dinding gedung", "Jumlah meja kosong"]'::JSONB, 0, 'Evaluasi layanan mengukur kepuasan pemustaka dan pemanfaatan koleksi sebagai dasar perbaikan.', 3)
) AS v(topic, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (
  SELECT 1 FROM quiz_questions q JOIN modules m ON m.id = q.module_id
  WHERE q.kind = 'formatif' AND m.course_id = 2
);

-- ════════════════════════════════════════════
--  4. Tes kelompok (5 soal berbentuk kasus singkat)
-- ════════════════════════════════════════════
INSERT INTO quiz_questions (kind, module_id, course_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('kelompok', NULL::INT, 2, 'Sebuah kampus punya ratusan skripsi lama dalam kondisi kertas rapuh dan mulai kekuningan. Langkah paling tepat sebelum memindai adalah…', '["Memeriksa dan menangani kondisi fisik bahan terlebih dahulu agar tidak rusak saat dipindai", "Langsung memindai tanpa memeriksa kondisi kertas", "Membuang skripsi yang sudah kekuningan", "Menunggu sampai kertas rusak total baru dipindai"]'::JSONB, 0, 'Bahan rapuh perlu diperiksa dan ditangani dulu agar tidak rusak lebih parah saat proses pemindaian.', 1),
  ('kelompok', NULL::INT, 2, 'Sebuah program studi ingin membangun repositori institusi untuk menyimpan artikel ilmiah dosen dan mahasiswa dengan biaya terbatas. Pilihan yang paling sesuai adalah…', '["Memakai perangkat lunak sumber terbuka seperti DSpace atau Eprints", "Membeli sistem berbayar tanpa mempertimbangkan anggaran", "Menyimpan seluruh berkas hanya di komputer pribadi dosen", "Mencetak semua artikel dan menyimpannya di gudang"]'::JSONB, 0, 'Perangkat lunak sumber terbuka seperti DSpace atau Eprints cocok untuk repositori institusi dengan anggaran terbatas.', 2),
  ('kelompok', NULL::INT, 2, 'Mahasiswa mengeluh sulit menemukan jurnal yang relevan meski sudah memasukkan kata kunci di portal perpustakaan. Penyebab yang paling mungkin adalah…', '["Metadata dan pengindeksan koleksi kurang lengkap atau kurang tepat", "Mahasiswa tidak diperbolehkan mencari jurnal", "Portal tidak memerlukan metadata sama sekali", "Jurnal hanya boleh dicari oleh dosen"]'::JSONB, 0, 'Pencarian yang tidak relevan sering disebabkan metadata dan pengindeksan koleksi yang kurang lengkap atau kurang tepat.', 3),
  ('kelompok', NULL::INT, 2, 'Sebuah lembaga ingin membagikan hasil penelitiannya secara terbuka kepada publik namun tetap mencantumkan nama penulis. Pilihan lisensi yang paling sesuai adalah…', '["Lisensi Creative Commons dengan atribusi", "Tidak memakai lisensi apa pun", "Melarang siapa pun mengunduh hasil penelitian", "Menjual hasil penelitian secara eksklusif tanpa syarat apa pun"]'::JSONB, 0, 'Lisensi Creative Commons dengan atribusi memungkinkan karya diakses terbuka sambil tetap mencantumkan nama penulis.', 4),
  ('kelompok', NULL::INT, 2, 'Hasil evaluasi layanan menunjukkan banyak pemustaka baru tidak tahu cara memakai OPAC untuk menelusuri koleksi. Langkah yang paling tepat dilakukan pustakawan adalah…', '["Mengadakan pelatihan literasi informasi tentang cara memakai OPAC", "Menghapus fitur OPAC dari portal", "Membiarkan pemustaka mencari tahu sendiri tanpa bantuan", "Mengganti seluruh koleksi menjadi cetak"]'::JSONB, 0, 'Pelatihan literasi informasi membantu pemustaka baru memahami cara memakai OPAC untuk menelusuri koleksi.', 5)
) AS v(kind, module_id, course_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'kelompok' AND course_id = 2);

-- ════════════════════════════════════════════
--  Verifikasi (jalankan manual di SQL Editor)
-- ════════════════════════════════════════════
-- select kind, count(*) from quiz_questions where course_id = 2 group by kind;
--   -> pre 10, post 10, kelompok 5, formatif 27
