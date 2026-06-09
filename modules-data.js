/* ══════════════════════════════════════════════════════
   SMART-FLIP 5.0 — modules-data.js
   Shared data: 9 modul + kuis formatif (5 soal/modul)
   MK Metode Penelitian & Pengembangan
   ══════════════════════════════════════════════════════ */

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
    color: '#8FA287',
    kuis: [
      {
        q: 'Penelitian pengembangan (R&D) dalam pendidikan bertujuan utama untuk…',
        options: [
          'Menghasilkan produk tertentu dan menguji efektivitasnya',
          'Mendeskripsikan fenomena pendidikan secara alamiah',
          'Menguji hipotesis dengan pendekatan statistik inferensial',
          'Menganalisis dokumen kurikulum secara mendalam',
        ],
        answer: 0,
      },
      {
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
        q: 'Studi pendahuluan dalam penelitian R&D dilakukan untuk…',
        options: [
          'Menentukan hipotesis penelitian',
          'Mengidentifikasi kebutuhan dan masalah di lapangan',
          'Memilih validator ahli',
          'Menyusun instrumen kuis',
        ],
        answer: 1,
      },
      {
        q: 'Produk yang dapat dihasilkan dalam penelitian pengembangan antara lain…',
        options: [
          'Hanya buku teks',
          'Hanya perangkat lunak',
          'Media, modul, perangkat pembelajaran, atau kurikulum',
          'Hanya instrumen tes',
        ],
        answer: 2,
      },
      {
        q: 'Penelitian R&D umumnya memerlukan waktu yang lebih lama karena…',
        options: [
          'Jumlah responden yang sangat besar',
          'Melibatkan siklus desain, pengembangan, validasi, dan uji coba berulang',
          'Analisis data yang sangat kompleks',
          'Penggunaan laboratorium khusus',
        ],
        answer: 1,
      },
    ],
  },

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
    color: '#8FA287',
    kuis: [
      {
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
        q: 'Pada fase Analysis dalam ADDIE, kegiatan utama yang dilakukan adalah…',
        options: [
          'Membuat prototipe produk pertama',
          'Mengidentifikasi kebutuhan belajar dan karakteristik peserta didik',
          'Melaksanakan pembelajaran menggunakan produk',
          'Mengevaluasi efektivitas produk final',
        ],
        answer: 1,
      },
      {
        q: 'Model 4D dikembangkan oleh…',
        options: [
          'Dick, Carey & Carey',
          'Borg & Gall',
          'Thiagarajan, Semmel & Semmel',
          'Kemp, Morrison & Ross',
        ],
        answer: 2,
      },
      {
        q: 'Tahap Disseminate dalam model 4D bertujuan untuk…',
        options: [
          'Menyebarluaskan produk yang telah valid kepada pengguna lebih luas',
          'Menganalisis kebutuhan awal pengembangan',
          'Merancang blueprint produk',
          'Mengembangkan instrumen validasi',
        ],
        answer: 0,
      },
      {
        q: 'Perbedaan utama model ADDIE dan 4D terletak pada…',
        options: [
          'Jumlah validator yang dilibatkan',
          'ADDIE memiliki tahap Evaluation eksplisit, 4D memiliki tahap Disseminate',
          'Model 4D hanya untuk pengembangan software',
          'ADDIE lebih cocok untuk penelitian kualitatif',
        ],
        answer: 1,
      },
    ],
  },

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
    color: '#8FA287',
    kuis: [
      {
        q: 'Needs assessment dalam penelitian R&D bertujuan untuk…',
        options: [
          'Menentukan jumlah validator yang diperlukan',
          'Mengidentifikasi kesenjangan antara kondisi nyata dan kondisi yang diharapkan',
          'Membuat jadwal penelitian',
          'Memilih model pengembangan yang tepat',
        ],
        answer: 1,
      },
      {
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
        q: 'Gap analysis dalam konteks needs assessment adalah…',
        options: [
          'Analisis perbedaan antara dua model pengembangan',
          'Teknik untuk mengidentifikasi kesenjangan antara kondisi aktual dan kondisi ideal',
          'Metode statistik untuk menguji signifikansi perbedaan',
          'Cara menilai kualitas instrumen penelitian',
        ],
        answer: 1,
      },
      {
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
        q: 'Triangulasi dalam needs assessment berfungsi untuk…',
        options: [
          'Menambah jumlah responden',
          'Meningkatkan validitas data dengan menggunakan lebih dari satu sumber atau metode',
          'Mempercepat proses pengumpulan data',
          'Mengurangi bias validator',
        ],
        answer: 1,
      },
    ],
  },

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
    color: '#8FA287',
    kuis: [
      {
        q: 'Latar belakang masalah dalam proposal R&D sebaiknya diawali dengan…',
        options: [
          'Kutipan definisi dari kamus',
          'Data empiris atau fakta yang menunjukkan adanya kesenjangan di lapangan',
          'Pendapat pribadi peneliti',
          'Daftar referensi yang digunakan',
        ],
        answer: 1,
      },
      {
        q: 'Rumusan masalah yang baik dalam penelitian R&D harus…',
        options: [
          'Bersifat umum dan luas agar mencakup banyak aspek',
          'Dirumuskan dalam bentuk pertanyaan yang dapat dijawab melalui penelitian',
          'Mengandung minimal 5 variabel penelitian',
          'Ditulis dalam bahasa Inggris',
        ],
        answer: 1,
      },
      {
        q: 'Tujuan penelitian pengembangan umumnya diarahkan untuk…',
        options: [
          'Mendeskripsikan fenomena yang sudah ada',
          'Menghasilkan dan menguji kelayakan produk yang dikembangkan',
          'Membuktikan teori yang berlaku',
          'Mengukur prestasi belajar siswa',
        ],
        answer: 1,
      },
      {
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
        q: 'Batasan masalah dalam proposal penelitian berfungsi untuk…',
        options: [
          'Memperluas cakupan penelitian',
          'Membatasi ruang lingkup penelitian agar fokus dan dapat dilaksanakan',
          'Menentukan jumlah validator',
          'Mengurangi jumlah rumusan masalah',
        ],
        answer: 1,
      },
    ],
  },

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
    color: '#C8925A',
    kuis: [
      {
        q: 'Blueprint produk dalam penelitian R&D berfungsi sebagai…',
        options: [
          'Laporan akhir penelitian',
          'Rancangan awal yang menjadi acuan pengembangan produk',
          'Instrumen untuk mengukur hasil belajar',
          'Dokumen validasi dari ahli',
        ],
        answer: 1,
      },
      {
        q: 'Storyboard dalam pengembangan media pembelajaran berisi…',
        options: [
          'Hanya teks narasi tanpa visualisasi',
          'Urutan scene, teks, visual, audio, dan interaksi tiap halaman',
          'Hasil analisis statistik data penelitian',
          'Daftar referensi media yang digunakan',
        ],
        answer: 1,
      },
      {
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
        q: 'Validasi desain (blueprint) dilakukan oleh…',
        options: [
          'Hanya peneliti sendiri',
          'Ahli materi dan ahli media secara terpisah',
          'Seluruh mahasiswa kelas',
          'Kepala sekolah',
        ],
        answer: 1,
      },
      {
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
  },

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
    color: '#9B8B7A',
    kuis: [
      {
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
        q: 'Validator dalam penelitian pengembangan sebaiknya terdiri dari minimal…',
        options: [
          'Satu orang ahli umum',
          'Dua orang: ahli materi dan ahli media',
          'Lima orang guru',
          'Sepuluh mahasiswa senior',
        ],
        answer: 1,
      },
      {
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
        q: 'Reliabilitas instrumen validasi dapat diuji menggunakan…',
        options: [
          'Uji normalitas',
          'Koefisien Alpha Cronbach atau kesepakatan antar-rater (inter-rater reliability)',
          'Uji homogenitas',
          'Analisis regresi',
        ],
        answer: 1,
      },
    ],
  },

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
    color: '#9B8B7A',
    kuis: [
      {
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
        q: 'Jika skor total yang diperoleh = 76 dan skor maksimal = 100, maka persentase kelayakan adalah…',
        options: ['86%', '76%', '66%', '96%'],
        answer: 1,
      },
      {
        q: 'Berdasarkan kriteria Arikunto, produk dinyatakan "Sangat Layak" jika persentase berada pada rentang…',
        options: ['< 40%', '40–55%', '56–75%', '76–100%'],
        answer: 3,
      },
      {
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
        q: 'Revisi produk dilakukan jika hasil validasi menunjukkan…',
        options: [
          'Persentase kelayakan ≥ 80% tanpa catatan',
          'Adanya catatan atau saran perbaikan dari validator',
          'Semua validator memberikan nilai sempurna',
          'Tidak ada validator yang merespons',
        ],
        answer: 1,
      },
    ],
  },

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
    color: '#9B8B7A',
    kuis: [
      {
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
        q: 'Urutan tahapan uji coba yang benar dalam R&D adalah…',
        options: [
          'Uji lapangan → Uji kelompok kecil → Uji perorangan',
          'Uji perorangan → Uji kelompok kecil → Uji lapangan',
          'Uji kelompok kecil → Uji perorangan → Uji lapangan',
          'Validasi ahli → Uji lapangan → Uji perorangan',
        ],
        answer: 1,
      },
      {
        q: 'Uji coba kelompok kecil idealnya melibatkan…',
        options: [
          '1–3 orang',
          '6–12 orang',
          '30–50 orang',
          '>100 orang',
        ],
        answer: 1,
      },
      {
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
        q: 'Revisi produk setelah uji coba dilakukan berdasarkan…',
        options: [
          'Keinginan peneliti semata',
          'Data kuantitatif dan kualitatif dari respons pengguna serta observasi',
          'Saran pembimbing tanpa data lapangan',
          'Perbandingan dengan produk kompetitor',
        ],
        answer: 1,
      },
    ],
  },

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
    color: '#9B8B7A',
    kuis: [
      {
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
        q: 'Urutan bab yang benar dalam laporan penelitian R&D adalah…',
        options: [
          'Metode → Pendahuluan → Kajian Teori → Hasil → Kesimpulan',
          'Pendahuluan → Kajian Teori → Metode → Hasil & Pembahasan → Kesimpulan',
          'Hasil → Metode → Pendahuluan → Kajian Teori → Kesimpulan',
          'Kesimpulan → Hasil → Metode → Pendahuluan',
        ],
        answer: 1,
      },
      {
        q: 'Artikel jurnal dari penelitian R&D umumnya berfokus pada…',
        options: [
          'Hanya deskripsi produk tanpa data validasi',
          'Proses pengembangan, hasil validasi, dan efektivitas produk',
          'Tinjauan pustaka tanpa data empiris',
          'Kritik terhadap penelitian sebelumnya',
        ],
        answer: 1,
      },
      {
        q: 'Diseminasi hasil penelitian R&D dapat dilakukan melalui…',
        options: [
          'Hanya seminar nasional',
          'Publikasi jurnal, seminar, dan distribusi produk ke institusi lain',
          'Presentasi di kelas saja',
          'Mengunggah ke media sosial pribadi',
        ],
        answer: 1,
      },
      {
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
  },
];
