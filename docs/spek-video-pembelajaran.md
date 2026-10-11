# Spek Video Pembelajaran per Pertemuan (antrean #196)

Status: USULAN, menunggu keputusan Johan. Belum ada video penuh yang dibuat dan belum ada agen yang dikirim.
Diperbarui 11 Okt 2026 malam: bentuk video, tokoh, gerak, suara, dan cara membuat diisi dari sembilan contoh 1 menit yang dikoreksi Johan (bagian 3, 3a, 3b, 6, 7). Contoh terakhir: `docs/pratinjau/video-196/contoh-dosen-kelas-v5.mp4`; Johan belum menyatakan contoh itu sudah cocok.
Disusun 11 Okt 2026 dari enam berkas di `kerja nyata/Naskah sampai Aktivitas Mandiri/` (Bab 1 sampai Bab 6).

Yang dibaca: Bab 1 dibaca penuh (3.926 kata, hitungan skrip `ekstrak196.py`). Bab 2 sampai Bab 6 dibaca pada bagian tujuan, tabel jadwal pertemuan, dua paragraf pertama tiap subbab, kotak studi kasus, daftar tabel dan gambar, serta langkah Aktivitas Mandiri. Isi penuh tiap subbab Bab 2 sampai Bab 6 dibaca saat naskah narasinya ditulis.

## 1. Jumlah dan letak video

Naskah menjadwalkan 16 pertemuan. Dua belas di antaranya pertemuan materi, dua per bab, dan masing-masing mendapat satu video.

| Bab | Pertemuan pertama | Pertemuan kedua |
|---|---|---|
| 1 Konsep Dasar dan Paradigma Penelitian | P1 | P2 |
| 2 Identifikasi Masalah dan Studi Pendahuluan | P3 | P4 |
| 3 Penyusunan Bab Pendahuluan Proyek | P5 | P6 |
| 4 Kajian Pustaka sebagai Landasan Pengembangan | P9 | P10 |
| 5 Model-Model Pengembangan dan Validasi Produk | P11 | P12 |
| 6 Instrumen, Pengumpulan Data, Analisis Data, dan Pelaporan | P13 | P14 |

Tanpa video: P7 (review menjelang UTS), P8 (UTS), P15 (review menjelang UAS), P16 (UAS).

## 2. Pembagian peran dua video dalam satu bab

Pembagian ini mengikuti tabel jadwal di tiap bab (Tabel 1.1, 2.1, 3.1, 4.1, 5.1, 6.1).

- Video pertemuan pertama berisi konsep. Mahasiswa menontonnya sebelum tatap muka pertama bab itu, supaya waktu kelas dipakai untuk diskusi dan studi kasus.
- Video pertemuan kedua berisi cara kerja. Isinya langkah mengerjakan Aktivitas Mandiri bab itu (AM-1 sampai AM-6), contoh pengisiannya, dan pengantar Tes Formatif.

## 3. Bentuk baku tiap video

| Hal | Ketentuan |
|---|---|
| Durasi | 5 sampai 7 menit, sasaran 6 menit |
| Narasi | 580 sampai 810 kata bahasa Indonesia, sasaran sekitar 690 kata untuk 6 menit. Diukur 11 Okt 2026 pada contoh bersuara `id-ID-ArdiNeural`: 105 kata menjadi video 54,5 detik termasuk jeda antarkalimat, yaitu sekitar 116 kata per menit (44,9 detik bicara, hitungan `tts2.py` dan `ffprobe`). Suara `id-ID-GadisNeural` lebih lambat: 96 sampai 103 kata per menit. Taksiran awal 130 sampai 150 kata per menit keliru |
| Gaya | Dosen kartun mengajar di ruang kelas: tokoh berdiri di kiri, isi materi (teks kunci, diagram, tabel yang digambar ulang dari naskah) tampil di papan tulis di kanan, takarir di bawah papan. Rincian di bagian 3a |
| Sapaan | "Anda", sama dengan naskah |
| Warna dan fon | Warna tema aplikasi (cream, ivory, terra, sage, brown) dan fon aplikasi, supaya video menyatu dengan Smart Flip |
| Ukuran | 1920x1080, 30 gambar per detik, MP4 (H.264 dan AAC) |
| Besar berkas | Paling besar 100 MB, karena itu batas unggah di halaman Video (`src/pages/Video.tsx:563`) |
| Takarir | Teks narasi tampil di layar dan disimpan juga sebagai berkas `.vtt` |
| Musik | Tanpa musik, atau musik latar pelan yang tidak menutupi suara |

Urutan isi yang sama di semua video:

| Waktu | Bagian | Isi |
|---|---|---|
| 0:00 sampai 0:20 | Pembuka | Nomor bab, nomor pertemuan, judul video, satu pertanyaan pemantik dari kotak Pertanyaan Reflektif naskah |
| 0:20 sampai 0:45 | Tujuan | Dua atau tiga hal yang bisa dilakukan mahasiswa sesudah menonton, diturunkan dari Tujuan Pembelajaran Khusus bab |
| 0:45 sampai 5:15 | Inti | Tiga atau empat segmen, tiap segmen 60 sampai 90 detik, satu gagasan dan satu contoh dari naskah |
| 5:15 sampai 6:00 | Jembatan | Pertemuan pertama: apa yang disiapkan untuk kelas. Pertemuan kedua: langkah Aktivitas Mandiri dan Tes Formatif |
| 6:00 sampai 6:30 | Rangkuman | Tiga butir, lalu ajakan membuka modul dan menu yang dituju di Smart Flip |

## 3a. Tokoh, ruang kelas, dan gerak

Semua butir di sini lahir dari koreksi Johan atas contoh 1 menit (11 Okt 2026). Kutipan permintaannya ada di `docs/antrean-permintaan.md` baris #196.

**Tokoh**
- Dosen laki-laki bersongkok Bugis (atas hitam, pita bawah emas bergaris hitam) dan jas tutup berkancing emas, kemeja bermanset putih.
- Songkok selebar kepala, tepi bawahnya melengkung melingkari dahi, rambut pendek terlihat di pelipis di bawah tepinya.
- Tangan satu bentuk utuh: telapak, empat jari rapat berujung bulat, ibu jari menyambung ke telapak, garis antarjari pendek. Tangan memegang spidol berupa kepalan satu bentuk.
- Lengan satu kurva dari bahu lewat siku ke pergelangan, bagian atas sedikit lebih tebal. Bukan potongan kaku yang diputar.

**Aturan lengan**
- Siku selalu di luar garis badan. Di skrip, siku harus lebih dari 16 ke luar dari bahu pada semua pose bergerak (garis badan 16 dari bahu); pose sekarang 26 sampai 84.
- Lengan tidak menyilang ke sisi badan yang lain dan dua lengan tidak membentuk silang.
- Saat istirahat kedua lengan lurus ke bawah.

**Pose**

| Pose | Kapan dipakai |
|---|---|
| Istirahat | Sebelum bicara dan di penutup |
| Bicara (empat letak tangan kanan: sedang, lebih tinggi, lebih rendah, lebih lebar) | Selama narasi; berpindah pada kata panjang yang ditekankan |
| Bertanya (tangan kanan naik dengan siku ke luar, tangan kiri terbuka rendah, kepala miring, alis naik) | Menjelang akhir kalimat tanya |
| Menunjuk papan dengan spidol (melirik papan dulu, lengan menyusul, lalu kembali menatap penonton) | Tepat saat kata kunci diucapkan dan isinya muncul di papan |

**Gerak lain**
- Bentuk mulut per huruf, waktunya dari batas tiap kata yang diberikan mesin suara.
- Kedip berjarak tidak rata, anggukan kecil di awal kalimat, badan berayun pelan.
- Isi papan muncul tepat saat katanya diucapkan, bukan dengan taksiran waktu.

**Ruang kelas**
- Dinding, lis, lantai papan kayu, jendela dengan pucuk pohon, jam dinding, meja dosen bertumpuk buku.
- Papan tulis menempel di dinding dengan spidol dan penghapus di raknya.
- Tidak ada mahasiswa di gambar, karena bagian bawah layar dipakai takarir.

**Batas cara ini**
- Jari tidak bisa menekuk satu per satu, dan kain lengan tidak berlipat.
- Lebar lengan hampir rata dari siku ke pergelangan.
- Papan lebih kecil dari layar penuh, jadi tulisan lebih kecil daripada versi tanpa tokoh. Keterbacaan di telepon belum diukur.

## 3b. Suara dan naskah

- Suara yang dipilih Johan: laki-laki, `id-ID-ArdiNeural` ("suara dengan banding-suara-2-ardi-indonesia"). Sumber suaranya belum diputuskan; lihat bagian 8a.
- Naskah ditulis dalam gaya bicara: kalimat pendek, sapaan "Anda", kata penghubung lisan seperti "nah", "kan", "sih". Johan belum menyatakan keberatan atau persetujuan atas gaya ini.
- Tiap kalimat dibuat sebagai berkas suara sendiri, dengan laju dan nada sedikit berbeda: kalimat tanya sedikit lebih tinggi, kalimat penutup lebih lambat.
- Singkatan yang dibaca salah oleh mesin suara ditulis menurut bunyinya di teks yang dibaca, dan ditulis biasa di takarir. Contoh: "R&D" dibaca dari teks "ar en di".
- Sesi tidak bisa mendengar. Alami atau tidaknya suara dinilai Johan.

## 4. Aturan isi

1. Semua pernyataan, angka, nama penulis, dan contoh kasus diambil dari naskah bab itu. Video tidak menambah materi baru.
2. Angka disebut bersama sumbernya seperti di naskah, misalnya "Ahmad dkk. (2023)".
3. Contoh memakai kasus naskah: ritel di Malang, loket layanan mahasiswa, koperasi simpan pinjam, gudang PT X.
4. Istilah mengikuti naskah dan aplikasi: Aktivitas Mandiri, AM-1, Tes Formatif, Mini Projek, Smart Flip 5.0.
5. Bagian "Kajian Teori dan Riset Terkini", "Ringkasan Kajian Pustaka", dan "Data Pendukung" tidak dibacakan utuh. Video mengambil paling banyak satu angka dari bagian itu; sisanya tetap di modul.
6. Tiap video menyebut di layar penutup: "Materi lengkap ada di modul Bab n".

## 5. Spek per pertemuan

### Bab 1, Pertemuan 1: Tiga Paradigma, Kacamata Membaca Masalah

Sesudah menonton, mahasiswa bisa: membedakan penelitian terapan dan pengembangan; membedakan paradigma kuantitatif, kualitatif, dan R&D dari bentuk pertanyaannya; menyebut urutan yang benar antara masalah dan paradigma.

| Waktu | Adegan | Narasi (inti) | Tampilan | Sumber di naskah |
|---|---|---|---|---|
| 0:00 sampai 0:20 | Pembuka | "Saat PKL atau magang, adakah satu masalah yang Anda lihat setiap hari?" | Judul bab dan pertemuan, lalu pertanyaan muncul | Pertanyaan Reflektif pertama |
| 0:20 sampai 0:45 | Tujuan | Tiga hal yang bisa dilakukan sesudah menonton | Tiga butir muncul satu per satu | Tujuan Pembelajaran Khusus |
| 0:45 sampai 1:45 | Meneliti atau mengembangkan | Penelitian terapan menjawab pertanyaan; pengembangan menghasilkan sesuatu yang dipakai. Contoh gudang: keterlambatan naik 20%, lalu sistem pelacakan barcode | Dua kolom: "mencari jawaban" dan "membuat solusi", contoh gudang masuk ke tiap kolom | Uraian Materi paragraf 1 |
| 1:45 sampai 3:15 | Tiga paradigma | Kuantitatif: seberapa besar. Kualitatif: mengapa. R&D: solusi apa yang efektif | Segitiga paradigma, lalu Tabel 1.3 dibangun baris demi baris (pertanyaan kunci, bentuk data, luaran) | Uraian Materi paragraf 2, Gambar 1.1, Tabel 1.3 |
| 3:15 sampai 4:15 | Kasus ritel Malang | Tim mengukur waktu tunggu, mewawancarai kasir dan pelanggan, baru merancang kasir mandiri. Pola "pahami dulu, baru kembangkan" | Alur tiga langkah dengan ikon antrean, wawancara, kasir mandiri | Studi Kasus Industri |
| 4:15 sampai 5:15 | Masalah dulu, paradigma kemudian | Dua pertanyaan tentang mahasiswa magang di Perusahaan Y: "berapa persen" dan "mengapa enggan melapor". Method driven lawan problem driven. Tiga kesalahan umum disebut singkat | Dua kartu pertanyaan, tiap kartu diberi label paradigmanya; lalu daftar tiga kesalahan | "Mengapa Karakter Masalah Menentukan Pilihan Paradigma", "Kesalahan Umum" |
| 5:15 sampai 6:00 | Jembatan | Siapkan catatan PKL atau pilih satu unit kerja kampus untuk diamati; di kelas Anda membahas kasus ritel | Daftar "yang dibawa ke kelas" | Tabel 1.1 baris Penutup P1 |
| 6:00 sampai 6:30 | Rangkuman | Tiga butir: dua jenis kerja, tiga paradigma, masalah menentukan paradigma | Tiga butir dan tulisan "Materi lengkap ada di modul Bab 1" | |

Tidak masuk video: skala pendidikan vokasi (44 politeknik, 700.000 mahasiswa), kajian bibliometrik Ahmad dkk., Tabel 1.2 dan 1.4.

### Bab 1, Pertemuan 2: Dari Masalah ke Gagasan Produk, dan Cara Mengerjakan AM-1

Sesudah menonton, mahasiswa bisa: membedakan gejala, masalah, dan gagasan solusi; menulis gagasan produk dalam satu kalimat berpola; memenuhi tiga kewajiban etika saat mengamati; mengisi tabel AM-1.

| Waktu | Adegan | Isi | Tampilan | Sumber di naskah |
|---|---|---|---|---|
| 0:00 sampai 0:45 | Pembuka dan tujuan | "Belum ada aplikasi antrean" itu masalah atau solusi? | Kalimat itu muncul dengan tanda tanya | "Dari Masalah Praktik Menjadi Gagasan Produk" |
| 0:45 sampai 1:50 | Tiga ciri penelitian pengembangan | Pahami masalah dulu (lawannya: melompat ke solusi), luaran ganda (produk dan wawasan), perbaikan berulang (buat, minta penilaian, perbaiki) | Tiga kartu, kartu ketiga berupa putaran | "Ciri Penelitian Pengembangan dan Luarannya" |
| 1:50 sampai 3:10 | Gejala, masalah, solusi | Loket layanan: antrean sampai lorong (gejala), petugas menyalin data ke dua buku (masalah), aplikasi antrean (solusi). Dua bingkai menghasilkan dua produk. Pola kalimat "[produk] untuk [pengguna] agar [kondisi yang berubah]" | Tiga kolom diisi bergantian; kalimat berpola diisi dengan contoh formulir sekali isi | "Dari Masalah Praktik Menjadi Gagasan Produk" |
| 3:10 sampai 4:10 | Etika mengamati | Izin, kesediaan, kerahasiaan; kode "Petugas A" belum cukup di loket dua orang | Tabel 1.5 disederhanakan menjadi tiga baris | "Etika Mengamati dan Bertanya di Unit Kerja", Tabel 1.5 |
| 4:10 sampai 4:40 | Data dan AI | Data dicatat sendiri; rujukan dari AI dibuka dulu lewat DOI; tulis alat yang dipakai | Tiga larangan dan satu kewajiban | "Plagiarisme dan Pemakaian AI Generatif" |
| 4:40 sampai 6:00 | Langkah AM-1 | Enam langkah, tabel empat kolom (Masalah, Lokasi Pengamatan, Paradigma yang Dipilih, Alasan) diisi dengan contoh loket; AM-1 tidak diunggah tersendiri; selesaikan sebelum Tes Formatif Bab 1 (10 soal) | Tabel AM-1 terisi kolom demi kolom | "Aktivitas Mandiri", "Format Pengumpulan Tugas" |
| 6:00 sampai 6:30 | Rangkuman | Tiga butir dan ajakan membuka Tes Formatif di Smart Flip | | |

### Bab 2, Pertemuan 3: Menemukan Masalah Nyata lewat Observasi, Wawancara, dan Fishbone

Sesudah menonton, mahasiswa bisa: menyiapkan lembar observasi dan pertanyaan wawancara singkat; mengurai penyebab masalah dengan fishbone; membedakan pengguna dan pemangku kepentingan.

Segmen inti:
1. Topik lahir dari pengamatan, bukan dari tren. Kasus koperasi simpan pinjam: pengajuan pinjaman lebih dari seminggu, dan mahasiswa tidak langsung mengusulkan aplikasi. Sumber: Uraian Materi, Studi Kasus Industri.
2. Observasi 30 sampai 45 menit dan wawancara semi terstruktur 5 sampai 10 menit: apa yang dicatat, bagaimana menyusun pertanyaan. Sumber: "Mencatat Observasi, Wawancara, dan Telaah Dokumen".
3. Fishbone sederhana untuk gejala "antrean layanan mahasiswa terlalu lama". Sumber: "Teknik Fishbone Sederhana", Tabel 2.3.
4. Pengguna dan pemangku kepentingan pada kasus koperasi. Sumber: "Memetakan Kebutuhan Pengguna dan Pemangku Kepentingan".

Tampilan kunci: Gambar 2.1 (corong identifikasi masalah) sebagai peta video; diagram tulang ikan yang tumbuh cabang demi cabang.
Jembatan: bawa draf awal rumusan masalah ke pertemuan 4.
Tidak masuk video: data BPS tentang pengangguran lulusan SMK, data UMKM, enam faktor keterserapan kerja.

### Bab 2, Pertemuan 4: Menetapkan Topik dengan Kesenjangan, Skor, dan Studi Pendahuluan

Sesudah menonton, mahasiswa bisa: menulis kesenjangan sebagai selisih keadaan yang diharapkan dan keadaan nyata; menyaring tiga alternatif topik dengan skor; menulis studi pendahuluan setengah halaman yang berbukti.

Segmen inti:
1. Kesenjangan punya dua sisi dan dua-duanya harus bersumber (SOP, standar layanan, atau harapan pengguna dari wawancara). Sumber: "Merumuskan Kesenjangan Menjadi Butir Identifikasi Masalah".
2. Tiga kekeliruan yang bisa diperiksa di draf sendiri, antara lain topik disangka masalah dan solusi sudah disebut di awal. Sumber: subbab yang sama (Mafuhure dkk., 2026).
3. Tiga kriteria (kelayakan, kebermanfaatan, keterjangkauan) dan arti skor 1 sampai 3. Sumber: Uraian Materi, "Deskripsi Skor untuk Menyaring Alternatif Topik", Tabel 2.4.
4. Bukti studi pendahuluan: rata-rata waktu tunggu, jumlah keluhan, kutipan wawancara. Sumber: "Menyusun Bukti Studi Pendahuluan yang Meyakinkan".

Tampilan kunci: tabel penyaringan tiga topik terisi dengan skor, topik terpilih disorot.
Jembatan: enam langkah AM-2, isi berkas AM-2 (tiga bagian), Tes Formatif Bab 2.

### Bab 3, Pertemuan 5: Menulis Latar Belakang dari Kondisi Ideal sampai Urgensi

Sesudah menonton, mahasiswa bisa: menyusun latar belakang dengan alur ideal, nyata, data, urgensi; menulis pernyataan celah; mengganti kalimat umum dengan kalimat berdata.

Segmen inti:
1. Alur empat langkah dan pola piramida terbalik. Sumber: Uraian Materi, "Pola Piramida Terbalik", Gambar 3.1.
2. Kalimat lemah lawan kalimat sesudah revisi (gudang PT X, 12 kesalahan pencatatan stok). Sumber: Studi Kasus Industri.
3. Menyatakan celah: bagian yang paling sering hilang dari draf mahasiswa, dan dua macam celah yang mudah dipertanggungjawabkan pada proyek pengembangan. Sumber: "Menyatakan Celah dan Kebaruan dalam Latar Belakang".
4. Mencari angka pembanding sekecil apa pun dari observasi atau laporan resmi. Sumber: "Data Pendukung".

Tampilan kunci: piramida terbalik yang terisi dari atas; satu paragraf contoh yang diberi warna per langkah.
Jembatan: tulis latar belakang minimal tiga paragraf dari bahan AM-2.

### Bab 3, Pertemuan 6: Rumusan Masalah, Tujuan, Batasan, dan Spesifikasi Produk

Sesudah menonton, mahasiswa bisa: mengubah identifikasi masalah menjadi dua rumusan masalah; menulis tujuan yang selaras dan terukur; mengisi tabel ruang lingkup dan spesifikasi produk.

Segmen inti:
1. Dua pertanyaan rumusan masalah (produk dan kelayakannya) dengan contoh formulir verifikasi digital koperasi. Sumber: "Dari Identifikasi Masalah ke Rumusan Masalah".
2. Tujuan menjawab rumusan masalah, dengan kata kerja "menghasilkan", "merancang", "menguji"; manfaat ditulis tanpa janji berlebihan. Sumber: "Merumuskan Tujuan yang Selaras", Tabel 3.3, "Menulis Manfaat Praktis dan Teoretis".
3. Ruang lingkup: apa yang termasuk, apa yang tidak, dan alasannya; definisi operasional "efisiensi layanan". Sumber: "Menetapkan Ruang Lingkup dan Batasan Proyek", Tabel 3.4, "Definisi Operasional".
4. Spesifikasi produk enam baris, lalu judul ditulis paling akhir dari empat unsur. Sumber: "Menuliskan Spesifikasi Produk", "Menyusun Judul Proposal Pengembangan".

Tampilan kunci: satu contoh (formulir verifikasi koperasi) dipakai dari awal sampai akhir, supaya terlihat rumusan, tujuan, batasan, dan spesifikasi saling terhubung.
Jembatan: langkah AM-3, susunan Bab 1 proposal (1.1 sampai 1.5), kirim lewat menu Mini Projek, Tes Formatif Bab 3.

### Bab 4, Pertemuan 9: Mencari dan Menyaring Sumber Pustaka

Sesudah menonton, mahasiswa bisa: menjelaskan fungsi kajian pustaka; memilih tempat mencari dan menilai kredibilitas sumber; menyaring sumber dengan kriteria; mencatat sumber sejak hari ditemukan.

Segmen inti:
1. Kajian pustaka sebagai landasan berpikir, dan tiga jenis sumber (teori dasar, riset sejenis, data atau kebijakan). Sumber: Uraian Materi, Tabel 4.1 baris Inti P9.
2. Tempat mencari: Google Scholar, Scopus atau Sinta, laman resmi lembaga; tingkat kredibilitas sumber. Sumber: "Strategi Penelusuran Sumber", Tabel 4.3.
3. Menyaring dengan kriteria inklusi dan eksklusi seperti tinjauan sistematis. Sumber: "Belajar dari Tinjauan Sistematis".
4. Pengelola referensi: masukkan sumber lewat DOI pada hari ditemukan, lalu periksa isiannya. Sumber: "Mencatat Sumber dengan Pengelola Referensi".

Tampilan kunci: corong penyaringan sumber; tangga kredibilitas dari Tabel 4.3.
Jembatan: susun daftar awal sumber untuk dipetakan di pertemuan 10.

### Bab 4, Pertemuan 10: Dari Sumber ke Tulisan dengan Sintesis, Parafrase, dan Kerangka Berpikir

Sesudah menonton, mahasiswa bisa: mengelompokkan sumber per tema dalam matriks; menulis paragraf sintesis; memparafrase tanpa sekadar mengganti kata; menggambar kerangka berpikir empat kotak.

Segmen inti:
1. Matriks sintesis per tema, dan bedanya paragraf sintesis dengan deretan "Menurut A, menurut B". Sumber: "Matriks Sintesis", Tabel 4.4, "Menyusun Sintesis, Bukan Sekadar Kumpulan Kutipan".
2. Parafrase, ringkasan, dan kutipan langsung; mengganti sinonim belum parafrase. Sumber: "Parafrase, Kutipan Langsung, dan Batas Plagiarisme".
3. Tabel penelitian yang relevan (empat kolom) dan kerangka berpikir empat kotak beserta paragraf penjelasnya. Sumber: "Menuliskan Penelitian yang Relevan", "Menyusun Kerangka Berpikir".
4. Rujukan dari AI wajib dibuka sumbernya; angka Walters dan Wilder (2023) dikutip persis dari naskah. Sumber: "Memakai Alat AI secara Bertanggung Jawab".

Tampilan kunci: peta kajian pustaka (Gambar 4.1) sebagai pembuka; satu kalimat sumber, lalu versi ganti kata (salah) dan versi parafrase (benar) berdampingan; empat kotak kerangka berpikir terisi kiri ke kanan.
Jembatan: sembilan langkah AM-4, susunan Bab 2 proposal (2.1 sampai 2.3), kirim lewat Mini Projek, Tes Formatif Bab 4.

### Bab 5, Pertemuan 11: Memilih Model Pengembangan

Sesudah menonton, mahasiswa bisa: menyebut tahap 4D dan ADDIE; memilih model dari tujuh pilihan dengan alasan; menjabarkan tahap model ke kegiatan proyek sendiri.

Segmen inti:
1. Apa itu model pengembangan; 4D (empat tahap, lebih linear) dan ADDIE (lima tahap, bersiklus). Sumber: Uraian Materi, Gambar 5.1 dan 5.2.
2. Tiga faktor memilih: kompleksitas proyek, waktu, pengalaman tim. Sumber: "Kriteria Praktis Memilih ADDIE vs 4D", Tabel 5.3.
3. Lima model lain (Waterfall, Borg dan Gall, XP, GDLC, RAD) dan temuan 13 naskah tugas akhir Prodi Perpustakaan Digital: hanya tiga yang memakai ADDIE atau 4D. Sumber: "Model Pengembangan Lain yang Dipakai pada Proyek Vokasi", Tabel 5.5.
4. Tabel kerja empat kolom (tahap, kegiatan, keluaran, perkiraan waktu) dengan contoh tahap Define. Sumber: "Menjabarkan Tahap Model untuk Proyek Sendiri".

Tampilan kunci: dua diagram model digambar ulang; Tabel 5.5 sebagai tabel pilih dengan satu baris disorot per jenis produk.
Jembatan: tentukan model sementara dan alasannya untuk pertemuan 12.
Tidak masuk video: rincian tahap lima model lain (Gambar 5.3 sampai 5.7 hanya tampil sekilas), meta-analisis ADDIE.

### Bab 5, Pertemuan 12: Merancang Validasi Produk

Sesudah menonton, mahasiswa bisa: membagi peran ahli materi, ahli media, dan pengguna; merancang uji coba terbatas; menghitung skor SUS; mencatat jejak revisi.

Segmen inti:
1. Dari flowchart ke prototipe: simbol yang lazim, prototipe satu sampai tiga tampilan. Sumber: "Dari Flowchart ke Prototipe".
2. Siapa menilai apa, dan validasi yang tidak boleh berhenti di sisi teknis. Sumber: "Merancang Validasi Produk yang Kredibel", "Pembagian Peran", Tabel 5.6.
3. Uji coba bertingkat (telaah ahli, perorangan, kelompok kecil, lapangan) dan peserta yang mewakili pengguna sebenarnya. Sumber: "Uji Coba Terbatas".
4. Hitungan SUS langkah demi langkah dengan contoh di naskah, lalu tabel jejak revisi empat kolom. Sumber: "Mengukur Kegunaan Produk Digital dengan System Usability Scale", "Merevisi Produk dan Mencatat Jejak Revisi".

Tampilan kunci: hitungan SUS dianimasikan butir demi butir; tabel jejak revisi dengan tiga pilihan keputusan.
Jembatan: sembilan langkah AM-5, isi berkas AM-5 (lima bagian), Tes Formatif Bab 5.

### Bab 6, Pertemuan 13: Menyusun Instrumen dari Kisi-Kisi sampai Butir yang Valid

Sesudah menonton, mahasiswa bisa: memilih jenis instrumen; menyusun kisi-kisi sebelum menulis butir; memeriksa butir; menghitung kesepakatan ahli per butir.

Segmen inti:
1. Empat jenis instrumen (angket, pedoman wawancara, lembar observasi, lembar validasi ahli) dan kapan dipakai. Sumber: Uraian Materi.
2. Kisi-kisi: aspek, indikator, nomor butir, dengan contoh lembar validasi formulir verifikasi digital koperasi. Sumber: "Menyusun Kisi-Kisi Sebelum Menulis Butir", Tabel 6.3.
3. Valid dan reliabel menjawab dua pertanyaan berbeda; kriteria butir yang baik. Sumber: "Menjaga Validitas dan Reliabilitas Instrumen Sejak Awal", Tabel 6.4.
4. Menghitung I-CVI dan indeks V Aiken dengan contoh tiga validator. Sumber: "Menghitung Kesepakatan Ahli untuk Tiap Butir", Tabel 6.5.

Tampilan kunci: Gambar 6.1 (alur instrumen sampai pelaporan) sebagai peta dua video Bab 6; hitungan I-CVI dan V dianimasikan.
Jembatan: susun draf minimal tiga butir sesuai kisi-kisi untuk pertemuan 14.

### Bab 6, Pertemuan 14: Mengolah Data dan Menyusun Laporan

Sesudah menonton, mahasiswa bisa: mengubah skor Likert menjadi persentase kelayakan; mengolah jawaban wawancara menjadi tema; menulis rekomendasi yang bisa ditindaklanjuti; menyusun Daftar Pustaka.

Segmen inti:
1. Skala Likert dan rumus persentase kelayakan dengan contoh tiga validator, delapan butir, skor tertinggi 5 (skor maksimum 120). Sumber: "Skala Likert, Skor, dan Persentase Kelayakan".
2. Analisis tematik: dari kode ke tema, kode dari kisi-kisi dan kode dari data. Sumber: "Mengolah Jawaban Wawancara Menjadi Tema".
3. Dari angka ke rekomendasi: "85% responden puas" belum cukup, sebutkan keluhan 15% sisanya dan tindakannya. Sumber: "Dari Analisis Data ke Rekomendasi yang Actionable".
4. Daftar Pustaka dari rujukan tiga bab proposal: kumpulkan, buang yang kembar, urutkan, format APA edisi ke-7. Sumber: "Menyusun Daftar Pustaka dari Rujukan Tiap Bab".

Tampilan kunci: lembar kerja spreadsheet tiruan yang menghitung rata-rata dan persentase; komentar wawancara diberi kode lalu dikelompokkan.
Jembatan: enam langkah AM-6, susunan Bab 3 proposal, kirim lewat Mini Projek, Tes Formatif Bab 6.

## 6. Cara membuat

Cara ini sudah dipakai untuk sembilan contoh 1 menit. Untuk video 5 sampai 7 menit belum diuji.

1. Alat: HyperFrames versi 0.8.145 (video dibuat dari HTML lalu dirender ke MP4), dijalankan lewat `npx`. Contoh 54,5 detik selesai dirender dalam 35 sampai 44 detik di mesin ini.
2. Sumber contoh ada di `docs/pratinjau/video-196/`:

| Berkas | Isi |
|---|---|
| `tts2.py` | Naskah per adegan dan per kalimat; membuat satu berkas suara per kalimat dan mencatat waktu tiap kata ke `narasi2.json` |
| `buat2.py` | Menyusun `index.html` dari suara: waktu mulai tiap kalimat, takarir, adegan, dan data gerak |
| `templat.html` | Tata letak, warna, fon, dan enam adegan papan |
| `skrip2.js` | Waktu munculnya isi papan, diikat ke kata yang diucapkan |
| `kelas.html` | Gambar ruang kelas |
| `tokoh5.html`, `tokoh5.js` | Gambar tokoh dan aturan geraknya (versi yang berlaku) |

3. Urutan perintah untuk membangun ulang contoh, dari folder yang memuat berkas di atas, folder `fon` berisi dua fon aplikasi, dan satu proyek HyperFrames kosong bernama `tokoh5`:

```bash
python tts2.py assets3 id-ID-ArdiNeural
python buat2.py tokoh5 assets3 5
cd tokoh5 && npx hyperframes validate && npx hyperframes render --output ../contoh.mp4
```

4. Yang tidak tersimpan di repo: berkas MP4 dan MP3 hasil, dua berkas fon (diunduh dari Google Fonts), dan folder proyek HyperFrames. Semuanya bisa dibuat ulang dari berkas di atas.
5. Urutan kerja tiap video: (a) bab dibaca penuh; (b) naskah narasi dan daftar adegan ditulis dan disetujui Johan; (c) lembar pose atau gambar diam dikirim dulu bila ada perubahan rupa; (d) video dirender; (e) pemeriksa mencocokkan narasi dengan naskah bab.
6. Percontohan dulu: Bab 1 Pertemuan 1 dibuat sampai jadi dan ditonton Johan. Sebelas video lain dibuat sesudah percontohan disetujui.
7. Perubahan rupa tokoh selalu diperlihatkan sebagai gambar diam lebih dulu (antrean #199). Sesi memeriksa hasil lewat gambar diam dari video jadi; kehalusan gerak dan suara dinilai Johan.

## 7. Kriteria terima tiap video

| Kriteria | Cara memeriksa |
|---|---|
| Durasi 300 sampai 420 detik | `ffprobe -show_entries format=duration` |
| Ukuran 1920x1080, ada jalur suara | `ffprobe -show_streams` |
| Besar berkas paling besar 100 MB | `ls -l` |
| Narasi 580 sampai 810 kata | hitung kata `narasi.md` |
| Tiap angka dan nama penulis di narasi ada di naskah bab | skrip yang mencari tiap angka dan nama di teks bab; hasil "tidak ditemukan" harus nol |
| Urutan enam bagian lengkap | daftar adegan memuat enam bagian dengan waktunya |
| Takarir ada dan sama dengan narasi | berkas `.vtt` dibandingkan dengan `narasi.md` |
| Teks terbaca di telepon | gambar diam tiap adegan dilihat pada lebar 412 px |
| Siku di luar garis badan pada semua pose | hitungan letak siku di skrip: tiap pose bergerak lebih dari 16 ke luar dari bahu |
| Tangan menempel di ujung lengan sepanjang gerak | urutan gambar dari video jadi di sekitar tiap perpindahan pose |
| Rupa tokoh sama dengan lembar pose yang disetujui | lembar pose dibandingkan dengan gambar diam dari video jadi |

## 8. Yang perlu diputuskan Johan

Sudah diputuskan Johan lewat koreksi contoh: tokoh dosen laki-laki bersongkok Bugis di ruang kelas, dan suara Ardi. Yang belum:

1. Isi dan pembagian per pertemuan di bagian 5: sudah sesuai, atau ada segmen yang ditukar?
2. Suara narator: suara sintetis bahasa Indonesia (cepat, mutunya belum diuji) atau rekaman suara dosen (narasi dikirim sebagai naskah baca)?
3. Tempat memasang: aplikasi sekarang menyimpan satu video per topik (`modules.video_url`). Dua video per bab butuh keputusan: aplikasi diubah supaya satu topik bisa memuat dua video, atau video diunggah ke YouTube sebagai daftar putar. Belum dicek ke data produksi berapa topik yang ada sekarang.
4. Bentuk kerja agen sesudah percontohan disetujui (lihat balasan obrolan).
5. Sumber suara untuk 12 video (lihat bagian 8a).

## 8a. Pilihan sumber suara dan status izinnya (antrean #198)

Ditambahkan 11 Okt 2026 atas temuan sesi pengawas. Contoh 1 menit memakai baris pertama; untuk 12 video Johan memilih.

| Sumber suara | Biaya | Yang dibutuhkan | Ke mana naskah terkirim | Status izin pakai di video untuk mahasiswa |
|---|---|---|---|---|
| `edge-tts` (jalur baca nyaring peramban Edge) | Gratis | Tidak ada | Server Microsoft | Tidak jelas. Bukan layanan resmi untuk pembuat konten; syarat yang mengizinkannya tidak ditemukan (pencarian web 11 Okt 2026). Jalurnya juga bisa diblokir sewaktu-waktu |
| Azure Speech resmi (suara yang sama, Gadis dan Ardi) | Berbayar di atas kuota gratis | Akun Azure dan kunci milik Johan | Server Microsoft | Jelas, diatur syarat layanan Azure; belum dibaca rinciannya |
| Gemini TTS | Berbayar di atas kuota gratis; batas gratisnya belum pasti | Kunci Google AI Studio milik Johan | Server Google | Diatur syarat Gemini API; belum dibaca rinciannya. Satu sumber pihak ketiga menyebut data di tingkat gratis bisa dipakai untuk pelatihan |
| ElevenLabs | Berbayar di atas kuota gratis | Akun dan kunci milik Johan | Server ElevenLabs | Diatur syarat ElevenLabs; hak pakai tingkat gratis dan berbayar belum diperiksa |
| Rekaman suara dosen | Waktu dosen | Rekaman 12 narasi dan izin dosen | Tidak terkirim ke mana pun | Jelas, selama dosen mengizinkan |

Saran sesi: `edge-tts` hanya untuk contoh. Sebelum 12 video dibuat, pilih salah satu dari empat baris lain, dan syarat pakai layanan yang dipilih dibaca dulu.
