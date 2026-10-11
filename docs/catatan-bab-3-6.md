# Catatan pemeriksaan Bab 3 sampai Bab 6 (antrean #206)

Dibuat 11 Okt 2026 14:18 dengan skrip `periksa36.py`. **Tidak ada berkas naskah yang disunting.** Bab 3 sampai 6 sedang disunting manusia; catatan ini memotret keadaan berkas yang ada di `kerja nyata/Naskah sampai Aktivitas Mandiri/` supaya nanti bisa dibandingkan dengan versi suntingan.

Cara membaca:
- **Calon salah ketik** dicari mesin: kata huruf kecil yang muncul paling banyak dua kali di enam bab dan hanya berbeda satu huruf dari kata yang sering muncul. Cara ini hanya menangkap salah ketik yang mirip kata lain; kata hilang, kalimat janggal, dan rujukan silang yang keliru tidak tertangkap.
- **Calon kata menempel** adalah kata panjang yang bisa dipecah menjadi dua kata yang sering muncul.
- Isi tiap subbab belum dibaca penuh oleh sesi. Pembacaan penuh untuk bahan video dilakukan pada versi suntingan terakhir.
- Sidik isi (teks tiap paragraf) disimpan di luar git, di `.claude/catatan-bab-3-6/` pada folder utama proyek.

## Ringkasan

| Bab | Paragraf | Kata | Calon salah ketik | Calon kata menempel | Kata "Anda" | Kata rusak cari-ganti | Catatan penomoran |
|---|---|---|---|---|---|---|---|
| Bab 3 | 201 | 4136 | 1 | 0 | 31 | 0 | 0 |
| Bab 4 | 190 | 3920 | 0 | 0 | 29 | 0 | 0 |
| Bab 5 | 257 | 5289 | 1 | 0 | 37 | 0 | 0 |
| Bab 6 | 217 | 4107 | 0 | 0 | 16 | 0 | 0 |

## Cara membandingkan nanti

Sesudah versi suntingan manusia untuk Bab 3 sampai 6 masuk ke folder naskah:

1. Salin dulu sidik lama: ubah nama folder `.claude/catatan-bab-3-6/` menjadi `.claude/catatan-bab-3-6-sebelum/`.
2. Jalankan lagi `python periksa36.py <folder-naskah> <folder-sidik-baru> <catatan-baru.md>`.
3. Bandingkan berkas sidik per bab (`05.txt` sampai `08.txt`) antara dua folder itu. Paragraf yang berbeda adalah suntingan manusia.
4. Bandingkan tabel ringkasan: jumlah kata per subbab, hitungan kata "Anda", dan kata rusak berpola "...mahasiswa..." (tanda cari-ganti yang salah sasaran, seperti di Bab 1 dan Bab 2).
5. Versi sesudah perbandingan itulah yang dibaca penuh untuk menulis narasi 12 video (lihat `docs/spek-video-pembelajaran.md`).

## Pola tulisan mesin (antrean #207)

Ditambahkan 11 Okt 2026 sesudah tim penulis menemukan pola tulisan mesin di Bab 1 dan Bab 2. Hitungan kasar atas berkas yang ada sekarang, dengan pencarian kata (bukan pembacaan penuh):

| Bab | Kata | "bukan sekadar" | "bukan hanya" | "tidak hanya" | "melainkan" | "alih-alih" | Titik dua diikuti deret tiga |
|---|---|---|---|---|---|---|---|
| 1 | 4.325 | 7 | 0 | 0 | 3 | 1 | 6 |
| 2 | 4.251 | 2 | 1 | 0 | 3 | 1 | 9 |
| 3 | 4.136 | 2 | 0 | 0 | 1 | 3 | 7 |
| 4 | 3.920 | 7 | 2 | 1 | 2 | 0 | 12 |
| 5 | 5.289 | 2 | 1 | 1 | 0 | 1 | 10 |
| 6 | 4.107 | 1 | 0 | 0 | 2 | 1 | 5 |

Bab 3 sampai 6 tidak disunting. Pola ini disapu sesudah versi suntingan manusia masuk dan Johan memilih caranya (antrean #207). Daftar pola di atas belum lengkap; skrip ukur yang lebih lengkap sedang disiapkan sesi pengawas (`AI Skill/00 - Dokumentasi/cek_pola_ai.py`).

## Bab 3

Berkas: `05 Bagian II - Bab 3 Penyusunan Bab Pendahuluan Proyek (sampai Aktivitas Mandiri).docx`. Tersimpan 11 Okt 2026 11:04, md5 `63769f34702d12849cab445935cbd2e2`, 201 paragraf, 4136 kata.

### Kerangka dan jumlah kata

| Subbab | Kata | Paragraf |
|---|---|---|
| (sebelum judul pertama) | 110 | 23 |
| Pendahuluan Bab | 438 | 60 |
| Uraian Materi | 320 | 5 |
| Kajian Teori dan Riset Terkini | 211 | 3 |
| Ringkasan Kajian Pustaka | 120 | 16 |
| Pola Piramida Terbalik dalam Menulis Latar Belakang | 130 | 2 |
| Menyatakan Celah dan Kebaruan dalam Latar Belakang | 408 | 3 |
| Merumuskan Tujuan yang Selaras dengan Rumusan Masalah | 69 | 1 |
| Definisi Operasional sebagai Jembatan Menuju Instrumen Penelitian | 206 | 13 |
| Dari Identifikasi Masalah ke Rumusan Masalah | 143 | 2 |
| Menulis Manfaat Praktis dan Teoretis Secara Wajar | 257 | 2 |
| Menetapkan Ruang Lingkup dan Batasan Proyek | 465 | 24 |
| Menuliskan Spesifikasi Produk | 130 | 2 |
| Menyusun Judul Proposal Pengembangan | 257 | 2 |
| Data Pendukung: Pentingnya Data Kuantitatif dalam Latar Belakang Proyek | 148 | 2 |
| Aktivitas Mandiri | 167 | 9 |
| Format Pengumpulan Tugas: | 81 | 1 |
| Daftar Rujukan Bab 3 | 392 | 14 |

### Calon salah ketik

Terjaring mesin 13 kata; 12 di antaranya dinilai sesi sebagai kata yang sah sesudah konteksnya dibaca, dan tidak ditampilkan.

| Kata | Mirip dengan | Konteks |
|---|---|---|
| draft | draf | ...Tulis draft latar belakang mengikuti alur... |

### Calon kata menempel

Tidak ada yang terjaring.

### Penomoran tabel dan gambar

- Keterangan tabel: 3.1, 3.2, 3.3, 3.4.
- Keterangan gambar: 3.1.
- Nomor kembar: tidak ada.
- Urutan tidak naik: tidak ada.
- Disebut di teks tetapi tidak punya keterangan di bab ini: tidak ada.

### Sapaan dan pola lain

- Kata "Anda": 31 kali; "anda" huruf kecil: 0 kali. Bab 1 dan Bab 2 versi suntingan memakai "mahasiswa" sebagai sapaan.
- Kata rusak berpola "...mahasiswa...": tidak ada.
- Kata berulang berurutan (mis. "dan dan"): 0 tempat.

## Bab 4

Berkas: `06 Bagian II - Bab 4 Kajian Pustaka sebagai Landasan Pengembangan (sampai Aktivitas Mandiri).docx`. Tersimpan 11 Okt 2026 11:04, md5 `423b87cbacdde6df95d5b7dffd4156cb`, 190 paragraf, 3920 kata.

### Kerangka dan jumlah kata

| Subbab | Kata | Paragraf |
|---|---|---|
| (sebelum judul pertama) | 117 | 23 |
| Pendahuluan Bab | 321 | 43 |
| Uraian Materi | 265 | 4 |
| Kajian Teori dan Riset Terkini | 193 | 3 |
| Ringkasan Kajian Pustaka | 129 | 16 |
| Strategi Penelusuran Sumber pada Basis Data Bereputasi | 163 | 2 |
| Menyusun Sintesis, Bukan Sekadar Kumpulan Kutipan | 76 | 1 |
| Belajar dari Tinjauan Sistematis: Menyaring Ratusan Sumber Menjadi Beberapa Puluh yang Relevan | 215 | 22 |
| Mencatat Sumber dengan Pengelola Referensi | 256 | 2 |
| Matriks Sintesis sebagai Alat Kerja Sebelum Menulis | 476 | 20 |
| Parafrase, Kutipan Langsung, dan Batas Plagiarisme | 372 | 3 |
| Menuliskan Penelitian yang Relevan | 94 | 1 |
| Menyusun Kerangka Berpikir | 105 | 2 |
| Memakai Alat AI secara Bertanggung Jawab dalam Kajian Pustaka | 355 | 3 |
| Data Pendukung: Tren Publikasi Self Directed Learning di Indonesia | 123 | 5 |
| Aktivitas Mandiri | 186 | 9 |
| Format Pengumpulan Tugas | 64 | 1 |
| Daftar Rujukan Bab 4 | 321 | 13 |

### Calon salah ketik

Terjaring mesin 13 kata; 13 di antaranya dinilai sesi sebagai kata yang sah sesudah konteksnya dibaca, dan tidak ditampilkan.

Tidak ada yang terjaring.

### Calon kata menempel

Tidak ada yang terjaring.

### Penomoran tabel dan gambar

- Keterangan tabel: 4.1, 4.2, 4.3, 4.4.
- Keterangan gambar: 4.1, 4.2.
- Nomor kembar: tidak ada.
- Urutan tidak naik: tidak ada.
- Disebut di teks tetapi tidak punya keterangan di bab ini: tidak ada.

### Sapaan dan pola lain

- Kata "Anda": 29 kali; "anda" huruf kecil: 0 kali. Bab 1 dan Bab 2 versi suntingan memakai "mahasiswa" sebagai sapaan.
- Kata rusak berpola "...mahasiswa...": tidak ada.
- Kata berulang berurutan (mis. "dan dan"): 0 tempat.

## Bab 5

Berkas: `07 Bagian II - Bab 5 Model-Model Pengembangan dan Validasi Produk (sampai Aktivitas Mandiri).docx`. Tersimpan 11 Okt 2026 11:04, md5 `3ca97dd49d7464ae77196c15625f162d`, 257 paragraf, 5289 kata.

### Kerangka dan jumlah kata

| Subbab | Kata | Paragraf |
|---|---|---|
| (sebelum judul pertama) | 126 | 24 |
| Pendahuluan Bab | 307 | 41 |
| Uraian Materi | 898 | 21 |
| Kajian Teori dan Riset Terkini | 209 | 3 |
| Ringkasan Kajian Pustaka | 122 | 14 |
| Kriteria Praktis Memilih ADDIE vs 4D | 143 | 2 |
| Merancang Validasi Produk yang Kredibel | 109 | 1 |
| Model Pengembangan 4D dalam Praktik Pendidikan Vokasi Indonesia | 205 | 19 |
| Data Pendukung: Efektivitas Model ADDIE dalam Riset Meta Analisis | 221 | 15 |
| Model Pengembangan Lain yang Dipakai pada Proyek Vokasi | 301 | 27 |
| Menjabarkan Tahap Model untuk Proyek Sendiri | 131 | 2 |
| Dari Flowchart ke Prototipe | 133 | 2 |
| Pembagian Peran Ahli Materi, Ahli Media, dan Pengguna | 478 | 24 |
| Uji Coba Terbatas: Peserta, Jumlah, dan Hal yang Diamati | 352 | 3 |
| Mengukur Kegunaan Produk Digital dengan System Usability Scale | 370 | 3 |
| Merevisi Produk dan Mencatat Jejak Revisi | 238 | 2 |
| Aktivitas Mandiri | 150 | 9 |
| Format Pengumpulan Tugas: | 55 | 1 |
| Daftar Rujukan Bab 5 | 643 | 26 |

### Calon salah ketik

Terjaring mesin 19 kata; 18 di antaranya dinilai sesi sebagai kata yang sah sesudah konteksnya dibaca, dan tidak ditampilkan.

| Kata | Mirip dengan | Konteks |
|---|---|---|
| judgement | judgment | ... dua jalur utama: validasi ahli (expert judgement), di mana seorang pakar di bi... |

### Calon kata menempel

Tidak ada yang terjaring.

### Penomoran tabel dan gambar

- Keterangan tabel: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6.
- Keterangan gambar: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7.
- Nomor kembar: tidak ada.
- Urutan tidak naik: tidak ada.
- Disebut di teks tetapi tidak punya keterangan di bab ini: tidak ada.

### Sapaan dan pola lain

- Kata "Anda": 37 kali; "anda" huruf kecil: 0 kali. Bab 1 dan Bab 2 versi suntingan memakai "mahasiswa" sebagai sapaan.
- Kata rusak berpola "...mahasiswa...": tidak ada.
- Kata berulang berurutan (mis. "dan dan"): 0 tempat.

## Bab 6

Berkas: `08 Bagian II - Bab 6 Instrumen, Pengumpulan Data, Analisis Data, dan Pelaporan (sampai Aktivitas Mandiri).docx`. Tersimpan 11 Okt 2026 11:04, md5 `663def53d6c7eb34391c4dbbe904dafc`, 217 paragraf, 4107 kata.

### Kerangka dan jumlah kata

| Subbab | Kata | Paragraf |
|---|---|---|
| (sebelum judul pertama) | 111 | 22 |
| Pendahuluan Bab | 429 | 60 |
| Uraian Materi | 318 | 5 |
| Kajian Teori dan Riset Terkini | 204 | 3 |
| Ringkasan Kajian Pustaka | 132 | 16 |
| Menyusun Kisi-Kisi Sebelum Menulis Butir | 475 | 24 |
| Menjaga Validitas dan Reliabilitas Instrumen Sejak Awal | 123 | 2 |
| Skala Likert, Skor, dan Persentase Kelayakan | 373 | 3 |
| Mengolah Jawaban Wawancara Menjadi Tema | 263 | 2 |
| Dari Analisis Data ke Rekomendasi yang Actionable | 88 | 1 |
| Keterampilan Instrumen dan Analisis Data sebagai Bekal Employability | 200 | 19 |
| Data Pendukung: Standar Validitas dan Reliabilitas Instrumen | 195 | 15 |
| Menghitung Kesepakatan Ahli untuk Tiap Butir | 278 | 2 |
| Menyusun Daftar Pustaka dari Rujukan Tiap Bab | 62 | 1 |
| Aktivitas Mandiri | 110 | 6 |
| Format Pengumpulan Tugas | 115 | 1 |
| Daftar Rujukan Bab 6 | 552 | 19 |

### Calon salah ketik

Terjaring mesin 17 kata; 17 di antaranya dinilai sesi sebagai kata yang sah sesudah konteksnya dibaca, dan tidak ditampilkan.

Tidak ada yang terjaring.

### Calon kata menempel

Tidak ada yang terjaring.

### Penomoran tabel dan gambar

- Keterangan tabel: 6.1, 6.2, 6.3, 6.4, 6.5.
- Keterangan gambar: 6.1.
- Nomor kembar: tidak ada.
- Urutan tidak naik: tidak ada.
- Disebut di teks tetapi tidak punya keterangan di bab ini: tidak ada.

### Sapaan dan pola lain

- Kata "Anda": 16 kali; "anda" huruf kecil: 0 kali. Bab 1 dan Bab 2 versi suntingan memakai "mahasiswa" sebagai sapaan.
- Kata rusak berpola "...mahasiswa...": tidak ada.
- Kata berulang berurutan (mis. "dan dan"): 0 tempat.

## Versi yang masuk 11 Okt 2026 sore (antrean #209)

Berkas 05, 06, dan 08 kembali ada di `kerja nyata/Naskah sampai Aktivitas Mandiri/` dengan tanggal berkas 11 Okt 2026 00:16, 00:49, dan 01:56. Dibaca dari salinan dengan `baca346.py` (`.claude/catatan-346/` pada worktree sesi), dibandingkan dengan sidik versi sesi 11 Okt 11:04 di `.claude/catatan-bab-3-6/`. Berkas naskah tidak disunting. Bab 5 dikerjakan terpisah di antrean #208.

| Bab | Paragraf sama | Diubah | Baru | Tidak ada lagi | Komentar Word | Kata rusak | Kalimat berpola keras |
|---|---|---|---|---|---|---|---|
| 3 | 163 | 16 | 2 | 5 | 0 | 0 (kata "Anda" masih 6) | 4 |
| 4 | 144 | 21 | 2 | 9 | 0 | 7 | 8 |
| 6 | 167 | 19 | 5 | 16 | 1 | 8 | 2 |

Angka kolom terakhir dari `cek_pola_ai.py` atas ketiga berkas; kolom lain dari `baca346.py`.

Warna huruf: merah FF0000 masih ada di ketiganya (14.511, 13.730, dan 11.047 huruf). Seperti di Bab 5, merah menandai materi tambahan sesi mesin sebelumnya, bukan tulisan tim (lihat `docs/materi-tambahan-bab-5.md`).

### Bab 3

- Diubah: judul tabel tanpa akhiran "Bab 3"; beberapa kata "mahasiswa" dibuang dari kalimat; paragraf ruang lingkup dan batasan ditulis ulang lebih pendek.
- Baru: satu paragraf pembuka subbab latar belakang (64 kata, memuat "tidak muda disusun"); paragraf "Panjang judul tidak perlu dikejar" versi pendek (69 kata).
- Tidak ada lagi: paragraf hasil studi Hyland dan Jiang (137 kata; kalimat pertamanya dipindah ke paragraf sebelumnya), paragraf hasil studi Heard, Cull, dan White (132 kata), dan tiga entri rujukan (Heard dkk.; Hyland dan Jiang; Millar dkk.).
- Kata "Anda" tersisa 6 kali (dua kotak pertanyaan reflektif, dua paragraf ruang lingkup, dua butir Aktivitas Mandiri).

### Bab 4

- Judul bab tertulis "Kajian Pustaka sebagai Lmahasiswasan Pengembangan" di kop bab, kop tabel pembuka, dan satu paragraf jadwal (asalnya "Landasan"). Kata rusak lain: "pmahasiswangan", "menmahasiswakan", dan "Lmahasiswasan" pada dua judul kecil. Salah ketik baru: "indokator".
- Diubah: banyak titik dua diganti kata penghubung ("meliputi", "seperti", "yaitu", "karena"); judul "Pendahuluan Bab" menjadi "Pendahuluan".
- Baru: satu paragraf indikator kunci kajian pustaka (58 kata).
- Tidak ada lagi: bagian "Memakai alat AI secara bertanggung jawab dalam kajian pustaka" (judul dan 3 paragraf, 355 kata) beserta dua entri rujukan (Adel dan Alani; Walters dan Wilder).

### Bab 6

- Komentar tim (Inawati FS, 11 Okt 2026) pada judul "Standar Validitas dan Reliabilitas Instrumen": "tambahkan rumus dalam menghitung hasil validasi ahli dan uji coba pengguna serta berikan contohnya".
- Kata rusak: "Stmahasiswar" dan "stmahasiswar" (3), "Tmahasiswa" (2), "gmahasiswa", "mengmahasiswalkan", "menmahasiswai".
- Diubah: tujuan pembelajaran dipecah dua; judul "Data Pendukung: Standar Validitas ..." menjadi "Standar Validitas ..."; paragraf persentase kelayakan dipendekkan (contoh studi dibuang).
- Baru: satu paragraf pengantar pengembangan instrumen (49 kata); judul "Pengelolaan dan Analisis Hasil Wawancara" dan "Instrumen dan Analisis Data".
- Tidak ada lagi: paragraf kriteria persentase (123 kata), paragraf asal kode induktif dan deduktif (132 kata), bagian "Dari analisis data ke rekomendasi yang actionable" (88 kata), judul "Keterampilan instrumen dan analisis data sebagai bekal employability", bagian "Menghitung kesepakatan ahli untuk tiap butir" (137 kata) dan paragraf indeks V Aiken (141 kata), serta lima entri rujukan (Byrne; Coates dkk.; Mulyanto dan Suhartanta; Naeem dkk.; Ryandika dkk.).

Dari berkasnya tidak bisa dipastikan apakah bagian yang tidak ada lagi itu dipangkas tim atau memang belum ada di salinan dasar yang tim sunting. Petunjuk ke arah dipangkas: kalimat pertama dua paragraf Bab 3 masih tersisa, dan entri rujukan bagian itu ikut tidak ada.

Rincian tiap paragraf yang berubah: keluaran `baca346.py` di `.claude/catatan-346/hasil-baca.txt`.

## Pembetulan dan tambahan 11 Okt 2026 malam (antrean #210 dan #211 A)

Ditulis ke berkas 05, 06, dan 08 di folder naskah pada 11 Okt 2026 17:55. Berkas sebelum diubah disimpan di `.claude/cadangan-210/asal/` pada worktree sesi (md5 `f33b381e...`, `e0af4e61...`, `f5a6a9b4...`). Skrip: `betul210.py`, `isi211.py`, `sisip211.py`, `word210.py`, `cek210.py` di folder yang sama.

Warna: pembetulan dan tulisan baru di badan berwarna biru 0070C0. Pembetulan di kop bab, kaki halaman, dan daftar isi mengikuti warna aslinya.

### Pembetulan kata (#210): 25 tempat

| Bab | Sebelum | Sesudah | Jumlah | Letak |
|---|---|---|---|---|
| 3 | Anda | mahasiswa | 6 | satu kotak pertanyaan reflektif, dua paragraf ruang lingkup, tiga butir Aktivitas Mandiri |
| 3 | tidak muda disusun | tidak mudah disusun | 1 | paragraf pembuka latar belakang |
| 4 | LmahasiswaSAN | LANDASAN | 3 | baris kop di atas daftar isi, judul bab di kop, kaki halaman |
| 4 | Lmahasiswasan, lmahasiswasan | Landasan, landasan | 3 | paragraf jadwal, dua sel tabel |
| 4 | pmahasiswangan | pandangan | 1 | badan |
| 4 | menmahasiswakan | menandakan | 1 | badan |
| 4 | indokator | indikator | 1 | badan |
| 6 | Stmahasiswar, stmahasiswar | Standar, standar | 3 | daftar isi (dibangun ulang), badan, keterangan Tabel 6.5 |
| 6 | Tmahasiswa | Tanda | 2 | dua sel Tabel 6.3 |
| 6 | mengmahasiswalkan | mengandalkan | 1 | sel tabel |
| 6 | gmahasiswa | ganda | 1 | butir Aktivitas Mandiri |
| 6 | menmahasiswai | menandai | 1 | butir Aktivitas Mandiri |
| 6 | oengembangan | pengembangan | 1 | badan (ditemukan pemeriksa) |

Kata "antarmahasiswa" di Bab 3 dibiarkan karena memang benar.

### Tambahan Bab 6 (#211 A)

Menjawab komentar tim pada judul "Standar Validitas dan Reliabilitas Instrumen": "tambahkan rumus dalam menghitung hasil validasi ahli dan uji coba pengguna serta berikan contohnya". Komentar itu masih menempel di tempatnya.

Bagian baru "Menghitung Hasil Validasi Ahli dan Uji Coba Pengguna" disisipkan sesudah Tabel 6.5: satu judul, empat paragraf (457 kata), tiga baris rumus, dua rujukan. Semua angka contoh rekaan dan memakai lembar validasi delapan butir pada Tabel 6.3.

| Rumus | Contoh hitung | Sumber cara |
|---|---|---|
| Persentase kelayakan = jumlah skor ÷ skor maksimum × 100% | aspek tampilan: 21 ÷ 30 = 70% (seluruh lembar pada contoh lama: 102 ÷ 120 = 85%) | Okterina dkk. (2025), Tabel 4: rata-rata 4,60 dari 5 ditulis 92% |
| I-CVI = jumlah ahli yang memberi skor 3 atau 4 ÷ jumlah ahli | butir 1: 3 ÷ 3 = 1,00; butir 5: 2 ÷ 3 = 0,67 | Yusoff (2019), hlm. 51 dan 52; Wang dan Sahid (2024), hlm. 4 |
| Persentase kepraktisan = jumlah skor seluruh responden ÷ skor maksimum × 100% | 9 pengguna, 8 butir, skala 5: 306 ÷ 360 = 85% | Okterina dkk. (2025): 98% kelompok kecil, 93% kelompok besar |

Rujukan baru di Daftar Rujukan Bab 6: Okterina dkk. (2025), DOI 10.29303/jppipa.v11i4.10673; Yusoff (2019), DOI 10.21315/eimj2019.11.2.6. Keduanya artikel akses terbuka yang dibuka sesi. Wang dan Sahid (2024) serta Polit dkk. (2007) sudah ada di daftar.

Menyimpang dari usulan awal: usulan #211 A hanya menyebut persentase kelayakan. Rumus I-CVI ditambahkan karena Tabel 6.5 di bagian yang dikomentari memakai ambang ukuran itu tanpa cara menghitungnya.

Daftar isi Bab 6 dibangun ulang lewat Word; halaman 16 menjadi 17.

### Yang ditemukan tetapi tidak diubah

- Kalimat lama (merah) di bagian yang sama menulis bahwa Polit, Beck, dan Owen (2007) "menyebut batas 0,78 untuk penilaian oleh tiga ahli atau lebih". Menurut tabel di Yusoff (2019) dan Wang dan Sahid (2024), angka 0,78 berasal dari Lynn (1986) untuk sembilan ahli atau lebih, dan untuk tiga sampai lima ahli patokannya 1,00. Artikel Polit dkk. tidak terbuka untuk umum dan tidak dibaca sesi, jadi kalimat lama dibiarkan. Paragraf baru hanya menjelaskan bahwa untuk tiga ahli kedua batas itu memberi keputusan yang sama.
- Okterina dkk. (2025) tidak konsisten di dalam artikelnya: kepraktisan guru 94% di abstrak tetapi 93% di badan, dan tabel kelompok besar memuat 98% padahal teksnya 93%. Naskah memakai angka yang sama di abstrak dan teks (98% kelompok kecil, 93% kelompok besar) dan tidak memakai angka guru.
- Daftar isi Bab 3 dan Bab 4 tampil tanpa judul bila dicetak dari Word, juga di berkas yang belum disentuh sesi (antrean #218).
- Dua butir Aktivitas Mandiri Bab 3 kini berbunyi "dalam proyek mahasiswa"; benar tata bahasanya, tetapi tidak lagi menyapa pembaca langsung.

### Pemeriksa akhir

Satu agen `sonnet`, hanya membaca. Ia menjalankan ulang `cek210.py` dan `cek_pola_ai.py`, membuka seluruh bagian XML tiga berkas dengan pola cari sendiri, menghitung ulang semua angka, membuka tiga PDF sumber, mencocokkan dua rujukan ke Crossref, dan membuat enam berkas uji di `.claude/cadangan-210/periksa/`. Delapan klaim: tujuh lolos, satu disanggah.

| Sanggahan atau catatan | Nasib |
|---|---|
| Kalimat baru menisbahkan ambang 1,00 ke Polit dkk., kalimat lama menisbahkan 0,78 ke rujukan yang sama | Diterima. Kalimat baru ditulis ulang tanpa menisbahkan ke Polit dkk.; kalimat lama dicatat di atas |
| `cek210.py` tidak memeriksa kata rusak di daftar isi Bab 6 | Diterima. Pembanding kini memeriksanya |
| "oengembangan" di Bab 6 | Diterima. Dibetulkan |

Keluaran akhir `python cek210.py asal <folder naskah>`: `SEMUA LOLOS` (teks lama sama persis sesudah pembetulan dan urutannya tetap; merah 14.511 menjadi 14.503, 13.730 menjadi 13.701, 11.047 menjadi 11.014; komentar, gambar, dan tabel tetap). `cek_pola_ai.py teks-baru-211.txt`: keras = 0.

