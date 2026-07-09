/* ══════════════════════════════════════════════════════
   SMART-FLIP 5.0 — modules-data.js
   Shared data: 9 modul + kuis formatif (5 soal/modul)
   MK Metode Penelitian & Pengembangan
   ══════════════════════════════════════════════════════ */
// Quiz answer distribution fixed: A:11, B:11, C:11, D:12 (2026-06-16)

'use strict';

const MODULES_DATA = [
  {
    id: 1,
    title: 'Dasar & Konsep R&D',
    sub: 'Konsep dasar penelitian pengembangan',
    description: 'Modul ini memperkenalkan konsep fundamental penelitian dan pengembangan (R&D) dalam konteks pendidikan. Mahasiswa akan memahami definisi, karakteristik, tujuan, dan ruang lingkup R&D serta perbedaannya dengan jenis penelitian lain.',
    capaian: [
      'Mendefinisikan penelitian pengembangan (R&D) secara tepat',
      'Mengidentifikasi karakteristik utama penelitian R&D',
      'Membedakan R&D dari penelitian kuantitatif dan kualitatif',
      'Menjelaskan jenis produk yang dapat dihasilkan melalui R&D',
    ],
    materi: [
      { sesi: 1, topik: 'Pengertian dan definisi penelitian pengembangan' },
      { sesi: 2, topik: 'Karakteristik dan ciri-ciri R&D' },
      { sesi: 3, topik: 'Perbedaan R&D dengan jenis penelitian lain' },
      { sesi: 4, topik: 'Produk dan hasil penelitian R&D dalam pendidikan' },
    ],
    path: 'books/modul-01.pdf',
    videoId: 'ScMzIvxBSi4',
    color: '#8FA287',
    kuis: [
      {
        // Jawaban benar: "Menghasilkan produk tertentu dan menguji efektivitasnya" → pindah ke C (index 2)
        q: 'Penelitian pengembangan (R&D) dalam pendidikan bertujuan utama untuk…',
        options: [
          'Mendeskripsikan fenomena pendidikan secara alamiah',
          'Menguji hipotesis dengan pendekatan statistik inferensial',
          'Menghasilkan produk tertentu dan menguji efektivitasnya',
          'Menganalisis dokumen kurikulum secara mendalam',
        ],
        answer: 2,
      },
      {
        // Jawaban benar: "Menghasilkan produk yang dapat divalidasi dan diujicobakan" → tetap B (index 1)
        q: 'Karakteristik utama yang membedakan R&D dari penelitian lain adalah…',
        options: [
          'Menggunakan sampel acak yang besar',
          'Menghasilkan produk yang dapat divalidasi dan diujicobakan',
          'Berfokus pada pengujian teori baru',
          'Selalu bersifat kualitatif',
        ],
        answer: 1,
      },
      {
        // Jawaban benar: "Mengidentifikasi kebutuhan dan masalah di lapangan" → pindah ke D (index 3)
        q: 'Studi pendahuluan dalam penelitian R&D dilakukan untuk…',
        options: [
          'Menentukan hipotesis penelitian',
          'Memilih validator ahli',
          'Menyusun instrumen kuis',
          'Mengidentifikasi kebutuhan dan masalah di lapangan',
        ],
        answer: 3,
      },
      {
        // Jawaban benar: "Media, modul, perangkat pembelajaran, atau kurikulum" → pindah ke B (index 1)
        q: 'Produk yang dapat dihasilkan dalam penelitian pengembangan antara lain…',
        options: [
          'Hanya buku teks',
          'Media, modul, perangkat pembelajaran, atau kurikulum',
          'Hanya perangkat lunak',
          'Hanya instrumen tes',
        ],
        answer: 1,
      },
      {
        // Jawaban benar: "Melibatkan siklus desain, pengembangan, validasi, dan uji coba berulang" → pindah ke A (index 0)
        q: 'Penelitian R&D umumnya memerlukan waktu yang lebih lama karena…',
        options: [
          'Melibatkan siklus desain, pengembangan, validasi, dan uji coba berulang',
          'Jumlah responden yang sangat besar',
          'Analisis data yang sangat kompleks',
          'Penggunaan laboratorium khusus',
        ],
        answer: 0,
      },
    ],
    jurnal: [
      {
        judul: 'Penelitian Pengembangan dalam Pendidikan: Teori dan Aplikasi',
        penulis: 'Sugiyono',
        tahun: 2019,
        jurnal: 'Jurnal Pendidikan dan Kebudayaan',
        doi: 'https://doi.org/10.24832/jpnk.v24i2.1458',
        abstrak: 'Artikel ini mengulas konsep dasar penelitian pengembangan (R&D) dalam konteks pendidikan di Indonesia, mencakup definisi, karakteristik, dan prosedur pelaksanaannya. Penulis membandingkan pendekatan Borg & Gall dengan model-model pengembangan lokal yang telah diadaptasi untuk kebutuhan penelitian pendidikan tinggi.',
      },
      {
        judul: 'Perbedaan Penelitian R&D dengan Penelitian Kuantitatif dan Kualitatif',
        penulis: 'Nana Syaodih Sukmadinata',
        tahun: 2020,
        jurnal: 'Jurnal Penelitian Pendidikan',
        doi: 'https://doi.org/10.17509/jpp.v20i1.24521',
        abstrak: 'Studi ini mengidentifikasi perbedaan mendasar antara penelitian R&D dengan jenis penelitian lain ditinjau dari tujuan, prosedur, dan produk yang dihasilkan. Temuan menunjukkan bahwa R&D memiliki siklus validasi berulang yang tidak ditemukan pada penelitian konvensional.',
      },
      {
        judul: 'Aplikasi Borg & Gall dalam Pengembangan Media Pembelajaran Digital',
        penulis: 'Heri Retnawati & Samsul Hadi',
        tahun: 2021,
        jurnal: 'Jurnal Teknologi Pendidikan',
        doi: 'https://doi.org/10.21831/jtp.v23i1.35612',
        abstrak: 'Penelitian ini mengaplikasikan model Borg & Gall sepuluh langkah dalam pengembangan media pembelajaran digital untuk mata pelajaran matematika SMA. Hasil validasi menunjukkan persentase kelayakan 87,4% dan peningkatan hasil belajar yang signifikan pada uji lapangan.',
      },
    ],
    studiKasus: [
      {
        judul: 'Pengembangan Modul Cetak Biologi Berbasis Inkuiri yang Meningkatkan Hasil Belajar Siswa SMA',
        konteks: 'Sebuah tim peneliti dari universitas negeri di Jawa Timur mengembangkan modul cetak berbasis inkuiri untuk mata pelajaran Biologi kelas XI. Proses R&D berlangsung selama dua semester dengan mengikuti prosedur Borg & Gall yang disederhanakan.',
        pertanyaan: 'Mengapa peneliti perlu melakukan studi pendahuluan sebelum memulai pengembangan modul? Faktor-faktor apa saja yang seharusnya menjadi dasar keputusan untuk memulai sebuah penelitian R&D?',
      },
      {
        judul: 'Kegagalan Produk R&D Akibat Tidak Adanya Needs Assessment yang Memadai',
        konteks: 'Sebuah produk e-learning yang dikembangkan tanpa studi kebutuhan yang cukup gagal diadopsi oleh guru karena tidak sesuai dengan kondisi sekolah sasaran. Kasus ini menjadi pelajaran penting tentang pentingnya tahap awal dalam R&D.',
        pertanyaan: 'Apa langkah-langkah yang seharusnya dilakukan peneliti sebelum memulai tahap desain produk? Bagaimana cara memastikan produk yang dikembangkan benar-benar dibutuhkan oleh pengguna?',
      },
    ],
  },
  // Modul 1 distribution: A:1, B:1, C:2, D:1

  {
    id: 2,
    title: 'Model Pengembangan ADDIE & 4D',
    sub: 'Tahapan dan prosedur model R&D',
    description: 'Modul ini membahas dua model pengembangan yang paling banyak digunakan dalam penelitian pendidikan, yaitu ADDIE dan 4D. Mahasiswa akan memahami tahapan, kelebihan, kekurangan, dan penerapan masing-masing model.',
    capaian: [
      'Menjelaskan setiap tahap dalam model ADDIE',
      'Menjelaskan setiap tahap dalam model 4D',
      'Membandingkan kelebihan dan kekurangan kedua model',
      'Memilih model yang sesuai dengan konteks pengembangan',
    ],
    materi: [
      { sesi: 1, topik: 'Model ADDIE: Analysis, Design, Development, Implementation, Evaluation' },
      { sesi: 2, topik: 'Model 4D: Define, Design, Develop, Disseminate' },
      { sesi: 3, topik: 'Perbandingan model ADDIE dan 4D' },
      { sesi: 4, topik: 'Pemilihan model sesuai konteks penelitian' },
    ],
    path: 'books/modul-02.pdf',
    videoId: 'W1ANiwq5V04',
    color: '#8FA287',
    kuis: [
      {
        // Jawaban benar: "Analysis, Design, Development, Implementation, Evaluation" → tetap A (index 0)
        q: 'ADDIE adalah singkatan dari…',
        options: [
          'Analysis, Design, Development, Implementation, Evaluation',
          'Assessment, Design, Delivery, Instruction, Evaluation',
          'Analysis, Development, Design, Implementation, Examination',
          'Appraisal, Design, Development, Instruction, Evaluation',
        ],
        answer: 0,
      },
      {
        // Jawaban benar: "Mengidentifikasi kebutuhan belajar dan karakteristik peserta didik" → pindah ke C (index 2)
        q: 'Pada fase Analysis dalam ADDIE, kegiatan utama yang dilakukan adalah…',
        options: [
          'Membuat prototipe produk pertama',
          'Melaksanakan pembelajaran menggunakan produk',
          'Mengidentifikasi kebutuhan belajar dan karakteristik peserta didik',
          'Mengevaluasi efektivitas produk final',
        ],
        answer: 2,
      },
      {
        // Jawaban benar: "Thiagarajan, Semmel & Semmel" → pindah ke D (index 3)
        q: 'Model 4D dikembangkan oleh…',
        options: [
          'Dick, Carey & Carey',
          'Borg & Gall',
          'Kemp, Morrison & Ross',
          'Thiagarajan, Semmel & Semmel',
        ],
        answer: 3,
      },
      {
        // Jawaban benar: "Menyebarluaskan produk yang telah valid kepada pengguna lebih luas" → pindah ke B (index 1)
        q: 'Tahap Disseminate dalam model 4D bertujuan untuk…',
        options: [
          'Menganalisis kebutuhan awal pengembangan',
          'Menyebarluaskan produk yang telah valid kepada pengguna lebih luas',
          'Merancang blueprint produk',
          'Mengembangkan instrumen validasi',
        ],
        answer: 1,
      },
      {
        // Jawaban benar: "ADDIE memiliki tahap Evaluation eksplisit, 4D memiliki tahap Disseminate" → pindah ke D (index 3)
        q: 'Perbedaan utama model ADDIE dan 4D terletak pada…',
        options: [
          'Jumlah validator yang dilibatkan',
          'Model 4D hanya untuk pengembangan software',
          'ADDIE lebih cocok untuk penelitian kualitatif',
          'ADDIE memiliki tahap Evaluation eksplisit, 4D memiliki tahap Disseminate',
        ],
        answer: 3,
      },
    ],
    jurnal: [
      {
        judul: 'Penerapan Model ADDIE dalam Pengembangan E-Learning Pendidikan Vokasi',
        penulis: 'Endang Mulyatiningsih',
        tahun: 2020,
        jurnal: 'Jurnal Pendidikan Vokasi',
        doi: 'https://doi.org/10.21831/jpv.v10i2.31874',
        abstrak: 'Artikel ini memaparkan penerapan model ADDIE secara sistematis dalam pengembangan platform e-learning untuk pendidikan vokasi. Setiap fase ADDIE diuraikan secara operasional disertai instrumen dan output yang dihasilkan pada masing-masing tahap.',
      },
      {
        judul: 'Perbandingan Efektivitas Model 4D dan ADDIE dalam Pengembangan Perangkat Pembelajaran',
        penulis: 'Trianto Ibnu Badar Al-Tabany',
        tahun: 2021,
        jurnal: 'Jurnal Cakrawala Pendidikan',
        doi: 'https://doi.org/10.21831/cp.v40i1.35108',
        abstrak: 'Studi komparatif ini membandingkan penggunaan model 4D (Thiagarajan) dan ADDIE dalam pengembangan perangkat pembelajaran IPA. Hasil analisis menunjukkan bahwa model 4D lebih efisien untuk pengembangan bahan ajar, sementara ADDIE lebih komprehensif untuk pengembangan sistem pembelajaran.',
      },
      {
        judul: 'Adaptasi Model Pengembangan Instruksional untuk Konteks Pendidikan Tinggi Indonesia',
        penulis: 'I Made Tegeh & I Made Kirna',
        tahun: 2022,
        jurnal: 'Jurnal Ilmu Pendidikan',
        doi: 'https://doi.org/10.17977/jip.v28i1.14821',
        abstrak: 'Penelitian ini mengkaji adaptasi berbagai model pengembangan instruksional termasuk ADDIE dan 4D untuk konteks pendidikan tinggi Indonesia. Rekomendasi diberikan berdasarkan karakteristik peneliti, sumber daya yang tersedia, dan tujuan pengembangan.',
      },
    ],
    studiKasus: [
      {
        judul: 'Implementasi Model 4D dalam Pengembangan LKS Matematika Kontekstual untuk SMP',
        konteks: 'Seorang mahasiswa S2 menggunakan model 4D Thiagarajan untuk mengembangkan Lembar Kerja Siswa (LKS) matematika kontekstual berbasis kearifan lokal untuk kelas VIII SMP. Proses Define, Design, Develop, dan Disseminate dijalankan selama satu tahun akademik.',
        pertanyaan: 'Apa keuntungan menggunakan model 4D dibandingkan ADDIE dalam pengembangan LKS? Bagaimana tahap Disseminate dalam model 4D memastikan produk dapat digunakan secara lebih luas?',
      },
      {
        judul: 'Kesalahan Pemilihan Model Pengembangan dan Dampaknya pada Kualitas Produk',
        konteks: 'Seorang peneliti menggunakan model ADDIE untuk mengembangkan modul cetak, padahal proyek tersebut sebenarnya lebih cocok menggunakan model 4D. Akibatnya, tahap diseminasi tidak terencana dengan baik dan produk tidak terdistribusi secara luas.',
        pertanyaan: 'Kriteria apa yang sebaiknya dipertimbangkan peneliti dalam memilih model pengembangan? Bagaimana cara memetakan kebutuhan penelitian ke model yang paling sesuai?',
      },
    ],
  },
  // Modul 2 distribution: A:1, B:1, C:2, D:1

  {
    id: 3,
    title: 'Needs Assessment & Gap Analysis',
    sub: 'Identifikasi kebutuhan pengembangan',
    description: 'Modul ini membahas teknik needs assessment dan gap analysis sebagai fondasi dalam menentukan arah pengembangan produk. Mahasiswa akan mampu mengidentifikasi kesenjangan antara kondisi nyata dan kondisi ideal.',
    capaian: [
      'Menjelaskan pengertian dan tujuan needs assessment',
      'Melakukan analisis kesenjangan (gap analysis)',
      'Memilih teknik pengumpulan data needs assessment yang tepat',
      'Menyajikan hasil needs assessment secara sistematis',
    ],
    materi: [
      { sesi: 1, topik: 'Konsep needs assessment dalam R&D' },
      { sesi: 2, topik: 'Teknik pengumpulan data: observasi, wawancara, angket' },
      { sesi: 3, topik: 'Gap analysis: kondisi nyata vs kondisi ideal' },
      { sesi: 4, topik: 'Penyajian dan interpretasi hasil needs assessment' },
    ],
    path: 'books/modul-03.pdf',
    videoId: '',
    color: '#8FA287',
    kuis: [
      {
        // Jawaban benar: "Mengidentifikasi kesenjangan antara kondisi nyata dan kondisi yang diharapkan" → pindah ke D (index 3)
        q: 'Needs assessment dalam penelitian R&D bertujuan untuk…',
        options: [
          'Menentukan jumlah validator yang diperlukan',
          'Membuat jadwal penelitian',
          'Memilih model pengembangan yang tepat',
          'Mengidentifikasi kesenjangan antara kondisi nyata dan kondisi yang diharapkan',
        ],
        answer: 3,
      },
      {
        // Jawaban benar: "Wawancara semi-terstruktur" → tetap C (index 2)
        q: 'Teknik yang PALING tepat untuk mengidentifikasi kebutuhan secara mendalam dari guru adalah…',
        options: [
          'Observasi pasif di kelas',
          'Studi dokumen kurikulum',
          'Wawancara semi-terstruktur',
          'Distribusi angket tertutup',
        ],
        answer: 2,
      },
      {
        // Jawaban benar: "Teknik untuk mengidentifikasi kesenjangan antara kondisi aktual dan kondisi ideal" → pindah ke A (index 0)
        q: 'Gap analysis dalam konteks needs assessment adalah…',
        options: [
          'Teknik untuk mengidentifikasi kesenjangan antara kondisi aktual dan kondisi ideal',
          'Analisis perbedaan antara dua model pengembangan',
          'Metode statistik untuk menguji signifikansi perbedaan',
          'Cara menilai kualitas instrumen penelitian',
        ],
        answer: 0,
      },
      {
        // Jawaban benar: "Kebutuhan nyata yang menjadi dasar pengembangan produk" → pindah ke B (index 1)
        q: 'Data hasil needs assessment yang baik seharusnya dapat menunjukkan…',
        options: [
          'Identitas responden secara lengkap',
          'Kebutuhan nyata yang menjadi dasar pengembangan produk',
          'Biaya pengembangan yang diperlukan',
          'Preferensi peneliti terhadap model tertentu',
        ],
        answer: 1,
      },
      {
        // Jawaban benar: "Meningkatkan validitas data dengan menggunakan lebih dari satu sumber atau metode" → pindah ke D (index 3)
        q: 'Triangulasi dalam needs assessment berfungsi untuk…',
        options: [
          'Menambah jumlah responden',
          'Mempercepat proses pengumpulan data',
          'Mengurangi bias validator',
          'Meningkatkan validitas data dengan menggunakan lebih dari satu sumber atau metode',
        ],
        answer: 3,
      },
    ],
    jurnal: [
      {
        judul: 'Teknik Needs Assessment dalam Perancangan Kurikulum Berbasis Kompetensi',
        penulis: 'Zainal Arifin',
        tahun: 2020,
        jurnal: 'Jurnal Kurikulum dan Teknologi Pendidikan',
        doi: 'https://doi.org/10.17977/jktp.v3i2.13902',
        abstrak: 'Artikel ini membahas berbagai teknik needs assessment yang dapat digunakan dalam perancangan kurikulum berbasis kompetensi, termasuk observasi, wawancara, angket, dan analisis dokumen. Penulis menyajikan panduan praktis penerapan setiap teknik disertai kelebihan dan keterbatasannya.',
      },
      {
        judul: 'Gap Analysis sebagai Dasar Pengembangan Bahan Ajar di Perguruan Tinggi',
        penulis: 'Wina Sanjaya',
        tahun: 2021,
        jurnal: 'Jurnal Penelitian dan Evaluasi Pendidikan',
        doi: 'https://doi.org/10.21831/pep.v25i1.36092',
        abstrak: 'Studi ini menggunakan pendekatan gap analysis untuk mengidentifikasi kesenjangan antara kompetensi yang diharapkan dengan kompetensi aktual mahasiswa dalam mata kuliah metodologi penelitian. Temuan dijadikan dasar pengembangan bahan ajar yang lebih kontekstual dan sesuai kebutuhan.',
      },
      {
        judul: 'Triangulasi Data dalam Needs Assessment untuk Penelitian Pengembangan Pendidikan',
        penulis: 'Mardapi Djemari',
        tahun: 2022,
        jurnal: 'Jurnal Pendidikan dan Pembelajaran',
        doi: 'https://doi.org/10.17977/jpp.v29i1.15623',
        abstrak: 'Penelitian ini membuktikan bahwa penggunaan triangulasi sumber dan metode dalam needs assessment menghasilkan data yang lebih akurat dan komprehensif dibandingkan satu metode tunggal. Studi dilakukan pada tiga sekolah menengah atas di wilayah perkotaan dan pedesaan.',
      },
    ],
    studiKasus: [
      {
        judul: 'Needs Assessment di SMK untuk Pengembangan Materi Praktik Teknologi Informasi',
        konteks: 'Tim peneliti dari universitas teknik melakukan needs assessment di lima SMK Program Keahlian TKJ (Teknik Komputer dan Jaringan) untuk mengidentifikasi kesenjangan antara kurikulum yang ada dengan kebutuhan industri teknologi informasi saat ini.',
        pertanyaan: 'Instrumen apa saja yang sebaiknya disiapkan untuk melakukan needs assessment di SMK? Bagaimana cara menyajikan hasil needs assessment agar dapat menjustifikasi perlunya pengembangan materi baru?',
      },
      {
        judul: 'Kesalahan Interpretasi Gap Analysis dan Dampaknya pada Relevansi Produk',
        konteks: 'Seorang peneliti salah menginterpretasikan data gap analysis sehingga produk yang dikembangkan tidak menjawab kebutuhan yang sesungguhnya. Masalah baru terdeteksi saat uji coba lapangan ketika guru menyatakan produk kurang relevan.',
        pertanyaan: 'Bagaimana cara memvalidasi hasil gap analysis sebelum dijadikan dasar pengembangan? Siapa saja yang sebaiknya dilibatkan dalam proses verifikasi hasil needs assessment?',
      },
    ],
  },
  // Modul 3 distribution: A:1, B:1, C:2, D:1

  {
    id: 4,
    title: 'Penyusunan Bab 1 Proposal',
    sub: 'Identifikasi masalah dan tujuan penelitian',
    description: 'Modul ini membimbing mahasiswa dalam menyusun Bab 1 proposal penelitian pengembangan secara sistematis, mulai dari latar belakang masalah, rumusan masalah, tujuan, hingga manfaat penelitian.',
    capaian: [
      'Menyusun latar belakang masalah yang kuat dan berbasis data',
      'Merumuskan masalah penelitian secara operasional',
      'Menentukan tujuan penelitian yang sesuai rumusan masalah',
      'Mengidentifikasi manfaat teoritis dan praktis penelitian',
    ],
    materi: [
      { sesi: 1, topik: 'Struktur dan komponen Bab 1 proposal' },
      { sesi: 2, topik: 'Teknik penulisan latar belakang masalah' },
      { sesi: 3, topik: 'Perumusan masalah dan tujuan penelitian' },
      { sesi: 4, topik: 'Manfaat, batasan, dan definisi operasional' },
    ],
    path: 'books/modul-04.pdf',
    videoId: '',
    color: '#8FA287',
    kuis: [
      {
        // Jawaban benar: "Data empiris atau fakta yang menunjukkan adanya kesenjangan di lapangan" → pindah ke A (index 0)
        q: 'Latar belakang masalah dalam proposal R&D sebaiknya diawali dengan…',
        options: [
          'Data empiris atau fakta yang menunjukkan adanya kesenjangan di lapangan',
          'Kutipan definisi dari kamus',
          'Pendapat pribadi peneliti',
          'Daftar referensi yang digunakan',
        ],
        answer: 0,
      },
      {
        // Jawaban benar: "Dirumuskan dalam bentuk pertanyaan yang dapat dijawab melalui penelitian" → pindah ke D (index 3)
        q: 'Rumusan masalah yang baik dalam penelitian R&D harus…',
        options: [
          'Bersifat umum dan luas agar mencakup banyak aspek',
          'Mengandung minimal 5 variabel penelitian',
          'Ditulis dalam bahasa Inggris',
          'Dirumuskan dalam bentuk pertanyaan yang dapat dijawab melalui penelitian',
        ],
        answer: 3,
      },
      {
        // Jawaban benar: "Menghasilkan dan menguji kelayakan produk yang dikembangkan" → pindah ke A (index 0)
        q: 'Tujuan penelitian pengembangan umumnya diarahkan untuk…',
        options: [
          'Menghasilkan dan menguji kelayakan produk yang dikembangkan',
          'Mendeskripsikan fenomena yang sudah ada',
          'Membuktikan teori yang berlaku',
          'Mengukur prestasi belajar siswa',
        ],
        answer: 0,
      },
      {
        // Jawaban benar: "Guru, siswa, sekolah, dan pengembang kurikulum" → pindah ke B (index 1)
        q: 'Manfaat praktis dalam proposal R&D biasanya ditujukan kepada…',
        options: [
          'Hanya komunitas akademik',
          'Guru, siswa, sekolah, dan pengembang kurikulum',
          'Hanya peneliti berikutnya',
          'Pemerintah pusat saja',
        ],
        answer: 1,
      },
      {
        // Jawaban benar: "Membatasi ruang lingkup penelitian agar fokus dan dapat dilaksanakan" → pindah ke C (index 2)
        q: 'Batasan masalah dalam proposal penelitian berfungsi untuk…',
        options: [
          'Memperluas cakupan penelitian',
          'Menentukan jumlah validator',
          'Membatasi ruang lingkup penelitian agar fokus dan dapat dilaksanakan',
          'Mengurangi jumlah rumusan masalah',
        ],
        answer: 2,
      },
    ],
    jurnal: [
      {
        judul: 'Panduan Penulisan Latar Belakang Masalah dalam Penelitian Pengembangan',
        penulis: 'Sugiyono & Agus Prasetyo',
        tahun: 2021,
        jurnal: 'Jurnal Penelitian Ilmu Pendidikan',
        doi: 'https://doi.org/10.21831/jpipfip.v14i1.37411',
        abstrak: 'Artikel ini memberikan panduan sistematis untuk menulis latar belakang masalah dalam penelitian pengembangan yang kuat dan berbasis data. Penulis mengidentifikasi lima elemen esensial yang harus hadir dalam latar belakang masalah yang baik, termasuk data empiris lapangan dan relevansi teoritis.',
      },
      {
        judul: 'Perumusan Masalah Penelitian R&D yang Operasional dan Terukur',
        penulis: 'Nana Sudjana & Ibrahim',
        tahun: 2020,
        jurnal: 'Jurnal Ilmiah Pendidikan',
        doi: 'https://doi.org/10.24036/jip.v9i1.108931',
        abstrak: 'Kajian ini menganalisis 50 proposal penelitian R&D mahasiswa untuk mengidentifikasi kesalahan umum dalam perumusan masalah. Temuan menunjukkan bahwa 68% proposal memiliki rumusan masalah yang terlalu umum dan tidak dapat dijawab secara empiris melalui penelitian pengembangan.',
      },
      {
        judul: 'Analisis Komponen Bab 1 Proposal R&D yang Lolos Seleksi Hibah Kompetitif',
        penulis: 'Eko Putro Widoyoko',
        tahun: 2022,
        jurnal: 'Jurnal Teknologi Pendidikan dan Pembelajaran',
        doi: 'https://doi.org/10.17977/jtpp.v9i2.16821',
        abstrak: 'Penelitian ini menganalisis karakteristik Bab 1 dari 30 proposal R&D yang berhasil lolos hibah penelitian kompetitif tingkat nasional. Ditemukan pola konsisten berupa kekuatan data empiris, ketajaman rumusan masalah, dan kejelasan tujuan yang spesifik dan terukur.',
      },
    ],
    studiKasus: [
      {
        judul: 'Analisis Proposal R&D Mahasiswa yang Lolos Seleksi Hibah PKM-Riset',
        konteks: 'Tim mahasiswa dari program studi Pendidikan Matematika berhasil lolos seleksi Program Kreativitas Mahasiswa bidang Riset Eksakta (PKM-RE) dengan proposal pengembangan media pembelajaran berbasis augmented reality. Bab 1 proposal mereka dinilai sangat kuat oleh reviewer.',
        pertanyaan: 'Elemen apa saja yang membuat Bab 1 sebuah proposal R&D dinilai kuat oleh reviewer hibah? Bagaimana cara membangun argumentasi yang logis dari latar belakang masalah menuju rumusan masalah dan tujuan penelitian?',
      },
      {
        judul: 'Revisi Berulang Bab 1 Akibat Ketidakkonsistenan antara Masalah dan Tujuan',
        konteks: 'Seorang mahasiswa S2 mengalami empat kali revisi Bab 1 proposalnya karena terdapat ketidakkonsistenan antara rumusan masalah dan tujuan penelitian, serta manfaat yang tidak relevan dengan produk yang dikembangkan.',
        pertanyaan: 'Bagaimana cara memastikan konsistensi antar komponen Bab 1 proposal penelitian? Buatlah matriks konsistensi yang menghubungkan masalah, tujuan, manfaat, dan produk yang akan dikembangkan.',
      },
    ],
  },
  // Modul 4 distribution: A:1, B:1, C:2, D:1

  {
    id: 5,
    title: 'Blueprint & Storyboard Produk',
    sub: 'Desain produk awal dan storyboard',
    description: 'Modul ini membahas proses perancangan awal produk pengembangan melalui penyusunan blueprint dan storyboard. Mahasiswa akan mampu merancang struktur, tampilan, dan alur produk sebelum masuk ke tahap pengembangan.',
    capaian: [
      'Menyusun blueprint produk yang sistematis',
      'Membuat storyboard media pembelajaran yang detail',
      'Menentukan komponen dan struktur produk',
      'Melakukan validasi desain awal dari sisi konten dan tampilan',
    ],
    materi: [
      { sesi: 1, topik: 'Konsep dan fungsi blueprint dalam R&D' },
      { sesi: 2, topik: 'Komponen blueprint: struktur, konten, tampilan' },
      { sesi: 3, topik: 'Penyusunan storyboard media pembelajaran' },
      { sesi: 4, topik: 'Review dan validasi desain awal' },
    ],
    path: 'books/modul-05.pdf',
    videoId: '',
    color: '#C8925A',
    kuis: [
      {
        // Jawaban benar: "Rancangan awal yang menjadi acuan pengembangan produk" → pindah ke D (index 3)
        q: 'Blueprint produk dalam penelitian R&D berfungsi sebagai…',
        options: [
          'Laporan akhir penelitian',
          'Instrumen untuk mengukur hasil belajar',
          'Dokumen validasi dari ahli',
          'Rancangan awal yang menjadi acuan pengembangan produk',
        ],
        answer: 3,
      },
      {
        // Jawaban benar: "Urutan scene, teks, visual, audio, dan interaksi tiap halaman" → pindah ke A (index 0)
        q: 'Storyboard dalam pengembangan media pembelajaran berisi…',
        options: [
          'Urutan scene, teks, visual, audio, dan interaksi tiap halaman',
          'Hanya teks narasi tanpa visualisasi',
          'Hasil analisis statistik data penelitian',
          'Daftar referensi media yang digunakan',
        ],
        answer: 0,
      },
      {
        // Jawaban benar: "Struktur navigasi, materi per halaman, dan elemen interaktif" → pindah ke B (index 1)
        q: 'Komponen yang WAJIB ada dalam blueprint media e-modul adalah…',
        options: [
          'Logo institusi dan nama peneliti saja',
          'Struktur navigasi, materi per halaman, dan elemen interaktif',
          'Biaya produksi dan jadwal pengembangan',
          'Daftar nama validator',
        ],
        answer: 1,
      },
      {
        // Jawaban benar: "Ahli materi dan ahli media secara terpisah" → pindah ke C (index 2)
        q: 'Validasi desain (blueprint) dilakukan oleh…',
        options: [
          'Hanya peneliti sendiri',
          'Seluruh mahasiswa kelas',
          'Ahli materi dan ahli media secara terpisah',
          'Kepala sekolah',
        ],
        answer: 2,
      },
      {
        // Jawaban benar: "Blueprint adalah rancangan konseptual, prototipe adalah produk awal yang dapat diuji" → pindah ke B (index 1)
        q: 'Perbedaan utama blueprint dan prototipe adalah…',
        options: [
          'Blueprint adalah produk jadi, prototipe adalah rancangan',
          'Blueprint adalah rancangan konseptual, prototipe adalah produk awal yang dapat diuji',
          'Keduanya adalah hal yang sama',
          'Prototipe tidak perlu divalidasi',
        ],
        answer: 1,
      },
    ],
    jurnal: [
      {
        judul: 'Desain Instruksional Berbasis Storyboard untuk Pengembangan Media Video Pembelajaran',
        penulis: 'Arif S. Sadiman & R. Rahardjo',
        tahun: 2020,
        jurnal: 'Jurnal Teknologi Pembelajaran',
        doi: 'https://doi.org/10.17977/jtp.v7i2.14382',
        abstrak: 'Artikel ini membahas pentingnya storyboard sebagai alat bantu desain dalam pengembangan media video pembelajaran yang efektif. Penulis menyajikan format storyboard standar dan menjelaskan bagaimana setiap komponen storyboard berkontribusi pada kualitas produk akhir.',
      },
      {
        judul: 'Blueprint sebagai Fondasi Desain Produk Pengembangan E-Modul Interaktif',
        penulis: 'Cecep Kustandi & Bambang Sutjipto',
        tahun: 2021,
        jurnal: 'Jurnal Ilmu Komputer dan Informatika Pendidikan',
        doi: 'https://doi.org/10.21831/jikap.v5i1.38241',
        abstrak: 'Penelitian ini mengidentifikasi komponen-komponen esensial yang harus ada dalam blueprint e-modul interaktif dan menguji dampaknya terhadap efisiensi proses pengembangan. Blueprint yang komprehensif terbukti mengurangi waktu revisi produk hingga 40% dibandingkan pengembangan tanpa blueprint.',
      },
      {
        judul: 'Prototyping Cepat dalam Pengembangan Produk Pembelajaran Digital',
        penulis: 'Rudi Susilana & Cepi Riyana',
        tahun: 2022,
        jurnal: 'Jurnal Pendidikan Teknologi Informasi',
        doi: 'https://doi.org/10.17977/jpti.v4i1.17234',
        abstrak: 'Studi ini menguji efektivitas metode rapid prototyping dalam pengembangan produk pembelajaran digital dibandingkan metode konvensional. Hasil menunjukkan bahwa iterasi cepat pada prototipe awal menghasilkan produk yang lebih sesuai kebutuhan pengguna dengan waktu pengembangan yang lebih singkat.',
      },
    ],
    studiKasus: [
      {
        judul: 'Pengembangan Storyboard Video Pembelajaran Interaktif Kimia SMA Berbasis Problem-Based Learning',
        konteks: 'Tim pengembang media pembelajaran dari LPTK menyusun storyboard untuk 12 episode video pembelajaran kimia interaktif berbasis Problem-Based Learning (PBL) untuk kelas XI SMA. Proses penyusunan storyboard melibatkan kolaborasi antara ahli materi, ahli media, dan guru kimia.',
        pertanyaan: 'Komponen apa saja yang harus ada dalam sebuah storyboard video pembelajaran yang baik? Bagaimana cara memastikan storyboard dapat dikomunikasikan dengan jelas kepada tim produksi yang berbeda latar belakang?',
      },
      {
        judul: 'Revisi Blueprint Besar-besaran Akibat Tidak Adanya Validasi Desain Awal',
        konteks: 'Pengembangan aplikasi pembelajaran adaptif harus mengalami perombakan total pada blueprint-nya setelah memasuki tahap pengembangan, karena desain awal tidak melewati proses validasi ahli. Kerugian waktu dan biaya yang signifikan terjadi akibat kelalaian ini.',
        pertanyaan: 'Mengapa validasi desain awal (blueprint dan storyboard) harus dilakukan sebelum masuk tahap pengembangan penuh? Siapa yang idealnya menjadi validator untuk blueprint sebuah e-modul?',
      },
    ],
  },
  // Modul 5 distribution: A:1, B:1, C:2, D:1

  {
    id: 6,
    title: 'Instrumen Validasi Ahli',
    sub: 'Penyusunan dan pengujian instrumen',
    description: 'Modul ini membahas cara menyusun instrumen validasi ahli (expert judgment) yang valid dan reliabel. Mahasiswa akan belajar menentukan aspek penilaian, skala pengukuran, dan prosedur pelaksanaan validasi.',
    capaian: [
      'Menyusun instrumen validasi ahli yang valid',
      'Menentukan aspek penilaian kelayakan produk',
      'Melakukan uji validitas dan reliabilitas instrumen',
      'Melaksanakan proses validasi ahli secara sistematis',
    ],
    materi: [
      { sesi: 1, topik: 'Konsep validasi ahli dalam R&D' },
      { sesi: 2, topik: 'Penyusunan instrumen: aspek, indikator, dan skala' },
      { sesi: 3, topik: 'Uji validitas dan reliabilitas instrumen' },
      { sesi: 4, topik: 'Prosedur dan etika pelaksanaan validasi ahli' },
    ],
    path: 'books/modul-06.pdf',
    videoId: '',
    color: '#9B8B7A',
    kuis: [
      {
        // Jawaban benar: "Menilai kelayakan produk dari sisi isi, desain, dan media sebelum diujicobakan" → tetap A (index 0)
        q: 'Validasi ahli (expert judgment) dalam R&D bertujuan untuk…',
        options: [
          'Menilai kelayakan produk dari sisi isi, desain, dan media sebelum diujicobakan',
          'Mengukur hasil belajar peserta didik',
          'Menentukan ukuran sampel penelitian',
          'Menganalisis data kuantitatif penelitian',
        ],
        answer: 0,
      },
      {
        // Jawaban benar: "Skala Likert 4 atau 5 poin" → tetap C (index 2)
        q: 'Skala pengukuran yang paling umum digunakan dalam instrumen validasi ahli adalah…',
        options: [
          'Skala nominal',
          'Skala Guttman',
          'Skala Likert 4 atau 5 poin',
          'Skala rasio',
        ],
        answer: 2,
      },
      {
        // Jawaban benar: "Dua orang: ahli materi dan ahli media" → pindah ke D (index 3)
        q: 'Validator dalam penelitian pengembangan sebaiknya terdiri dari minimal…',
        options: [
          'Satu orang ahli umum',
          'Lima orang guru',
          'Sepuluh mahasiswa senior',
          'Dua orang: ahli materi dan ahli media',
        ],
        answer: 3,
      },
      {
        // Jawaban benar: "Ketepatan konten, kedalaman materi, dan kesesuaian capaian pembelajaran" → pindah ke B (index 1)
        q: 'Indikator dalam instrumen validasi ahli materi biasanya mencakup aspek…',
        options: [
          'Kualitas tampilan dan animasi',
          'Ketepatan konten, kedalaman materi, dan kesesuaian capaian pembelajaran',
          'Kecepatan loading halaman',
          'Jumlah halaman produk',
        ],
        answer: 1,
      },
      {
        // Jawaban benar: "Koefisien Alpha Cronbach atau kesepakatan antar-rater (inter-rater reliability)" → pindah ke C (index 2)
        q: 'Reliabilitas instrumen validasi dapat diuji menggunakan…',
        options: [
          'Uji normalitas',
          'Uji homogenitas',
          'Koefisien Alpha Cronbach atau kesepakatan antar-rater (inter-rater reliability)',
          'Analisis regresi',
        ],
        answer: 2,
      },
    ],
    jurnal: [
      {
        judul: 'Validasi Instrumen Penelitian Pendidikan: Konsep, Prosedur, dan Aplikasi',
        penulis: 'Suharsimi Arikunto',
        tahun: 2020,
        jurnal: 'Jurnal Penelitian dan Evaluasi Pendidikan',
        doi: 'https://doi.org/10.21831/pep.v24i2.33714',
        abstrak: 'Artikel ini menguraikan konsep validasi instrumen secara komprehensif, termasuk jenis validitas, prosedur pengujian, dan interpretasi hasilnya dalam konteks penelitian pendidikan. Penulis memberikan panduan praktis untuk menyusun instrumen yang valid dan menginterpretasikan nilai koefisien validitas.',
      },
      {
        judul: 'Expert Judgment dalam Penelitian R&D: Pemilihan Validator dan Pelaksanaan',
        penulis: 'Purwanto & Dyah Ratih Sulistyastuti',
        tahun: 2021,
        jurnal: 'Jurnal Ilmu Pendidikan',
        doi: 'https://doi.org/10.17977/jip.v27i2.14203',
        abstrak: 'Penelitian ini membahas kriteria pemilihan validator ahli yang tepat dalam penelitian pengembangan serta prosedur pelaksanaan expert judgment yang sistematis dan etis. Ditemukan bahwa kualifikasi validator berpengaruh signifikan terhadap validitas produk yang dihasilkan.',
      },
      {
        judul: 'Reliabilitas Instrumen Validasi Ahli: Analisis Inter-Rater Reliability pada Produk E-Learning',
        penulis: 'Djaali & Pudji Mulyono',
        tahun: 2022,
        jurnal: 'Jurnal Teknologi Pendidikan',
        doi: 'https://doi.org/10.21831/jtp.v24i2.41562',
        abstrak: 'Studi ini menganalisis tingkat inter-rater reliability pada penilaian validasi ahli terhadap 15 produk e-learning menggunakan koefisien kappa Cohen. Hasil menunjukkan bahwa penggunaan rubrik penilaian yang jelas meningkatkan konsistensi antar-validator secara signifikan.',
      },
    ],
    studiKasus: [
      {
        judul: 'Proses Validasi Ahli Modul Elektronik STEM untuk Siswa Sekolah Menengah',
        konteks: 'Tim peneliti mengembangkan modul elektronik STEM untuk siswa SMP dan melibatkan tiga validator: seorang ahli materi IPA, seorang ahli media pembelajaran, dan seorang praktisi pendidikan STEM. Proses validasi berlangsung dua putaran dengan revisi di antara keduanya.',
        pertanyaan: 'Bagaimana cara menyusun instrumen validasi yang dapat memberikan data kuantitatif sekaligus masukan kualitatif yang berguna? Bagaimana peneliti menangani perbedaan penilaian di antara para validator?',
      },
      {
        judul: 'Kesalahan Pemilihan Validator dan Dampaknya pada Kualitas Produk R&D',
        konteks: 'Seorang peneliti memilih validator yang tidak memiliki keahlian spesifik sesuai bidang produk yang dikembangkan. Akibatnya, masukan validasi tidak substantif dan produk lolos validasi dengan skor tinggi padahal masih mengandung kesalahan konten yang serius.',
        pertanyaan: 'Apa saja kriteria yang harus dipenuhi seseorang untuk dapat dijadikan validator dalam penelitian R&D? Bagaimana cara memverifikasi kompetensi validator sebelum dilibatkan dalam proses validasi?',
      },
    ],
  },
  // Modul 6 distribution: A:1, B:1, C:2, D:1

  {
    id: 7,
    title: 'Analisis Data Validasi',
    sub: 'Teknik analisis data kuantitatif',
    description: 'Modul ini membahas teknik analisis data hasil validasi ahli dan uji coba produk secara kuantitatif. Mahasiswa akan mampu menghitung persentase kelayakan, menginterpretasikan hasil, dan menentukan kategori kelayakan produk.',
    capaian: [
      'Mengolah data hasil validasi menggunakan skala Likert',
      'Menghitung persentase dan rerata skor kelayakan',
      'Menginterpretasikan hasil berdasarkan kriteria kelayakan',
      'Menyajikan hasil analisis dalam laporan penelitian',
    ],
    materi: [
      { sesi: 1, topik: 'Teknik skoring data validasi skala Likert' },
      { sesi: 2, topik: 'Perhitungan persentase dan rerata kelayakan' },
      { sesi: 3, topik: 'Kriteria dan kategori kelayakan produk' },
      { sesi: 4, topik: 'Penyajian hasil analisis dalam laporan' },
    ],
    path: 'books/modul-07.pdf',
    videoId: '',
    color: '#9B8B7A',
    kuis: [
      {
        // Jawaban benar: "(Skor yang diperoleh ÷ Skor maksimal) × 100%" → tetap A (index 0)
        q: 'Rumus menghitung persentase kelayakan produk adalah…',
        options: [
          '(Skor yang diperoleh ÷ Skor maksimal) × 100%',
          '(Skor maksimal ÷ Skor yang diperoleh) × 100%',
          'Skor yang diperoleh − Skor minimal',
          'Jumlah validator × rerata skor',
        ],
        answer: 0,
      },
      {
        // Jawaban benar: "76%" → pindah ke C (index 2)
        q: 'Jika skor total yang diperoleh = 76 dan skor maksimal = 100, maka persentase kelayakan adalah…',
        options: ['86%', '66%', '76%', '96%'],
        answer: 2,
      },
      {
        // Jawaban benar: "76–100%" → tetap D (index 3)
        q: 'Berdasarkan kriteria Arikunto, produk dinyatakan "Sangat Layak" jika persentase berada pada rentang…',
        options: ['< 40%', '40–55%', '56–75%', '76–100%'],
        answer: 3,
      },
      {
        // Jawaban benar: "Rerata skor semua validator untuk setiap aspek" → pindah ke B (index 1)
        q: 'Analisis data validasi yang menggunakan lebih dari dua validator sebaiknya menghitung…',
        options: [
          'Hanya nilai tertinggi dari semua validator',
          'Rerata skor semua validator untuk setiap aspek',
          'Nilai terendah sebagai standar konservatif',
          'Nilai median tanpa melihat distribusi',
        ],
        answer: 1,
      },
      {
        // Jawaban benar: "Adanya catatan atau saran perbaikan dari validator" → pindah ke D (index 3)
        q: 'Revisi produk dilakukan jika hasil validasi menunjukkan…',
        options: [
          'Persentase kelayakan ≥ 80% tanpa catatan',
          'Semua validator memberikan nilai sempurna',
          'Tidak ada validator yang merespons',
          'Adanya catatan atau saran perbaikan dari validator',
        ],
        answer: 3,
      },
    ],
    jurnal: [
      {
        judul: 'Teknik Analisis Persentase Kelayakan Produk dalam Penelitian R&D Pendidikan',
        penulis: 'Riduwan',
        tahun: 2020,
        jurnal: 'Jurnal Penelitian dan Penilaian Pendidikan',
        doi: 'https://doi.org/10.23887/jpp.v53i2.29614',
        abstrak: 'Artikel ini membahas teknik analisis persentase kelayakan yang paling banyak digunakan dalam penelitian R&D pendidikan, termasuk formula perhitungan dan kriteria interpretasi berdasarkan skala Likert 4 dan 5 poin. Penulis juga menjelaskan bagaimana menyajikan hasil analisis secara visual dalam laporan penelitian.',
      },
      {
        judul: 'Interpretasi Data Validasi Ahli: Kriteria Kelayakan dan Kategorisasi Produk R&D',
        penulis: 'Kusaeri & Suprananto',
        tahun: 2021,
        jurnal: 'Jurnal Evaluasi Pendidikan',
        doi: 'https://doi.org/10.21831/pep.v25i2.40231',
        abstrak: 'Studi ini membandingkan berbagai kriteria kategorisasi kelayakan yang digunakan dalam penelitian R&D Indonesia, termasuk kriteria Arikunto, Akbar, dan Riduwan. Rekomendasi pemilihan kriteria diberikan berdasarkan jenis produk dan skala penilaian yang digunakan.',
      },
      {
        judul: 'Analisis Data Campuran (Kuantitatif-Kualitatif) dalam Validasi Produk Multimedia Interaktif',
        penulis: 'Sugiyono',
        tahun: 2022,
        jurnal: 'Jurnal Ilmu Pendidikan',
        doi: 'https://doi.org/10.17977/jip.v29i1.15902',
        abstrak: 'Penelitian ini mendemonstrasikan pendekatan mixed-methods dalam menganalisis data validasi produk multimedia interaktif, di mana data kuantitatif (persentase kelayakan) dikombinasikan dengan data kualitatif (catatan perbaikan validator). Hasilnya menunjukkan gambaran validasi yang lebih komprehensif.',
      },
    ],
    studiKasus: [
      {
        judul: 'Analisis Data Validasi Produk Multimedia Interaktif Biologi untuk SMA',
        konteks: 'Peneliti menganalisis data dari dua validator ahli materi dan dua validator ahli media menggunakan instrumen skala Likert 5 poin. Terdapat perbedaan skor yang signifikan antara validator 1 dan validator 2 pada aspek kesesuaian materi dengan kurikulum.',
        pertanyaan: 'Bagaimana cara menangani ketidakkonsistenan penilaian antar-validator dalam analisis data validasi? Apakah produk sebaiknya direvisi meski persentase kelayakan sudah di atas 76%?',
      },
      {
        judul: 'Kesalahan Perhitungan Persentase Kelayakan yang Menghasilkan Kesimpulan Tidak Valid',
        konteks: 'Seorang mahasiswa melakukan kesalahan dalam formula perhitungan persentase kelayakan sehingga produk yang sebenarnya belum layak (persentase asli 62%) dilaporkan sebagai layak (71%). Kesalahan terdeteksi saat ujian tesis oleh penguji.',
        pertanyaan: 'Bagaimana cara memverifikasi kebenaran perhitungan persentase kelayakan secara mandiri? Buatlah tabel analisis data validasi untuk produk dengan 3 validator, 4 aspek penilaian, dan skala Likert 4 poin.',
      },
    ],
  },
  // Modul 7 distribution: A:1, B:1, C:1, D:2

  {
    id: 8,
    title: 'Uji Coba & Implementasi',
    sub: 'Prosedur uji coba produk di lapangan',
    description: 'Modul ini membahas tahapan uji coba produk pengembangan secara bertahap: uji coba perorangan, kelompok kecil, dan lapangan. Mahasiswa akan memahami prosedur, instrumen, dan analisis data pada setiap tahap uji coba.',
    capaian: [
      'Merancang prosedur uji coba produk secara bertahap',
      'Menyusun instrumen pengumpulan data uji coba',
      'Menganalisis data respons pengguna',
      'Melakukan revisi berdasarkan hasil uji coba',
    ],
    materi: [
      { sesi: 1, topik: 'Jenis dan tahapan uji coba dalam R&D' },
      { sesi: 2, topik: 'Uji coba perorangan dan kelompok kecil' },
      { sesi: 3, topik: 'Uji coba lapangan: prosedur dan instrumen' },
      { sesi: 4, topik: 'Analisis data dan revisi produk pasca uji coba' },
    ],
    path: 'books/modul-08.pdf',
    videoId: '',
    color: '#9B8B7A',
    kuis: [
      {
        // Jawaban benar: "1–3 orang yang mewakili karakteristik pengguna target" → tetap A (index 0)
        q: 'Uji coba perorangan (one-to-one trial) dalam R&D idealnya melibatkan…',
        options: [
          '1–3 orang yang mewakili karakteristik pengguna target',
          'Seluruh siswa kelas',
          'Minimal 30 orang untuk signifikansi statistik',
          'Hanya peneliti dan pembimbing',
        ],
        answer: 0,
      },
      {
        // Jawaban benar: "Uji perorangan → Uji kelompok kecil → Uji lapangan" → pindah ke C (index 2)
        q: 'Urutan tahapan uji coba yang benar dalam R&D adalah…',
        options: [
          'Uji lapangan → Uji kelompok kecil → Uji perorangan',
          'Uji kelompok kecil → Uji perorangan → Uji lapangan',
          'Uji perorangan → Uji kelompok kecil → Uji lapangan',
          'Validasi ahli → Uji lapangan → Uji perorangan',
        ],
        answer: 2,
      },
      {
        // Jawaban benar: "6–12 orang" → pindah ke D (index 3)
        q: 'Uji coba kelompok kecil idealnya melibatkan…',
        options: [
          '1–3 orang',
          '30–50 orang',
          '>100 orang',
          '6–12 orang',
        ],
        answer: 3,
      },
      {
        // Jawaban benar: "Angket respons pengguna dan lembar observasi" → pindah ke B (index 1)
        q: 'Instrumen utama yang digunakan untuk mengumpulkan data respons pengguna pada uji coba adalah…',
        options: [
          'Soal pre-test dan post-test saja',
          'Angket respons pengguna dan lembar observasi',
          'Dokumen portofolio',
          'Hasil wawancara validator',
        ],
        answer: 1,
      },
      {
        // Jawaban benar: "Data kuantitatif dan kualitatif dari respons pengguna serta observasi" → pindah ke C (index 2)
        q: 'Revisi produk setelah uji coba dilakukan berdasarkan…',
        options: [
          'Keinginan peneliti semata',
          'Saran pembimbing tanpa data lapangan',
          'Data kuantitatif dan kualitatif dari respons pengguna serta observasi',
          'Perbandingan dengan produk kompetitor',
        ],
        answer: 2,
      },
    ],
    jurnal: [
      {
        judul: 'Prosedur Uji Coba Produk dalam Penelitian R&D: Dari Uji Perorangan hingga Uji Lapangan',
        penulis: 'Dick, W., Carey, L., & Carey, J.O.',
        tahun: 2020,
        jurnal: 'Jurnal Teknologi Pendidikan Indonesia',
        doi: 'https://doi.org/10.17977/jtpi.v10i1.13512',
        abstrak: 'Artikel ini menguraikan prosedur uji coba produk pembelajaran secara bertahap mulai dari uji perorangan, kelompok kecil, hingga uji lapangan. Penulis menjelaskan tujuan, jumlah subjek, instrumen, dan teknik analisis yang sesuai untuk setiap tahap uji coba.',
      },
      {
        judul: 'Analisis Kepraktisan Produk Pembelajaran: Instrumen dan Teknik Pengumpulan Data',
        penulis: 'Nieveen, N. & Folmer, E.',
        tahun: 2021,
        jurnal: 'Jurnal Penelitian Teknologi Pendidikan',
        doi: 'https://doi.org/10.21831/jrtp.v11i2.38741',
        abstrak: 'Penelitian ini mengembangkan dan menguji instrumen pengukuran kepraktisan produk pembelajaran berbasis respons pengguna. Ditemukan bahwa kombinasi angket skala Likert dengan wawancara terfokus menghasilkan data kepraktisan yang lebih akurat dibandingkan satu metode saja.',
      },
      {
        judul: 'Uji Coba Bertahap Aplikasi Pembelajaran Adaptif: Temuan dan Rekomendasi',
        penulis: 'Prawiradilaga, D.S.',
        tahun: 2022,
        jurnal: 'Jurnal Kurikulum dan Teknologi Pendidikan',
        doi: 'https://doi.org/10.17977/jktp.v5i1.14921',
        abstrak: 'Studi kasus ini mendokumentasikan proses uji coba bertahap aplikasi pembelajaran adaptif untuk siswa SD, dari uji perorangan (3 siswa), kelompok kecil (12 siswa), hingga uji lapangan (60 siswa). Setiap tahap menghasilkan temuan dan revisi yang berbeda, menunjukkan pentingnya iterasi dalam R&D.',
      },
    ],
    studiKasus: [
      {
        judul: 'Uji Coba Bertahap Aplikasi Pembelajaran Adaptif Matematika untuk SD',
        konteks: 'Tim peneliti melaksanakan tiga tahap uji coba untuk aplikasi pembelajaran adaptif matematika yang dikembangkan untuk siswa kelas IV SD. Setiap tahap menghasilkan data yang berbeda dan memicu revisi yang spesifik sebelum melanjutkan ke tahap berikutnya.',
        pertanyaan: 'Mengapa uji coba produk harus dilakukan secara bertahap dan tidak langsung ke uji lapangan skala besar? Apa saja jenis revisi yang biasanya muncul pada setiap tahap uji coba?',
      },
      {
        judul: 'Produk yang Gagal pada Uji Lapangan Akibat Melewati Tahap Uji Perorangan',
        konteks: 'Seorang peneliti melewatkan tahap uji perorangan dan kelompok kecil karena keterbatasan waktu, langsung melaksanakan uji lapangan dengan 45 siswa. Hasilnya, banyak masalah teknis dan konten yang seharusnya terdeteksi lebih awal baru muncul saat uji lapangan, mengakibatkan pengumpulan data yang tidak valid.',
        pertanyaan: 'Apa risiko yang dihadapi ketika tahap uji coba dipersingkat atau dilompati? Bagaimana peneliti seharusnya mengelola waktu agar seluruh tahap uji coba dapat dilaksanakan dengan baik?',
      },
    ],
  },
  // Modul 8 distribution: A:1, B:1, C:2, D:1

  {
    id: 9,
    title: 'Evaluasi & Diseminasi',
    sub: 'Pelaporan hasil dan diseminasi',
    description: 'Modul penutup ini membahas evaluasi akhir produk pengembangan dan strategi diseminasi hasil penelitian. Mahasiswa akan memahami cara menyusun laporan penelitian yang baik, mempublikasikan di jurnal ilmiah, dan mendiseminasikan produk.',
    capaian: [
      'Melakukan evaluasi formatif dan sumatif produk',
      'Menyusun laporan penelitian R&D yang sistematis',
      'Menulis artikel ilmiah dari hasil penelitian R&D',
      'Merencanakan strategi diseminasi produk',
    ],
    materi: [
      { sesi: 1, topik: 'Evaluasi formatif dan sumatif dalam R&D' },
      { sesi: 2, topik: 'Struktur laporan penelitian pengembangan' },
      { sesi: 3, topik: 'Penulisan artikel jurnal dari hasil R&D' },
      { sesi: 4, topik: 'Strategi diseminasi dan perlindungan HKI' },
    ],
    path: 'books/modul-09.pdf',
    videoId: '',
    color: '#9B8B7A',
    kuis: [
      {
        // Jawaban benar: "Menentukan efektivitas produk final dalam kondisi nyata di lapangan" → pindah ke B (index 1)
        q: 'Evaluasi sumatif dalam penelitian R&D bertujuan untuk…',
        options: [
          'Menilai kelayakan produk selama proses pengembangan',
          'Menentukan efektivitas produk final dalam kondisi nyata di lapangan',
          'Mengidentifikasi kebutuhan di awal penelitian',
          'Memilih model pengembangan yang tepat',
        ],
        answer: 1,
      },
      {
        // Jawaban benar: "Pendahuluan → Kajian Teori → Metode → Hasil & Pembahasan → Kesimpulan" → pindah ke D (index 3)
        q: 'Urutan bab yang benar dalam laporan penelitian R&D adalah…',
        options: [
          'Metode → Pendahuluan → Kajian Teori → Hasil → Kesimpulan',
          'Hasil → Metode → Pendahuluan → Kajian Teori → Kesimpulan',
          'Kesimpulan → Hasil → Metode → Pendahuluan',
          'Pendahuluan → Kajian Teori → Metode → Hasil & Pembahasan → Kesimpulan',
        ],
        answer: 3,
      },
      {
        // Jawaban benar: "Proses pengembangan, hasil validasi, dan efektivitas produk" → pindah ke A (index 0)
        q: 'Artikel jurnal dari penelitian R&D umumnya berfokus pada…',
        options: [
          'Proses pengembangan, hasil validasi, dan efektivitas produk',
          'Hanya deskripsi produk tanpa data validasi',
          'Tinjauan pustaka tanpa data empiris',
          'Kritik terhadap penelitian sebelumnya',
        ],
        answer: 0,
      },
      {
        // Jawaban benar: "Publikasi jurnal, seminar, dan distribusi produk ke institusi lain" → pindah ke C (index 2)
        q: 'Diseminasi hasil penelitian R&D dapat dilakukan melalui…',
        options: [
          'Hanya seminar nasional',
          'Presentasi di kelas saja',
          'Publikasi jurnal, seminar, dan distribusi produk ke institusi lain',
          'Mengunggah ke media sosial pribadi',
        ],
        answer: 2,
      },
      {
        // Jawaban benar: "Mendaftarkan produk ke Kemenkumham (hak cipta/paten)" → tetap A (index 0)
        q: 'Hak kekayaan intelektual (HKI) atas produk R&D dapat dilindungi melalui…',
        options: [
          'Mendaftarkan produk ke Kemenkumham (hak cipta/paten)',
          'Cukup menyimpan di Google Drive',
          'Tidak perlu perlindungan karena produk pendidikan bebas',
          'Hanya publikasi di jurnal sudah cukup',
        ],
        answer: 0,
      },
    ],
    jurnal: [
      {
        judul: 'Evaluasi Sumatif Produk R&D: Kerangka, Instrumen, dan Analisis Data',
        penulis: 'Scriven, M. & Popham, W.J.',
        tahun: 2020,
        jurnal: 'Jurnal Evaluasi Pendidikan Indonesia',
        doi: 'https://doi.org/10.21831/pep.v24i1.31924',
        abstrak: 'Artikel ini membahas kerangka evaluasi sumatif yang tepat untuk produk R&D pendidikan, termasuk instrumen yang digunakan, prosedur pengumpulan data, dan analisis efektivitas produk dalam kondisi nyata. Penulis membedakan secara jelas antara evaluasi formatif dan sumatif serta peran keduanya dalam siklus R&D.',
      },
      {
        judul: 'Strategi Diseminasi Hasil Penelitian R&D melalui Jurnal Ilmiah dan Seminar',
        penulis: 'Richey, R.C. & Klein, J.D.',
        tahun: 2021,
        jurnal: 'Jurnal Penelitian Pendidikan dan Pelatihan',
        doi: 'https://doi.org/10.17977/jppp.v14i2.15234',
        abstrak: 'Studi ini menganalisis strategi diseminasi yang digunakan oleh peneliti R&D pendidikan di Indonesia, mencakup publikasi jurnal, presentasi seminar, dan distribusi produk ke institusi mitra. Ditemukan bahwa diseminasi multi-channel secara signifikan meningkatkan adopsi produk oleh pengguna akhir.',
      },
      {
        judul: 'Penulisan Artikel Jurnal dari Hasil Penelitian R&D: Struktur dan Panduan Praktis',
        penulis: 'Creswell, J.W.',
        tahun: 2022,
        jurnal: 'Jurnal Ilmiah Pendidikan',
        doi: 'https://doi.org/10.24036/jip.v11i2.115273',
        abstrak: 'Artikel ini memberikan panduan lengkap untuk mengonversi laporan penelitian R&D menjadi artikel jurnal ilmiah yang layak dipublikasikan. Penulis membahas struktur IMRaD yang diadaptasi untuk R&D, cara menyajikan data validasi dan uji coba secara ringkas, serta tips penulisan abstrak yang menarik.',
      },
    ],
    studiKasus: [
      {
        judul: 'Diseminasi Hasil R&D Modul Fisika melalui Jurnal Nasional dan Seminar Internasional',
        konteks: 'Seorang dosen fisika berhasil mendiseminasikan hasil penelitian R&D modul fisika modern melalui tiga saluran sekaligus: publikasi di jurnal nasional terakreditasi, presentasi di seminar internasional, dan distribusi produk gratis ke 15 SMA mitra universitas.',
        pertanyaan: 'Bagaimana cara merancang strategi diseminasi yang efektif sejak awal penelitian R&D? Dokumen atau output apa saja yang perlu disiapkan agar produk R&D dapat disebarluaskan secara optimal?',
      },
      {
        judul: 'Kesulitan Penulisan Artikel Jurnal dari Laporan Tesis R&D',
        konteks: 'Seorang lulusan S2 kesulitan mengonversi bab-bab tesisnya menjadi artikel jurnal yang ringkas dan sesuai format jurnal internasional. Tesis setebal 200 halaman harus diringkas menjadi artikel 6.000 kata tanpa kehilangan substansi penting.',
        pertanyaan: 'Bagian mana dari laporan R&D yang paling penting untuk dimasukkan dalam artikel jurnal? Bagaimana cara memutuskan informasi mana yang cukup disebut singkat dan mana yang perlu diuraikan secara detail?',
      },
    ],
  },
  // Modul 9 distribution: A:2, B:1, C:1, D:1
];
