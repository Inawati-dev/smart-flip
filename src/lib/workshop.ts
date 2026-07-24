import { supabase, isSupabaseConfigured } from './supabase'

// Static per-module workshop content, ported verbatim from the WORKSHOP_DATA
// object embedded in legacy/workshop.html:618-1154. Genuinely varies per
// module (tujuan/aktivitas/checklist/lembarKerja text is unique for all 9
// modules) — not a generic template repeated with substitutions.
//
// This used to be the ONLY source Workshop.tsx read from — no table backed
// it, so dosen had no way to edit it. migration_v9_workshop_content.sql adds
// a `workshop_content` table a dosen can write to; fetchWorkshopContent below
// prefers that row when one exists, falling back to WORKSHOP_DATA otherwise
// so the 9 bundled modules keep working unedited.

export interface AktivitasItem {
  waktu: string
  nama: string
  deskripsi: string
  peran: string
}

export interface LembarKerja {
  judul: string
  instruksi: string
  pertanyaan: string[]
}

export interface WorkshopModule {
  judul: string
  durasi: string
  tujuan: string[]
  aktivitas: AktivitasItem[]
  checklist: string[]
  lembarKerja: LembarKerja
}

export const WORKSHOP_DATA: Record<number, WorkshopModule> = {
  1: {
    judul: 'Dasar & Konsep R&D',
    durasi: '2 x 50 menit',
    tujuan: [
      'Mahasiswa mampu mendiskusikan konsep R&D secara kritis',
      'Mahasiswa mampu membedakan R&D dengan jenis penelitian lain',
      'Mahasiswa mampu memberikan contoh produk R&D yang relevan dalam pendidikan',
    ],
    aktivitas: [
      {
        waktu: '0–15 menit',
        nama: 'Review & Brainstorm',
        deskripsi:
          'Dosen membuka sesi dengan pertanyaan pemantik: "Apa perbedaan utama antara penelitian murni dan R&D?" Mahasiswa berbagi jawaban secara lisan.',
        peran: 'Dosen fasilitator, mahasiswa aktif',
      },
      {
        waktu: '15–50 menit',
        nama: 'Diskusi Kelompok',
        deskripsi:
          'Mahasiswa dibagi 4 kelompok. Setiap kelompok menganalisis 1 contoh penelitian R&D nyata dan mempresentasikan hasil analisisnya.',
        peran: 'Kelompok kecil (7–8 orang)',
      },
      {
        waktu: '50–80 menit',
        nama: 'Presentasi & Umpan Balik',
        deskripsi:
          'Setiap kelompok presentasi 5 menit, kelompok lain memberikan tanggapan. Dosen meluruskan miskonsepsi.',
        peran: 'Presentasi bergantian',
      },
      {
        waktu: '80–100 menit',
        nama: 'Refleksi & Penutup',
        deskripsi:
          'Mahasiswa mengisi lembar refleksi singkat (3 hal yang dipelajari, 2 pertanyaan, 1 rencana aplikasi). Dosen merangkum poin kunci.',
        peran: 'Individual + dosen',
      },
    ],
    checklist: [
      'Membaca e-modul 1 sebelum kelas',
      'Menonton video pengantar R&D',
      'Mengerjakan kuis formatif modul 1',
      'Menyiapkan 1 contoh produk R&D untuk didiskusikan',
      'Mengisi refleksi akhir sesi',
    ],
    lembarKerja: {
      judul: 'Analisis Penelitian R&D',
      instruksi:
        'Temukan 1 artikel jurnal tentang penelitian R&D dalam pendidikan (terbit 2019–2024). Jawab pertanyaan berikut berdasarkan artikel yang Anda pilih:',
      pertanyaan: [
        'Apa produk yang dikembangkan dalam penelitian tersebut?',
        'Model pengembangan apa yang digunakan? Jelaskan alasannya.',
        'Bagaimana cara peneliti melakukan validasi produk?',
        'Apa hasil dan kesimpulan penelitian tersebut?',
        'Apa kelebihan dan kekurangan penelitian ini menurut Anda?',
      ],
    },
  },

  2: {
    judul: 'Model ADDIE & 4D',
    durasi: '2 x 50 menit',
    tujuan: [
      'Mahasiswa mampu menjelaskan setiap tahap model ADDIE secara rinci',
      'Mahasiswa mampu menjelaskan setiap tahap model 4D (Define–Design–Develop–Disseminate)',
      'Mahasiswa mampu membandingkan kelebihan dan kekurangan kedua model',
      'Mahasiswa mampu menentukan model yang tepat untuk konteks penelitian mereka',
    ],
    aktivitas: [
      {
        waktu: '0–10 menit',
        nama: 'Ice Breaking & Review',
        deskripsi:
          'Dosen mengajukan pertanyaan cepat: "Sebutkan satu kata yang merepresentasikan proses pengembangan." Mahasiswa menjawab lisan, dosen menghubungkan dengan ADDIE/4D.',
        peran: 'Seluruh kelas',
      },
      {
        waktu: '10–40 menit',
        nama: 'Simulasi Tahap ADDIE',
        deskripsi:
          'Mahasiswa dibagi 5 kelompok (1 kelompok per tahap ADDIE: Analyze, Design, Develop, Implement, Evaluate). Setiap kelompok menyimulasikan tugasnya dalam konteks pengembangan modul digital dan melaporkan hasilnya.',
        peran: 'Kelompok per tahap (5–6 orang)',
      },
      {
        waktu: '40–70 menit',
        nama: 'Perbandingan ADDIE vs 4D',
        deskripsi:
          'Mahasiswa berpasangan membuat tabel perbandingan ADDIE vs 4D. Pasangan berbagi hasil dengan pasangan lain (think-pair-share). Dosen memfasilitasi diskusi perbedaan krusial.',
        peran: 'Berpasangan lalu berbagi',
      },
      {
        waktu: '70–90 menit',
        nama: 'Pemilihan Model & Justifikasi',
        deskripsi:
          'Setiap mahasiswa menuliskan model yang akan digunakan untuk skripsi/penelitiannya beserta alasan. Beberapa mahasiswa berbagi pilihan dan dosen memberikan masukan.',
        peran: 'Individual, lalu diskusi kelas',
      },
      {
        waktu: '90–100 menit',
        nama: 'Rangkuman & Tindak Lanjut',
        deskripsi:
          'Dosen merangkum poin kunci perbedaan model. Mahasiswa mencatat rencana penggunaan model dalam penelitian masing-masing.',
        peran: 'Dosen + mahasiswa',
      },
    ],
    checklist: [
      'Membaca e-modul 2 tentang model ADDIE dan 4D',
      'Membuat diagram alur salah satu model secara mandiri',
      'Mengerjakan kuis formatif modul 2',
      'Mencari 1 contoh skripsi yang menggunakan model ADDIE atau 4D',
      'Menyiapkan justifikasi pemilihan model untuk penelitian sendiri',
    ],
    lembarKerja: {
      judul: 'Perbandingan Model ADDIE dan 4D',
      instruksi:
        'Isi tabel dan jawab pertanyaan berikut untuk membandingkan dua model pengembangan utama dalam R&D pendidikan.',
      pertanyaan: [
        'Tuliskan tahapan model ADDIE secara lengkap beserta deskripsi singkat setiap tahap.',
        'Tuliskan tahapan model 4D secara lengkap beserta deskripsi singkat setiap tahap.',
        'Apa persamaan utama antara ADDIE dan 4D?',
        'Apa perbedaan paling signifikan antara ADDIE dan 4D?',
        'Model mana yang akan Anda gunakan dalam penelitian Anda dan mengapa? Berikan minimal 2 alasan.',
      ],
    },
  },

  3: {
    judul: 'Needs Assessment',
    durasi: '2 x 50 menit',
    tujuan: [
      'Mahasiswa mampu merancang pertanyaan needs assessment yang valid',
      'Mahasiswa mampu melakukan wawancara needs assessment secara sistematis',
      'Mahasiswa mampu menganalisis dan merumuskan kebutuhan dari data lapangan',
      'Mahasiswa mampu menghubungkan temuan needs assessment dengan rencana produk R&D',
    ],
    aktivitas: [
      {
        waktu: '0–15 menit',
        nama: 'Mini Lecture: Teknik Needs Assessment',
        deskripsi:
          'Dosen menjelaskan 3 metode needs assessment (observasi, wawancara, angket). Mahasiswa mencatat contoh pertanyaan efektif vs tidak efektif.',
        peran: 'Dosen presentasi, mahasiswa mencatat',
      },
      {
        waktu: '15–45 menit',
        nama: 'Praktik Wawancara di Kelas',
        deskripsi:
          'Mahasiswa berpasangan: satu berperan sebagai peneliti, satu sebagai guru/siswa yang diwawancarai. Menggunakan panduan wawancara yang telah disusun. Bergantian peran setelah 15 menit.',
        peran: 'Role-play berpasangan',
      },
      {
        waktu: '45–70 menit',
        nama: 'Analisis Data Wawancara',
        deskripsi:
          'Mahasiswa mengelompokkan temuan wawancara ke dalam kategori: masalah utama, kebutuhan mendesak, dan harapan solusi. Menggunakan template analisis yang disediakan.',
        peran: 'Individual, dipandu dosen',
      },
      {
        waktu: '70–90 menit',
        nama: 'Presentasi Temuan Kebutuhan',
        deskripsi:
          'Beberapa pasangan mempresentasikan temuan needs assessment mereka dalam 3 menit. Kelas memberikan masukan: apakah kebutuhan sudah terdefinisi jelas?',
        peran: 'Berbagi hasil, umpan balik kelas',
      },
      {
        waktu: '90–100 menit',
        nama: 'Refleksi & Penutup',
        deskripsi:
          'Mahasiswa menuliskan: 1 kebutuhan paling kritis yang ditemukan dan bagaimana produk R&D dapat menjawabnya. Dosen merangkum.',
        peran: 'Individual + dosen',
      },
    ],
    checklist: [
      'Membaca e-modul 3 tentang needs assessment',
      'Menyusun panduan wawancara (minimal 8 pertanyaan)',
      'Mengerjakan kuis formatif modul 3',
      'Melakukan observasi awal di sekolah/lembaga terkait',
      'Meringkas temuan needs assessment dalam 1 paragraf',
    ],
    lembarKerja: {
      judul: 'Panduan & Analisis Needs Assessment',
      instruksi:
        'Gunakan lembar ini untuk merancang wawancara needs assessment dan menganalisis temuan Anda di lapangan.',
      pertanyaan: [
        'Tuliskan konteks penelitian Anda: siapa subjek, di mana lokasi, dan apa mata pelajaran/bidang yang diteliti?',
        'Tulis 5 pertanyaan wawancara needs assessment yang akan Anda gunakan.',
        'Setelah praktik wawancara di kelas, apa 3 temuan kebutuhan utama yang Anda identifikasi?',
        'Bagaimana kebutuhan tersebut mendukung urgensi pengembangan produk R&D Anda?',
        'Apa hambatan yang mungkin Anda hadapi saat melakukan needs assessment di lapangan nyata?',
      ],
    },
  },

  4: {
    judul: 'Bab 1 Proposal R&D',
    durasi: '2 x 50 menit',
    tujuan: [
      'Mahasiswa mampu menulis latar belakang masalah yang kuat dan berbasis data',
      'Mahasiswa mampu memberikan umpan balik konstruktif terhadap tulisan teman sejawat',
      'Mahasiswa mampu merevisi latar belakang berdasarkan masukan peer-review',
      'Mahasiswa mampu merumuskan rumusan masalah dan tujuan penelitian yang sesuai',
    ],
    aktivitas: [
      {
        waktu: '0–10 menit',
        nama: 'Briefing Peer-Review',
        deskripsi:
          'Dosen menjelaskan kriteria latar belakang yang baik: (1) fakta/data aktual, (2) kesenjangan yang jelas, (3) solusi yang ditawarkan, (4) urgensi. Mahasiswa menerima rubrik penilaian.',
        peran: 'Dosen + seluruh kelas',
      },
      {
        waktu: '10–40 menit',
        nama: 'Peer-Review Latar Belakang',
        deskripsi:
          'Mahasiswa bertukar draft latar belakang dengan teman. Menggunakan rubrik untuk memberi komentar tertulis pada 4 aspek: kedalaman masalah, relevansi data, kesenjangan solusi, dan kejelasan urgensi.',
        peran: 'Berpasangan silang',
      },
      {
        waktu: '40–65 menit',
        nama: 'Diskusi Hasil Review',
        deskripsi:
          'Mahasiswa berdiskusi dengan pasangan review selama 10 menit untuk klarifikasi komentar. Kemudian 3–4 mahasiswa berbagi pengalaman peer-review yang paling bermakna.',
        peran: 'Pasangan, lalu pleno kelas',
      },
      {
        waktu: '65–90 menit',
        nama: 'Revisi & Penguatan',
        deskripsi:
          'Mahasiswa merevisi latar belakang mereka berdasarkan masukan. Dosen berkeliling memberikan bimbingan individual. Beberapa mahasiswa membacakan revisi untuk mendapat umpan balik lanjutan.',
        peran: 'Individual + dosen berkeliling',
      },
      {
        waktu: '90–100 menit',
        nama: 'Penutup & Komitmen',
        deskripsi:
          'Mahasiswa menuliskan 1 poin paling krusial yang direvisi. Dosen menginformasikan deadline pengumpulan draft bab 1.',
        peran: 'Individual + pengumuman dosen',
      },
    ],
    checklist: [
      'Membaca e-modul 4 tentang penulisan proposal R&D',
      'Membawa draft latar belakang masalah (minimal 500 kata)',
      'Mengerjakan kuis formatif modul 4',
      'Menyiapkan data/referensi pendukung latar belakang',
      'Merumuskan minimal 2 rumusan masalah sementara',
    ],
    lembarKerja: {
      judul: 'Rubrik Peer-Review Latar Belakang',
      instruksi:
        'Gunakan lembar ini untuk memberikan umpan balik terstruktur terhadap latar belakang masalah teman sejawat Anda.',
      pertanyaan: [
        'Nama reviewer dan nama mahasiswa yang di-review. Tuliskan topik/judul penelitian yang di-review.',
        'Nilai aspek kedalaman masalah (1–4): apakah masalah didukung data/fakta yang kuat? Berikan komentar spesifik.',
        'Nilai aspek kesenjangan (1–4): apakah latar belakang menunjukkan gap antara kondisi ideal dan nyata secara jelas? Jelaskan.',
        'Nilai aspek urgensi solusi (1–4): apakah kebutuhan pengembangan produk R&D terasa mendesak? Berikan alasan.',
        'Satu saran paling penting untuk memperkuat latar belakang ini. Tuliskan secara spesifik dan konstruktif.',
      ],
    },
  },

  5: {
    judul: 'Blueprint & Storyboard Produk',
    durasi: '2 x 50 menit',
    tujuan: [
      'Mahasiswa mampu menyusun blueprint produk R&D yang komprehensif',
      'Mahasiswa mampu membuat storyboard untuk produk digital/media',
      'Mahasiswa mampu berkolaborasi dalam tim untuk merancang produk secara visual',
      'Mahasiswa mampu mempresentasikan desain produk secara koheren',
    ],
    aktivitas: [
      {
        waktu: '0–15 menit',
        nama: 'Inspirasi & Contoh Blueprint',
        deskripsi:
          'Dosen memperlihatkan 3 contoh blueprint produk R&D yang berhasil: modul cetak, media interaktif, dan perangkat pembelajaran. Mahasiswa mengidentifikasi elemen wajib yang ada di setiap blueprint.',
        peran: 'Dosen + diskusi kelas',
      },
      {
        waktu: '15–55 menit',
        nama: 'Workshop Storyboard Bersama',
        deskripsi:
          'Mahasiswa dibagi kelompok 4 orang. Setiap kelompok membuat storyboard 6–8 halaman/slide untuk produk yang akan dikembangkan, mencakup: cover, tujuan, isi utama, latihan, evaluasi, dan penutup. Menggunakan kertas A3 atau tools digital.',
        peran: 'Tim kecil (4 orang)',
      },
      {
        waktu: '55–80 menit',
        nama: 'Gallery Walk',
        deskripsi:
          'Setiap kelompok menempelkan storyboard di dinding/papan. Mahasiswa berkeliling (gallery walk) selama 15 menit, memberikan stiker komentar: hijau (bagus), kuning (perlu pertimbangan), merah (perlu revisi).',
        peran: 'Semua kelompok berkeliling',
      },
      {
        waktu: '80–100 menit',
        nama: 'Respons & Refleksi Desain',
        deskripsi:
          'Setiap kelompok kembali ke storyboardnya, membaca komentar, dan merespons secara tertulis. Dosen merangkum prinsip desain produk yang efektif.',
        peran: 'Kelompok + dosen',
      },
    ],
    checklist: [
      'Membaca e-modul 5 tentang desain dan blueprint produk',
      'Membawa sketsa awal produk yang akan dikembangkan',
      'Mengerjakan kuis formatif modul 5',
      'Menyiapkan alat tulis atau perangkat digital untuk storyboard',
      'Menentukan format produk (cetak/digital/campuran)',
    ],
    lembarKerja: {
      judul: 'Template Storyboard Produk R&D',
      instruksi:
        'Isi template storyboard ini untuk merancang produk R&D Anda. Setiap halaman/frame harus memiliki visual, konten, dan interaksi yang jelas.',
      pertanyaan: [
        'Nama produk, target pengguna, dan mata pelajaran/bidang studi yang dituju.',
        'Frame 1 (Cover/Sampul): Gambarkan atau deskripsikan tampilan cover, termasuk judul, identitas modul, dan elemen visual utama.',
        'Frame 2–4 (Konten Utama): Deskripsikan isi 3 frame konten utama: topik, teks, gambar/media yang digunakan.',
        'Frame 5–6 (Latihan & Evaluasi): Bagaimana bentuk latihan soal dan evaluasi? Interaksi apa yang disediakan untuk pengguna?',
        'Apa tantangan terbesar dalam mendesain storyboard ini dan bagaimana Anda akan mengatasinya?',
      ],
    },
  },

  6: {
    judul: 'Instrumen Validasi',
    durasi: '2 x 50 menit',
    tujuan: [
      'Mahasiswa mampu merancang instrumen validasi ahli yang valid dan reliabel',
      'Mahasiswa mampu membedakan validasi ahli materi, media, dan praktisi',
      'Mahasiswa mampu menghitung rata-rata skor validasi dengan benar',
      'Mahasiswa mampu merumuskan butir-butir validasi yang operasional',
    ],
    aktivitas: [
      {
        waktu: '0–15 menit',
        nama: 'Analisis Instrumen Validasi Nyata',
        deskripsi:
          'Dosen membagikan 2 contoh instrumen validasi dari skripsi/tesis yang sudah selesai. Mahasiswa mengidentifikasi: aspek yang dinilai, skala yang digunakan, dan bagian yang perlu diperbaiki.',
        peran: 'Individual + diskusi kelas',
      },
      {
        waktu: '15–55 menit',
        nama: 'Workshop Penyusunan Instrumen Berpasangan',
        deskripsi:
          'Mahasiswa berpasangan menyusun instrumen validasi untuk produk yang sedang dikembangkan. Wajib mencakup: aspek materi/isi (6 butir), aspek tampilan/media (6 butir), aspek kebermanfaatan (4 butir). Skala Likert 1–4.',
        peran: 'Berpasangan',
      },
      {
        waktu: '55–75 menit',
        nama: 'Cross-Review Instrumen',
        deskripsi:
          'Pasangan menukarkan instrumennya dengan pasangan lain. Melakukan review: apakah setiap butir operasional, tidak ambigu, dan dapat diukur? Memberikan komentar tertulis.',
        peran: 'Silang antar pasangan',
      },
      {
        waktu: '75–90 menit',
        nama: 'Diskusi & Penyempurnaan',
        deskripsi:
          'Diskusi pleno: 3 pasangan berbagi butir instrumen yang paling sulit dirumuskan. Dosen memberikan contoh perbaikan kalimat operasional. Pasangan merevisi instrumen berdasarkan masukan.',
        peran: 'Pleno kelas + revisi berpasangan',
      },
      {
        waktu: '90–100 menit',
        nama: 'Penutup',
        deskripsi:
          'Dosen menjelaskan cara menghitung persentase kelayakan dari instrumen validasi. Mahasiswa mencatat formula dasar dan contoh perhitungan.',
        peran: 'Dosen + catatan mahasiswa',
      },
    ],
    checklist: [
      'Membaca e-modul 6 tentang instrumen validasi',
      'Membawa contoh instrumen validasi dari 1 skripsi R&D',
      'Mengerjakan kuis formatif modul 6',
      'Menentukan aspek-aspek yang akan divalidasi untuk produk Anda',
      'Memahami perbedaan validasi ahli materi vs ahli media',
    ],
    lembarKerja: {
      judul: 'Rancangan Instrumen Validasi Produk',
      instruksi:
        'Susun instrumen validasi untuk produk R&D Anda. Pastikan setiap butir menggunakan bahasa yang jelas, operasional, dan dapat diukur menggunakan skala Likert 1–4.',
      pertanyaan: [
        'Nama produk yang dikembangkan dan jenis validator yang diperlukan (ahli materi, ahli media, praktisi).',
        'Tuliskan 4 butir instrumen untuk aspek Kelayakan Isi/Materi. Pastikan setiap butir operasional.',
        'Tuliskan 4 butir instrumen untuk aspek Kelayakan Tampilan/Desain Media.',
        'Tuliskan 3 butir instrumen untuk aspek Kemudahan Penggunaan dan Kebermanfaatan.',
        'Hitunglah persentase kelayakan jika validator memberikan skor total 42 dari skor maksimal 44. Masuk kategori apa?',
      ],
    },
  },

  7: {
    judul: 'Analisis Data Validasi',
    durasi: '2 x 50 menit',
    tujuan: [
      'Mahasiswa mampu menghitung persentase kelayakan dari data validasi',
      'Mahasiswa mampu menginterpretasikan hasil validasi menggunakan kategori yang tepat',
      'Mahasiswa mampu menghitung N-Gain untuk mengukur peningkatan hasil belajar',
      'Mahasiswa mampu menyajikan data hasil penelitian dalam tabel yang informatif',
    ],
    aktivitas: [
      {
        waktu: '0–15 menit',
        nama: 'Pengantar Analisis Data R&D',
        deskripsi:
          'Dosen menjelaskan 3 jenis analisis utama: (1) % kelayakan dari validasi, (2) N-Gain untuk hasil belajar, (3) respon pengguna. Mahasiswa mencatat formula dan kriteria masing-masing.',
        peran: 'Dosen + catatan mahasiswa',
      },
      {
        waktu: '15–50 menit',
        nama: 'Latihan Menghitung % Kelayakan',
        deskripsi:
          'Dosen membagikan data dummy hasil validasi (lembar skor dari 3 validator). Mahasiswa menghitung: total skor per aspek, rata-rata, dan persentase kelayakan. Mengisi tabel hasil secara manual atau dengan kalkulator.',
        peran: 'Individual, dipandu dosen',
      },
      {
        waktu: '50–75 menit',
        nama: 'Latihan Menghitung N-Gain',
        deskripsi:
          'Mahasiswa menerima data pre-test dan post-test dummy (30 siswa). Menghitung N-Gain individual dan rata-rata kelas. Menginterpretasikan hasil: rendah/sedang/tinggi. Membandingkan hasil dengan pasangan.',
        peran: 'Individual, lalu cek berpasangan',
      },
      {
        waktu: '75–90 menit',
        nama: 'Presentasi & Verifikasi',
        deskripsi:
          'Tiga mahasiswa mempresentasikan perhitungan mereka. Kelas memverifikasi apakah hasilnya benar. Dosen membahas kesalahan umum: pembulatan, pemilihan kategori, penulisan tabel.',
        peran: 'Presentasi + verifikasi kelas',
      },
      {
        waktu: '90–100 menit',
        nama: 'Penutup & Latihan Mandiri',
        deskripsi:
          'Dosen memberikan soal latihan mandiri: menghitung kelayakan dari data set baru. Dikerjakan di rumah dan dikumpulkan pertemuan berikutnya.',
        peran: 'Individual, tugas mandiri',
      },
    ],
    checklist: [
      'Membaca e-modul 7 tentang analisis data R&D',
      'Membawa kalkulator atau laptop/HP untuk perhitungan',
      'Mengerjakan kuis formatif modul 7',
      'Memahami formula N-Gain sebelum kelas',
      'Mereview data instrumen validasi yang sudah disusun di modul 6',
    ],
    lembarKerja: {
      judul: 'Latihan Analisis Data Validasi & N-Gain',
      instruksi:
        'Kerjakan soal-soal analisis data berikut menggunakan data dummy yang tersedia. Tunjukkan langkah-langkah perhitungan secara lengkap.',
      pertanyaan: [
        'Data validasi: Validator 1 memberi skor 38/44, Validator 2 memberi 40/44, Validator 3 memberi 42/44. Hitunglah rata-rata persentase kelayakan dan tentukan kategorinya.',
        'Hitunglah N-Gain untuk siswa berikut: pre-test 50, post-test 75, skor maksimal 100. Masuk kategori apa?',
        'Dari data 5 siswa (pre: 40,55,60,45,70; post: 65,75,80,70,85; maks 100), hitunglah rata-rata N-Gain kelas.',
        'Buatlah tabel sederhana yang menyajikan hasil validasi 3 validator per aspek (materi, media, kebermanfaatan).',
        'Apa kesimpulan yang dapat Anda tulis dalam bab hasil penelitian berdasarkan data yang sudah Anda hitung?',
      ],
    },
  },

  8: {
    judul: 'Uji Coba Produk',
    durasi: '2 x 50 menit',
    tujuan: [
      'Mahasiswa mampu merancang prosedur uji coba produk yang sistematis',
      'Mahasiswa mampu mensimulasikan pengalaman tester/pengguna produk',
      'Mahasiswa mampu mengidentifikasi kekurangan produk dari perspektif pengguna',
      'Mahasiswa mampu menyusun instrumen respon pengguna yang efektif',
    ],
    aktivitas: [
      {
        waktu: '0–15 menit',
        nama: 'Briefing Peran Tester',
        deskripsi:
          'Dosen menjelaskan 3 jenis uji coba: perseorangan, kelompok kecil, dan lapangan. Mahasiswa memahami prosedur: pre-test → penggunaan produk → post-test → angket respon. Setiap mahasiswa mendapat kartu peran.',
        peran: 'Dosen + pembagian peran',
      },
      {
        waktu: '15–50 menit',
        nama: 'Role-Play: Simulasi Uji Coba',
        deskripsi:
          'Mahasiswa dibagi 3 kelompok: Grup A berperan sebagai peneliti, Grup B sebagai siswa SMA, Grup C sebagai observer. Grup A memandu Grup B menggunakan e-modul (modul 1 sebagai contoh). Grup C mencatat hambatan yang dialami pengguna.',
        peran: 'Tiga peran berbeda (A/B/C)',
      },
      {
        waktu: '50–70 menit',
        nama: 'Debriefing & Analisis Hambatan',
        deskripsi:
          'Observer mempresentasikan hambatan yang dicatat. Peneliti merespons. Siswa (Grup B) mengisi angket respon singkat 10 pernyataan. Mendiskusikan: apa yang perlu diperbaiki dari produk?',
        peran: 'Pleno, bergiliran per peran',
      },
      {
        waktu: '70–90 menit',
        nama: 'Rotasi Peran',
        deskripsi:
          'Kelompok merotasi peran: A→B, B→C, C→A. Simulasi ulang dengan produk yang sedikit berbeda (modul 2 sebagai contoh). Setiap mahasiswa mengalami minimal 2 peran berbeda.',
        peran: 'Rotasi peran kelompok',
      },
      {
        waktu: '90–100 menit',
        nama: 'Refleksi Uji Coba',
        deskripsi:
          'Setiap mahasiswa menuliskan: 3 hal yang akan diperbaiki pada produknya berdasarkan pengalaman role-play. Dosen merangkum kriteria produk yang baik dari perspektif pengguna.',
        peran: 'Individual + dosen',
      },
    ],
    checklist: [
      'Membaca e-modul 8 tentang prosedur uji coba produk',
      'Membawa draft instrumen angket respon pengguna (10 butir)',
      'Mengerjakan kuis formatif modul 8',
      'Memahami perbedaan uji coba perseorangan, kelompok kecil, dan lapangan',
      'Menyiapkan produk/prototipe untuk disimulasikan',
    ],
    lembarKerja: {
      judul: 'Rancangan Uji Coba & Respon Pengguna',
      instruksi:
        'Gunakan lembar ini untuk merencanakan uji coba produk R&D Anda dan merefleksikan hasil simulasi role-play di kelas.',
      pertanyaan: [
        'Rancangan uji coba: berapa subjek untuk masing-masing tahap (perseorangan, kelompok kecil, lapangan)?',
        'Tuliskan 5 butir angket respon pengguna untuk produk Anda (skala 1–4 atau Ya/Tidak).',
        'Dari simulasi role-play, apa 3 hambatan utama yang dialami pengguna saat menggunakan produk?',
        'Bagaimana Anda akan merevisi produk berdasarkan hambatan tersebut? Sebutkan perubahan konkret.',
        'Apa prosedur pemberian pre-test dan post-test yang akan Anda gunakan? Jelaskan waktu dan caranya.',
      ],
    },
  },

  9: {
    judul: 'Evaluasi & Diseminasi',
    durasi: '2 x 50 menit',
    tujuan: [
      'Mahasiswa mampu menyusun laporan akhir penelitian R&D secara terstruktur',
      'Mahasiswa mampu mempresentasikan hasil penelitian dalam format mini-paper',
      'Mahasiswa mampu merencanakan strategi diseminasi produk yang tepat',
      'Mahasiswa mampu merefleksikan seluruh proses penelitian dari awal hingga akhir',
    ],
    aktivitas: [
      {
        waktu: '0–10 menit',
        nama: 'Pengantar: Dari Penelitian ke Publikasi',
        deskripsi:
          'Dosen menjelaskan jalur diseminasi: seminar, jurnal, paten, dan kebijakan. Mahasiswa memahami bahwa laporan bukan akhir perjalanan R&D — diseminasi adalah kewajiban etis peneliti.',
        peran: 'Dosen, seluruh kelas',
      },
      {
        waktu: '10–50 menit',
        nama: 'Presentasi Mini-Paper',
        deskripsi:
          'Setiap mahasiswa mempresentasikan mini-paper hasil penelitiannya selama 5 menit menggunakan format: latar belakang singkat → tujuan → produk → hasil validasi → uji coba → kesimpulan. Diikuti 2 menit tanya jawab.',
        peran: 'Individual (bergantian)',
      },
      {
        waktu: '50–70 menit',
        nama: 'Peer Feedback Terstruktur',
        deskripsi:
          'Setelah semua presentasi, mahasiswa mengisi lembar peer feedback untuk 2 presentasi yang paling berkesan. Aspek: kejelasan masalah, kualitas produk, ketepatan analisis, kontribusi untuk pendidikan.',
        peran: 'Individual feedback',
      },
      {
        waktu: '70–90 menit',
        nama: 'Workshop Rencana Diseminasi',
        deskripsi:
          'Mahasiswa menyusun rencana diseminasi singkat: jurnal target, seminar yang relevan, atau sekolah mitra untuk implementasi. Berbagi rencana dengan teman sebangku untuk mendapat masukan.',
        peran: 'Individual + berbagi berpasangan',
      },
      {
        waktu: '90–100 menit',
        nama: 'Refleksi Perjalanan Belajar',
        deskripsi:
          'Sesi penutup: setiap mahasiswa menuliskan 1 kalimat yang mewakili perjalanan belajar mereka di MK Metode Penelitian & Pengembangan. Dosen membacakan beberapa respons dan menutup dengan pesan motivasi.',
        peran: 'Individual + dosen',
      },
    ],
    checklist: [
      'Membaca e-modul 9 tentang evaluasi dan diseminasi',
      'Menyiapkan mini-paper (1–2 halaman, mencakup semua bab)',
      'Mengerjakan kuis formatif modul 9',
      'Membuat slide presentasi 5–6 halaman',
      'Merumuskan rencana diseminasi produk ke minimal 1 jurnal atau seminar',
    ],
    lembarKerja: {
      judul: 'Laporan Singkat & Rencana Diseminasi',
      instruksi:
        'Susun ringkasan hasil penelitian R&D Anda dan rencanakan strategi diseminasi. Ini adalah refleksi akhir dari seluruh proses yang telah Anda jalani.',
      pertanyaan: [
        'Tulis abstrak penelitian Anda (150–200 kata): latar belakang, tujuan, metode, hasil, dan kesimpulan.',
        'Apa kontribusi terbesar produk R&D Anda untuk pendidikan? Jelaskan secara konkret.',
        'Sebutkan 2 keterbatasan penelitian Anda dan saran untuk penelitian lanjutan.',
        'Rencanakan diseminasi: jurnal apa yang akan Anda tuju? Seminar apa? Bagaimana Anda akan mengimplementasikan produk di sekolah mitra?',
        'Tuliskan refleksi personal: apa yang paling berharga dari proses penelitian R&D ini bagi perkembangan Anda sebagai calon pendidik?',
      ],
    },
  },
}

export const WORKSHOP_MODULE_COUNT = Object.keys(WORKSHOP_DATA).length

// ── Dosen-editable override (workshop_content table) ──────────────────────

interface WorkshopContentRow {
  module_id: number
  judul: string
  durasi: string | null
  tujuan: string[]
  aktivitas: AktivitasItem[]
  checklist: string[]
  lembar_kerja: LembarKerja
}

function rowToModule(row: WorkshopContentRow): WorkshopModule {
  return {
    judul: row.judul,
    durasi: row.durasi || '',
    tujuan: row.tujuan,
    aktivitas: row.aktivitas,
    checklist: row.checklist,
    lembarKerja: row.lembar_kerja,
  }
}

// Dosen override takes priority; falls back to the bundled WORKSHOP_DATA for
// any module without a row yet (or when Supabase isn't configured).
export async function fetchWorkshopContent(moduleId: number): Promise<WorkshopModule | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('workshop_content')
        .select('module_id, judul, durasi, tujuan, aktivitas, checklist, lembar_kerja')
        .eq('module_id', moduleId)
        .maybeSingle()
      if (error) throw error
      if (data) return rowToModule(data as WorkshopContentRow)
    } catch (e) {
      console.warn('[workshop] fetchWorkshopContent → Supabase gagal, fallback bundled data:', e)
    }
  }
  return WORKSHOP_DATA[moduleId] ?? null
}

// Dosen-only write — mirrors lib/diagnostic.ts's CRUD convention (rethrow on
// Supabase failure so a real error doesn't show a false "success" toast).
export async function saveWorkshopContent(moduleId: number, content: WorkshopModule): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Menyimpan konten workshop memerlukan konfigurasi Supabase.')
  }
  const { error } = await supabase.from('workshop_content').upsert({
    module_id: moduleId,
    judul: content.judul,
    durasi: content.durasi,
    tujuan: content.tujuan,
    aktivitas: content.aktivitas,
    checklist: content.checklist,
    lembar_kerja: content.lembarKerja,
  })
  if (error) throw error
}

// ── Checklist persistence ──────────────────────────────────────────────────
// legacy/workshop.html's checklist (loadChecklist/saveChecklist/toggleCheck,
// lines 1272-1318) is plain localStorage only — it never touches Supabase or
// data-layer.js, unlike forum.ts/vark.ts/progress.ts which mirror a real
// Supabase table. There is no workshop-checklist table in database/schema.sql
// or CLAUDE.md's Supabase Tables list, so a dual-mode (Supabase + fallback)
// implementation would be inventing a backend that doesn't exist. This keeps
// the same localStorage-only behavior as the legacy page, same key shape
// (`sfp_ws_${moduleId}`).

export type ChecklistState = Record<number, boolean>

function checklistKey(moduleId: number): string {
  return `sfp_ws_${moduleId}`
}

export function readChecklistState(moduleId: number): ChecklistState {
  try {
    const raw = localStorage.getItem(checklistKey(moduleId))
    return raw ? (JSON.parse(raw) as ChecklistState) : {}
  } catch {
    return {}
  }
}

export function writeChecklistState(moduleId: number, state: ChecklistState): void {
  try {
    localStorage.setItem(checklistKey(moduleId), JSON.stringify(state))
  } catch {
    // ignore quota/serialization errors, matches legacy/workshop.html saveChecklist()
  }
}

// ── Lembar kerja (worksheet) answer persistence ────────────────────────────
// Mirrors legacy/workshop.html getLkAnswer/saveLkAnswer/clearLembarKerja
// (lines 1323-1340) — one localStorage key per module+question.

function lkKey(moduleId: number, questionIndex: number): string {
  return `sfp_lk_${moduleId}_${questionIndex}`
}

export function readLkAnswer(moduleId: number, questionIndex: number): string {
  try {
    return localStorage.getItem(lkKey(moduleId, questionIndex)) || ''
  } catch {
    return ''
  }
}

export function writeLkAnswer(moduleId: number, questionIndex: number, value: string): void {
  try {
    localStorage.setItem(lkKey(moduleId, questionIndex), value)
  } catch {
    // ignore quota/serialization errors, matches legacy behavior
  }
}

export function clearLkAnswers(moduleId: number, questionCount: number): void {
  for (let i = 0; i < questionCount; i++) {
    try {
      localStorage.removeItem(lkKey(moduleId, i))
    } catch {
      // ignore
    }
  }
}
