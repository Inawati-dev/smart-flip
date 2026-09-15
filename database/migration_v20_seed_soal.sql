-- SMART-FLIP 5.0 - migration v20: seed bank soal (DRAF untuk direview dosen)
-- Diminta Johan 16 Sep 2026: "buatkan soalnya dan kunci jawabannya".
-- Isi: 20 soal pre-test, 20 soal post-test, 5 soal formatif x 9 modul = 45.
-- Total 85 soal pilihan ganda, 4 opsi, kunci di answer_idx (0 = A), penjelasan singkat.
-- Sumber isi: Borg & Gall (10 langkah R&D), Thiagarajan 4D, ADDIE, Sugiyono
-- (Metode Penelitian & Pengembangan), Hake 1998 (peningkatan skor / N-Gain).
-- Idempoten: tiap blok dilewati bila jenis (atau jenis+modul) itu sudah punya soal,
-- jadi soal yang sudah diedit dosen lewat Bank soal tidak tertimpa.
-- module_id dicari lewat order_num, bukan id tetap, supaya cocok dengan id produksi.

INSERT INTO quiz_questions (kind, module_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('pre', NULL::INT, 'Ciri utama penelitian dan pengembangan (R&D) dibanding penelitian deskriptif adalah…', '["Hanya menggambarkan keadaan yang ada", "Menghasilkan produk dan menguji kelayakannya", "Menguji hubungan dua variabel tanpa perlakuan", "Mengumpulkan pendapat responden lewat angket"]'::JSONB, 1, 'R&D bertujuan menghasilkan produk (modul, media, model) dan menguji keefektifannya, bukan sekadar menggambarkan keadaan.', 1),
  ('pre', NULL::INT, 'Model pengembangan yang tahapannya Analysis, Design, Development, Implementation, Evaluation disebut…', '["4D", "ADDIE", "Borg & Gall", "Dick & Carey"]'::JSONB, 1, 'ADDIE adalah singkatan lima tahap tersebut.', 2),
  ('pre', NULL::INT, 'Model 4D dari Thiagarajan terdiri atas…', '["Define, Design, Develop, Disseminate", "Discover, Draft, Deliver, Decide", "Define, Deploy, Debug, Document", "Design, Develop, Distribute, Dispose"]'::JSONB, 0, 'Empat D pada model Thiagarajan: Define, Design, Develop, Disseminate.', 3),
  ('pre', NULL::INT, 'Tahap analisis kebutuhan (needs assessment) bertujuan untuk…', '["Menguji produk pada kelompok besar", "Menemukan kesenjangan antara kondisi nyata dan kondisi yang diharapkan", "Menyusun angket validasi ahli", "Menghitung peningkatan skor"]'::JSONB, 1, 'Needs assessment membandingkan kondisi saat ini dengan kondisi ideal, lalu merumuskan kebutuhan.', 4),
  ('pre', NULL::INT, 'Bagian Bab 1 proposal yang memuat alasan mengapa produk perlu dikembangkan adalah…', '["Tujuan penelitian", "Latar belakang", "Manfaat penelitian", "Spesifikasi produk"]'::JSONB, 1, 'Latar belakang memaparkan masalah, kesenjangan, dan urgensi pengembangan.', 5),
  ('pre', NULL::INT, 'Rumusan masalah yang tepat untuk penelitian R&D adalah…', '["Apakah ada hubungan motivasi dan hasil belajar?", "Bagaimana kelayakan dan keefektifan modul yang dikembangkan?", "Berapa rata-rata nilai ujian mahasiswa?", "Apakah metode A lebih baik daripada metode B?"]'::JSONB, 1, 'Rumusan masalah R&D bertanya tentang proses pengembangan, kelayakan, dan keefektifan produk.', 6),
  ('pre', NULL::INT, 'Storyboard dalam pengembangan media pembelajaran berfungsi untuk…', '["Menghitung biaya produksi", "Menggambarkan urutan tampilan dan isi tiap layar sebelum dibuat", "Menguji produk kepada pengguna", "Menyusun daftar pustaka"]'::JSONB, 1, 'Storyboard adalah rancangan visual berurutan sebelum produk dibuat.', 7),
  ('pre', NULL::INT, 'Blueprint produk memuat…', '["Hasil uji lapangan", "Spesifikasi, struktur, dan komponen produk yang akan dibuat", "Daftar responden", "Skor pre-test dan post-test"]'::JSONB, 1, 'Blueprint adalah cetak biru: spesifikasi dan struktur produk.', 8),
  ('pre', NULL::INT, 'Validasi ahli dilakukan untuk…', '["Mengukur hasil belajar mahasiswa", "Menilai kelayakan produk dari sisi media dan materi sebelum uji coba", "Menentukan jumlah sampel", "Menyusun bab pembahasan"]'::JSONB, 1, 'Validator ahli media dan ahli materi menilai kelayakan sebelum produk diujicobakan.', 9),
  ('pre', NULL::INT, 'Skala yang lazim dipakai dalam angket validasi ahli adalah…', '["Skala Guttman ya/tidak saja", "Skala Likert 1 sampai 5", "Skala rasio dalam detik", "Skala nominal warna"]'::JSONB, 1, 'Angket validasi umumnya memakai skala Likert lima tingkat.', 10),
  ('pre', NULL::INT, 'Persentase kelayakan dihitung dengan rumus…', '["Skor maksimal dibagi skor yang diperoleh", "Skor yang diperoleh dibagi skor maksimal dikali 100%", "Jumlah butir dikali 5", "Skor rata-rata dikurangi 1"]'::JSONB, 1, 'Persentase = (skor perolehan ÷ skor maksimal) × 100%.', 11),
  ('pre', NULL::INT, 'Produk dengan persentase kelayakan 85% pada kategori umum (81–100% sangat layak) termasuk…', '["Kurang layak", "Cukup layak", "Layak", "Sangat layak"]'::JSONB, 3, 'Rentang 81–100% pada kategori yang umum dipakai berarti sangat layak.', 12),
  ('pre', NULL::INT, 'Uji coba kelompok kecil dilakukan…', '["Sesudah uji lapangan luas", "Sebelum uji lapangan, dengan sedikit pengguna untuk menemukan kekurangan awal", "Hanya oleh validator ahli", "Sesudah produk disebarluaskan"]'::JSONB, 1, 'Uji kelompok kecil mendahului uji lapangan untuk menangkap kekurangan awal.', 13),
  ('pre', NULL::INT, 'Revisi produk dilakukan berdasarkan…', '["Selera peneliti", "Masukan validator dan hasil uji coba", "Jumlah halaman", "Biaya cetak"]'::JSONB, 1, 'Revisi mengikuti masukan validator dan temuan uji coba.', 14),
  ('pre', NULL::INT, 'Desain one group pretest-posttest berarti…', '["Dua kelompok diberi perlakuan berbeda", "Satu kelompok diukur sebelum dan sesudah perlakuan", "Tidak ada pengukuran awal", "Kelompok dipilih acak dari populasi besar"]'::JSONB, 1, 'Satu kelompok, diukur sebelum (pre) dan sesudah (post) perlakuan.', 15),
  ('pre', NULL::INT, 'Peningkatan skor (N-Gain) dihitung dengan rumus…', '["(post − pre) ÷ (skor maksimal − pre)", "(pre − post) ÷ post", "post ÷ pre", "(post + pre) ÷ 2"]'::JSONB, 0, 'Rumus Hake: gain = (post − pre) ÷ (maks − pre).', 16),
  ('pre', NULL::INT, 'Jika pre-test 40, post-test 85, dan skor maksimal 100, peningkatan skornya adalah…', '["0,45", "0,55", "0,75", "0,85"]'::JSONB, 2, '(85 − 40) ÷ (100 − 40) = 45 ÷ 60 = 0,75.', 17),
  ('pre', NULL::INT, 'Peningkatan skor 0,75 termasuk kategori…', '["Rendah", "Sedang", "Tinggi", "Tidak valid"]'::JSONB, 2, 'Kategori Hake: tinggi bila > 0,7.', 18),
  ('pre', NULL::INT, 'Diseminasi dalam R&D berarti…', '["Menghapus produk yang gagal", "Menyebarluaskan produk yang sudah teruji kepada pengguna lebih luas", "Menghitung validitas butir", "Menulis latar belakang"]'::JSONB, 1, 'Diseminasi = penyebarluasan produk akhir.', 19),
  ('pre', NULL::INT, 'Luaran penelitian R&D yang lazim dilaporkan meliputi…', '["Produk, hasil validasi, dan hasil uji keefektifan", "Hanya proposal", "Hanya daftar pustaka", "Hanya foto kegiatan"]'::JSONB, 0, 'Laporan R&D memuat produk, kelayakan (validasi), dan keefektifan (uji coba).', 20)
) AS v(kind, module_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'pre');

INSERT INTO quiz_questions (kind, module_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('post', NULL::INT, 'Pernyataan yang paling tepat tentang penelitian R&D adalah…', '["Menguji hipotesis hubungan dua variabel", "Mengembangkan produk lalu menguji kelayakan dan keefektifannya", "Menggambarkan fenomena apa adanya", "Mewawancarai informan kunci"]'::JSONB, 1, 'R&D menghasilkan produk dan mengujinya secara sistematis.', 1),
  ('post', NULL::INT, 'Tahap Implementation pada model ADDIE berisi kegiatan…', '["Menganalisis kebutuhan", "Menerapkan produk kepada pengguna sasaran", "Merancang storyboard", "Menilai hasil akhir"]'::JSONB, 1, 'Implementation adalah penerapan produk di lapangan.', 2),
  ('post', NULL::INT, 'Tahap Disseminate pada model 4D berarti…', '["Menyusun definisi masalah", "Mengembangkan draf produk", "Menyebarluaskan produk akhir", "Merancang instrumen"]'::JSONB, 2, 'Disseminate = penyebarluasan.', 3),
  ('post', NULL::INT, 'Kesenjangan (gap) dalam analisis kebutuhan adalah…', '["Selisih kondisi ideal dan kondisi nyata", "Selisih pre-test dan post-test", "Jumlah responden yang hadir", "Perbedaan harga produk"]'::JSONB, 0, 'Gap analysis membandingkan ideal dengan nyata.', 4),
  ('post', NULL::INT, 'Tujuan penelitian R&D yang dirumuskan dengan benar adalah…', '["Mengetahui hubungan minat dan prestasi", "Menghasilkan modul yang layak dan efektif menurut ahli dan pengguna", "Mendeskripsikan profil dosen", "Membandingkan dua kelas tanpa perlakuan"]'::JSONB, 1, 'Tujuan R&D menyebut produk, kelayakan, dan keefektifan.', 5),
  ('post', NULL::INT, 'Manfaat praktis dalam Bab 1 ditujukan kepada…', '["Peneliti lain saja", "Pengguna produk seperti mahasiswa dan dosen", "Penerbit", "Perpustakaan"]'::JSONB, 1, 'Manfaat praktis menyasar pengguna langsung produk.', 6),
  ('post', NULL::INT, 'Urutan yang benar dalam merancang produk digital adalah…', '["Produksi, storyboard, blueprint", "Blueprint, storyboard, produksi", "Storyboard, uji lapangan, blueprint", "Uji lapangan, produksi, blueprint"]'::JSONB, 1, 'Cetak biru dulu, lalu papan cerita, lalu produksi.', 7),
  ('post', NULL::INT, 'Wireframe berbeda dari storyboard karena wireframe…', '["Memuat naskah narasi lengkap", "Menggambarkan tata letak elemen tiap layar tanpa detail visual", "Berisi hasil validasi", "Dibuat sesudah produk jadi"]'::JSONB, 1, 'Wireframe = kerangka tata letak; storyboard = urutan isi antar layar.', 8),
  ('post', NULL::INT, 'Aspek yang dinilai ahli materi antara lain…', '["Warna dan tipografi", "Kebenaran konsep dan kesesuaian dengan capaian pembelajaran", "Ukuran berkas", "Kecepatan unduh"]'::JSONB, 1, 'Ahli materi menilai isi; ahli media menilai tampilan dan teknis.', 9),
  ('post', NULL::INT, 'Angket validasi dengan 8 butir skala 1–5 mempunyai skor maksimal…', '["8", "20", "40", "80"]'::JSONB, 2, '8 butir × 5 = 40.', 10),
  ('post', NULL::INT, 'Skor validasi 34 dari maksimal 40 setara persentase…', '["75%", "80%", "85%", "90%"]'::JSONB, 2, '34 ÷ 40 × 100% = 85%.', 11),
  ('post', NULL::INT, 'Kategori kelayakan 61–80% pada tabel yang umum dipakai adalah…', '["Tidak layak", "Kurang layak", "Layak", "Sangat layak"]'::JSONB, 2, '61–80% = layak; 81–100% = sangat layak.', 12),
  ('post', NULL::INT, 'Uji lapangan (field test) berbeda dari uji kelompok kecil dalam hal…', '["Dilakukan sebelum validasi ahli", "Melibatkan pengguna dalam jumlah lebih besar dan kondisi nyata", "Hanya menilai tampilan", "Tidak memerlukan instrumen"]'::JSONB, 1, 'Uji lapangan memakai jumlah pengguna lebih besar dalam situasi sebenarnya.', 13),
  ('post', NULL::INT, 'Jika hasil uji coba menunjukkan banyak pengguna bingung pada menu navigasi, langkah yang tepat adalah…', '["Mengabaikannya karena validator sudah setuju", "Merevisi navigasi lalu menguji ulang", "Menambah jumlah soal", "Mengganti judul penelitian"]'::JSONB, 1, 'Temuan uji coba menjadi dasar revisi, lalu diuji lagi.', 14),
  ('post', NULL::INT, 'Kelemahan desain one group pretest-posttest adalah…', '["Terlalu mahal", "Tidak ada kelompok pembanding sehingga faktor lain sulit dikendalikan", "Memerlukan dua sekolah", "Tidak bisa menghitung peningkatan"]'::JSONB, 1, 'Tanpa kelompok kontrol, pengaruh faktor luar tidak terkendali.', 15),
  ('post', NULL::INT, 'Pre-test 60, post-test 90, skor maksimal 100. Peningkatan skornya…', '["0,30", "0,50", "0,75", "0,90"]'::JSONB, 2, '(90 − 60) ÷ (100 − 60) = 30 ÷ 40 = 0,75.', 16),
  ('post', NULL::INT, 'Peningkatan skor 0,45 termasuk kategori…', '["Rendah", "Sedang", "Tinggi", "Sangat tinggi"]'::JSONB, 1, 'Kategori Hake: 0,3 sampai 0,7 = sedang.', 17),
  ('post', NULL::INT, 'Mengapa pre-test dan post-test sebaiknya dikerjakan sekali dengan soal setara?', '["Supaya nilai selalu naik", "Supaya selisih skor mencerminkan pengaruh produk, bukan hafalan soal", "Supaya waktu lebih singkat", "Karena aturan kampus"]'::JSONB, 1, 'Soal setara dan sekali kerja menjaga selisih skor tetap bermakna.', 18),
  ('post', NULL::INT, 'Bentuk diseminasi hasil R&D yang tepat adalah…', '["Menyimpan produk di komputer pribadi", "Publikasi artikel, seminar, dan penyebaran produk ke pengguna", "Menghapus data uji coba", "Mengulang validasi"]'::JSONB, 1, 'Diseminasi lewat publikasi, seminar, dan penyebaran produk.', 19),
  ('post', NULL::INT, 'Laporan akhir R&D wajib memuat…', '["Deskripsi produk, hasil validasi, hasil uji coba, dan revisi", "Hanya rumusan masalah", "Hanya lampiran foto", "Hanya anggaran"]'::JSONB, 0, 'Laporan menyajikan seluruh siklus: produk, kelayakan, keefektifan, revisi.', 20)
) AS v(kind, module_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'post');

INSERT INTO quiz_questions (kind, module_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('formatif', (SELECT id FROM modules WHERE order_num = 1), 'Penelitian R&D dalam pendidikan bertujuan…', '["Menghasilkan dan menguji produk pendidikan", "Menguji teori belajar", "Menggambarkan sekolah", "Membandingkan dua guru"]'::JSONB, 0, 'Inti R&D adalah produk yang teruji.', 1),
  ('formatif', (SELECT id FROM modules WHERE order_num = 1), 'Urgensi R&D di pendidikan vokasi adalah…', '["Vokasi tidak butuh produk", "Vokasi membutuhkan media dan modul yang sesuai kebutuhan dunia kerja", "Vokasi hanya teori", "R&D dilarang di vokasi"]'::JSONB, 1, 'Pendidikan vokasi berorientasi keterampilan, sehingga butuh produk pembelajaran yang relevan.', 2),
  ('formatif', (SELECT id FROM modules WHERE order_num = 1), 'Paradigma penelitian pengembangan bersifat…', '["Siklus: rancang, uji, revisi", "Sekali jalan tanpa revisi", "Hanya kualitatif", "Hanya kuantitatif"]'::JSONB, 0, 'R&D berulang: rancang, uji, revisi sampai layak.', 3),
  ('formatif', (SELECT id FROM modules WHERE order_num = 1), 'Contoh produk R&D pendidikan adalah…', '["Modul digital", "Skor ujian nasional", "Daftar hadir", "Anggaran sekolah"]'::JSONB, 0, 'Modul, media, model, dan instrumen adalah produk R&D.', 4),
  ('formatif', (SELECT id FROM modules WHERE order_num = 1), 'Perbedaan R&D dan eksperimen murni terletak pada…', '["R&D mengembangkan produk, eksperimen menguji perlakuan", "Keduanya sama", "Eksperimen menghasilkan produk", "R&D tidak memakai data"]'::JSONB, 0, 'Eksperimen menguji perlakuan; R&D menghasilkan dan menguji produk.', 5)
) AS v(kind, module_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'formatif' AND module_id = (SELECT id FROM modules WHERE order_num = 1));

INSERT INTO quiz_questions (kind, module_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('formatif', (SELECT id FROM modules WHERE order_num = 2), 'Tahap pertama model ADDIE adalah…', '["Design", "Analysis", "Develop", "Evaluate"]'::JSONB, 1, 'A = Analysis.', 1),
  ('formatif', (SELECT id FROM modules WHERE order_num = 2), 'Model Borg & Gall dikenal dengan…', '["Empat tahap D", "Sepuluh langkah dari penelitian awal sampai diseminasi", "Lima tahap ADDIE", "Tiga tahap saja"]'::JSONB, 1, 'Borg & Gall merumuskan sepuluh langkah.', 2),
  ('formatif', (SELECT id FROM modules WHERE order_num = 2), 'Tahap Define pada 4D berisi…', '["Penyebaran produk", "Analisis awal, analisis peserta didik, tugas, konsep, dan tujuan", "Uji lapangan", "Revisi akhir"]'::JSONB, 1, 'Define = menetapkan kebutuhan dan tujuan pembelajaran.', 3),
  ('formatif', (SELECT id FROM modules WHERE order_num = 2), 'Memilih model pengembangan sebaiknya berdasarkan…', '["Nama yang paling terkenal", "Kesesuaian dengan jenis produk, waktu, dan sumber daya", "Jumlah huruf", "Tahun terbit"]'::JSONB, 1, 'Model dipilih sesuai konteks produk dan sumber daya.', 4),
  ('formatif', (SELECT id FROM modules WHERE order_num = 2), 'Tahap Evaluation pada ADDIE dapat dilakukan…', '["Hanya di akhir", "Di setiap tahap (formatif) dan di akhir (sumatif)", "Hanya oleh dosen", "Tidak perlu"]'::JSONB, 1, 'Evaluasi formatif menyertai tiap tahap; sumatif di akhir.', 5)
) AS v(kind, module_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'formatif' AND module_id = (SELECT id FROM modules WHERE order_num = 2));

INSERT INTO quiz_questions (kind, module_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('formatif', (SELECT id FROM modules WHERE order_num = 3), 'Sumber data analisis kebutuhan yang tepat adalah…', '["Angket dan wawancara pengguna serta dokumen kurikulum", "Hasil undian", "Pendapat pribadi peneliti", "Iklan produk"]'::JSONB, 0, 'Kebutuhan digali dari pengguna dan dokumen.', 1),
  ('formatif', (SELECT id FROM modules WHERE order_num = 3), 'Kondisi ideal dalam gap analysis biasanya mengacu pada…', '["Standar atau capaian pembelajaran yang ditetapkan", "Nilai tertinggi di kelas", "Harga pasar", "Ukuran layar"]'::JSONB, 0, 'Ideal = standar yang harus dicapai.', 2),
  ('formatif', (SELECT id FROM modules WHERE order_num = 3), 'Hasil analisis kebutuhan digunakan untuk…', '["Menentukan spesifikasi produk yang akan dikembangkan", "Menghitung peningkatan skor", "Menulis daftar pustaka", "Menentukan validator"]'::JSONB, 0, 'Kebutuhan menjadi dasar spesifikasi produk.', 3),
  ('formatif', (SELECT id FROM modules WHERE order_num = 3), 'Teknik yang cocok untuk memetakan kebutuhan banyak mahasiswa sekaligus adalah…', '["Angket", "Observasi satu orang", "Studi kasus tunggal", "Eksperimen"]'::JSONB, 0, 'Angket menjangkau responden banyak dengan cepat.', 4),
  ('formatif', (SELECT id FROM modules WHERE order_num = 3), 'Pernyataan kesenjangan yang benar adalah…', '["Mahasiswa seharusnya mampu menyusun proposal, tetapi 70% belum bisa", "Mahasiswa suka warna biru", "Dosen berusia 40 tahun", "Kelas dimulai pukul 08.00"]'::JSONB, 0, 'Kesenjangan menyandingkan yang seharusnya dan yang terjadi.', 5)
) AS v(kind, module_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'formatif' AND module_id = (SELECT id FROM modules WHERE order_num = 3));

INSERT INTO quiz_questions (kind, module_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('formatif', (SELECT id FROM modules WHERE order_num = 4), 'Latar belakang yang baik dimulai dari…', '["Kesimpulan penelitian", "Masalah umum menuju masalah khusus yang didukung data", "Daftar pustaka", "Biodata peneliti"]'::JSONB, 1, 'Latar belakang bergerak dari umum ke khusus dengan data pendukung.', 1),
  ('formatif', (SELECT id FROM modules WHERE order_num = 4), 'Rumusan masalah R&D umumnya bertanya tentang…', '["Bagaimana mengembangkan, seberapa layak, dan seberapa efektif produk", "Berapa jumlah dosen", "Siapa rektor", "Kapan ujian"]'::JSONB, 0, 'Tiga pertanyaan inti: pengembangan, kelayakan, keefektifan.', 2),
  ('formatif', (SELECT id FROM modules WHERE order_num = 4), 'Spesifikasi produk yang diharapkan ditulis di Bab 1 untuk…', '["Menjelaskan bentuk dan fitur produk yang akan dihasilkan", "Mengganti tujuan", "Menghitung biaya", "Menutup laporan"]'::JSONB, 0, 'Spesifikasi menggambarkan produk yang dijanjikan.', 3),
  ('formatif', (SELECT id FROM modules WHERE order_num = 4), 'Pembatasan pengembangan berguna untuk…', '["Membuat penelitian tampak besar", "Menjelaskan batas cakupan produk dan uji coba", "Mengurangi jumlah bab", "Menghindari validasi"]'::JSONB, 1, 'Pembatasan menjelaskan apa yang tidak dicakup.', 4),
  ('formatif', (SELECT id FROM modules WHERE order_num = 4), 'Tujuan penelitian harus…', '["Sejalan dengan rumusan masalah", "Berbeda dari rumusan masalah", "Ditulis sesudah laporan selesai", "Berupa pertanyaan"]'::JSONB, 0, 'Tujuan menjawab rumusan masalah satu per satu.', 5)
) AS v(kind, module_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'formatif' AND module_id = (SELECT id FROM modules WHERE order_num = 4));

INSERT INTO quiz_questions (kind, module_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('formatif', (SELECT id FROM modules WHERE order_num = 5), 'Komponen yang wajib ada dalam blueprint modul digital adalah…', '["Struktur menu, isi tiap bagian, dan alur pengguna", "Nama penerbit", "Harga jual", "Nomor ISBN"]'::JSONB, 0, 'Blueprint memuat struktur, isi, dan alur.', 1),
  ('formatif', (SELECT id FROM modules WHERE order_num = 5), 'Storyboard sebaiknya dibuat…', '["Sesudah produk selesai", "Sebelum produksi, sebagai panduan pembuat", "Saat uji lapangan", "Saat diseminasi"]'::JSONB, 1, 'Storyboard memandu produksi.', 2),
  ('formatif', (SELECT id FROM modules WHERE order_num = 5), 'Isi satu kotak storyboard biasanya memuat…', '["Sketsa tampilan, teks/narasi, dan keterangan interaksi", "Daftar responden", "Skor validasi", "Rumus gain"]'::JSONB, 0, 'Tiap kotak: tampilan, isi, interaksi.', 3),
  ('formatif', (SELECT id FROM modules WHERE order_num = 5), 'Prinsip desain yang membantu pengguna adalah…', '["Konsistensi tata letak dan navigasi", "Warna berganti setiap halaman", "Teks sekecil mungkin", "Menu tersembunyi"]'::JSONB, 0, 'Konsistensi mengurangi kebingungan pengguna.', 4),
  ('formatif', (SELECT id FROM modules WHERE order_num = 5), 'Prototipe berbeda dari produk akhir karena prototipe…', '["Sudah disebarluaskan", "Versi awal untuk diuji dan direvisi", "Tidak boleh diubah", "Dibuat sesudah laporan"]'::JSONB, 1, 'Prototipe = versi awal untuk uji dan revisi.', 5)
) AS v(kind, module_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'formatif' AND module_id = (SELECT id FROM modules WHERE order_num = 5));

INSERT INTO quiz_questions (kind, module_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('formatif', (SELECT id FROM modules WHERE order_num = 6), 'Ahli media menilai antara lain…', '["Tampilan, navigasi, dan keterbacaan", "Kebenaran rumus statistik", "Kurikulum nasional", "Biaya pengembangan"]'::JSONB, 0, 'Ahli media menilai aspek teknis dan tampilan.', 1),
  ('formatif', (SELECT id FROM modules WHERE order_num = 6), 'Butir angket validasi harus…', '["Jelas, satu gagasan per butir, dan dapat dinilai", "Panjang dan bercabang", "Berisi dua pertanyaan sekaligus", "Tanpa skala"]'::JSONB, 0, 'Butir yang baik tunggal dan terukur.', 2),
  ('formatif', (SELECT id FROM modules WHERE order_num = 6), 'Kolom saran pada angket validasi berguna untuk…', '["Mengisi halaman kosong", "Menangkap masukan kualitatif untuk revisi", "Menaikkan skor", "Menggantikan skala"]'::JSONB, 1, 'Saran validator menjadi bahan revisi.', 3),
  ('formatif', (SELECT id FROM modules WHERE order_num = 6), 'Jumlah validator yang lazim untuk tiap aspek adalah…', '["Minimal dua orang yang ahli di bidangnya", "Satu mahasiswa", "Semua responden", "Tidak perlu validator"]'::JSONB, 0, 'Umumnya dua validator atau lebih per aspek.', 4),
  ('formatif', (SELECT id FROM modules WHERE order_num = 6), 'Instrumen validasi sebaiknya…', '["Mengacu pada indikator kelayakan yang jelas", "Dibuat spontan saat bertemu validator", "Disalin dari produk lain tanpa penyesuaian", "Berisi soal ujian"]'::JSONB, 0, 'Instrumen disusun dari indikator kelayakan.', 5)
) AS v(kind, module_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'formatif' AND module_id = (SELECT id FROM modules WHERE order_num = 6));

INSERT INTO quiz_questions (kind, module_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('formatif', (SELECT id FROM modules WHERE order_num = 7), 'Skor validasi 3, 4, 4, 5, 4, 4, 5, 3 dari 8 butir skala 5. Persentasenya…', '["70%", "75%", "80%", "85%"]'::JSONB, 2, 'Jumlah 32 ÷ 40 × 100% = 80%.', 1),
  ('formatif', (SELECT id FROM modules WHERE order_num = 7), 'Dua validator memberi 85% dan 75%. Rata-ratanya…', '["75%", "78%", "80%", "82%"]'::JSONB, 2, '(85 + 75) ÷ 2 = 80%.', 2),
  ('formatif', (SELECT id FROM modules WHERE order_num = 7), 'Produk dengan persentase 58% (kategori 41–60% kurang layak) sebaiknya…', '["Langsung disebarluaskan", "Direvisi sesuai saran lalu divalidasi ulang", "Dihapus", "Diuji lapangan tanpa revisi"]'::JSONB, 1, 'Kurang layak berarti revisi dan validasi ulang.', 3),
  ('formatif', (SELECT id FROM modules WHERE order_num = 7), 'Tabel kategori kelayakan berfungsi untuk…', '["Menafsirkan persentase menjadi keputusan layak atau tidak", "Menghitung sampel", "Menyusun storyboard", "Mengatur jadwal"]'::JSONB, 0, 'Kategori menerjemahkan angka menjadi keputusan.', 4),
  ('formatif', (SELECT id FROM modules WHERE order_num = 7), 'Data validasi yang bersifat saran tertulis dianalisis secara…', '["Kualitatif, dirangkum sebagai dasar revisi", "Dihitung rata-ratanya", "Diabaikan", "Diubah menjadi persen"]'::JSONB, 0, 'Saran dianalisis kualitatif.', 5)
) AS v(kind, module_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'formatif' AND module_id = (SELECT id FROM modules WHERE order_num = 7));

INSERT INTO quiz_questions (kind, module_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('formatif', (SELECT id FROM modules WHERE order_num = 8), 'Uji coba kelompok kecil biasanya melibatkan…', '["Sekitar 6 sampai 12 pengguna", "Seluruh angkatan", "Hanya validator", "Tidak ada pengguna"]'::JSONB, 0, 'Kelompok kecil berkisar 6 sampai 12 orang.', 1),
  ('formatif', (SELECT id FROM modules WHERE order_num = 8), 'Instrumen yang dipakai saat uji coba untuk mengukur kepraktisan adalah…', '["Angket respons pengguna", "Angket validasi ahli", "Lembar anggaran", "Daftar pustaka"]'::JSONB, 0, 'Kepraktisan diukur dari respons pengguna.', 2),
  ('formatif', (SELECT id FROM modules WHERE order_num = 8), 'Keefektifan produk diukur dari…', '["Perubahan hasil belajar sebelum dan sesudah memakai produk", "Jumlah halaman", "Warna sampul", "Lama pengembangan"]'::JSONB, 0, 'Keefektifan = dampak pada hasil belajar.', 3),
  ('formatif', (SELECT id FROM modules WHERE order_num = 8), 'Sesudah uji kelompok kecil, langkah berikutnya adalah…', '["Revisi lalu uji lapangan lebih luas", "Diseminasi", "Menulis Bab 1", "Menghapus produk"]'::JSONB, 0, 'Revisi dulu, lalu uji lapangan.', 4),
  ('formatif', (SELECT id FROM modules WHERE order_num = 8), 'Implementasi produk di kelas sebaiknya…', '["Mengikuti rencana pembelajaran dan dicatat prosesnya", "Tanpa rencana", "Tanpa pencatatan", "Dilakukan oleh validator"]'::JSONB, 0, 'Implementasi terencana dan terdokumentasi.', 5)
) AS v(kind, module_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'formatif' AND module_id = (SELECT id FROM modules WHERE order_num = 8));

INSERT INTO quiz_questions (kind, module_id, question, options, answer_idx, explanation, order_num)
SELECT * FROM (VALUES
  ('formatif', (SELECT id FROM modules WHERE order_num = 9), 'Kuasi-eksperimen berbeda dari eksperimen murni karena…', '["Kelompok tidak dipilih secara acak penuh", "Tidak ada perlakuan", "Tidak ada pengukuran", "Selalu memakai satu orang"]'::JSONB, 0, 'Kuasi = tanpa randomisasi penuh.', 1),
  ('formatif', (SELECT id FROM modules WHERE order_num = 9), 'Pre-test 50 dan post-test 80 dengan maksimal 100 menghasilkan peningkatan skor…', '["0,30", "0,50", "0,60", "0,80"]'::JSONB, 2, '(80 − 50) ÷ (100 − 50) = 30 ÷ 50 = 0,60.', 2),
  ('formatif', (SELECT id FROM modules WHERE order_num = 9), 'Peningkatan skor 0,25 termasuk…', '["Rendah", "Sedang", "Tinggi", "Sempurna"]'::JSONB, 0, 'Di bawah 0,3 = rendah.', 3),
  ('formatif', (SELECT id FROM modules WHERE order_num = 9), 'Pelaporan hasil R&D sebaiknya memuat…', '["Proses pengembangan, hasil validasi, hasil uji coba, dan revisi", "Hanya kesimpulan", "Hanya lampiran", "Hanya judul"]'::JSONB, 0, 'Laporan lengkap mencakup seluruh siklus.', 4),
  ('formatif', (SELECT id FROM modules WHERE order_num = 9), 'Publikasi hasil R&D bermanfaat untuk…', '["Menyebarkan produk dan temuan agar dipakai pihak lain", "Menyembunyikan data", "Menghindari revisi", "Mengganti judul"]'::JSONB, 0, 'Publikasi adalah bagian diseminasi.', 5)
) AS v(kind, module_id, question, options, answer_idx, explanation, order_num)
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE kind = 'formatif' AND module_id = (SELECT id FROM modules WHERE order_num = 9));

-- Verifikasi:
-- select kind, count(*) from quiz_questions group by kind order by kind;
--   -> formatif 45, post 20, pre 20, vark 12
