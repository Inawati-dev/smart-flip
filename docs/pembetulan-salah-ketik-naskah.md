# Pembetulan salah ketik dan kalimat rusak di naskah (antrean #221, #214 A)

Disusun 12 Okt 2026. Berkas yang dibetulkan: delapan berkas di `kerja nyata/Naskah sampai Aktivitas Mandiri/` (Pendahuluan, Bab 1 sampai 6, Penutup), Word dan PDF.
Sejak sapuan #217 seluruh teks isi berwarna hitam, jadi daftar ini satu-satunya jejak pembetulan. Nomor paragraf (P0001 dan seterusnya) mengikuti `.claude/cadangan-221/teks/<kode>.txt`.

Jumlah: 122 penggantian teks di 81 paragraf (114 catatan di `.claude/cadangan-221/log221.json`), ditambah 1 paragraf judul kosong yang dibuang di Bab 3. Entri daftar rujukan tidak disentuh.
Cara kerja: `betul221.py` membaca berkas asal dan menulis salinan; `cek221.py` membandingkan; daftar isi dan PDF dibangun ulang lewat Word (`word221.py`); berkas naskah ditimpa oleh `tulis221.py` sesudah memastikan tidak ada berkas kunci Word dan md5 naskah sama dengan cadangan.

## Yang memakai tafsiran sesi dan perlu dibaca tim

| Berkas | Paragraf | Perubahan | Dasar |
|---|---|---|---|
| Pendahuluan | P0005, P0011; Penutup P0076 | Nomor Gambar 1.1 dan 1.2 ditukar menurut urutan muncul (Kerangka Teoretis jadi 1.1, Alur Belajar Adaptif jadi 1.2); rujukan di Penutup ikut menjadi "Gambar 1.2 (Bagian I)" | Di berkas asal Gambar 1.2 tercetak di halaman sebelum Gambar 1.1. Hanya satu rujukan bernomor ke gambar itu di delapan berkas |
| Bab 2, 3, 5 | P0007 | Judul "Pendahuluan Bab" menjadi "Pendahuluan" | Mengikuti Bab 1, berkas acuan; Bab 4 dan 6 sudah begitu |
| Bab 3, 5 | P0170, P0216; P0168, P0214 | "Daftar Rujukan" menjadi "Daftar Rujukan Bab 3" dan "Bab 5"; titik dua di "Format Pengumpulan Tugas:" dibuang | Mengikuti empat bab lain |
| Pendahuluan | P0012 | "nilai 80 >" menjadi "nilai > 80" | Kalimat yang sama memakai "≤ 80" untuk kelompok lawannya |
| Pendahuluan | P0012, P0013, P0167 | "yang dimana akan" menjadi "yang akan"; "kuis formatif yang dimana jika" menjadi "kuis formatif. Jika"; "Pada pertemuan ke-8 ... mengevaluasi" menjadi "Pertemuan ke-8 ... mengevaluasi" | Kalimat tanpa subjek atau berpenghubung tidak baku |
| Bab 2 | P0012, P0053 | Koma dan tanda kurung ditambah di sisipan | Sisipan tidak bertanda sehingga kalimat sulit dibaca |
| Bab 3 | P0075, P0093, P0125, P0126, P0026 | Koma sebelum "pola yang persis"; "Berikut alur ... berikut" dibuang satu; "Batasan dalam proposal masuk"; "yang akan dipilih"; "Bab 2 atau dari akses data"; titik koma di sel tabel | Kalimat rusak |
| Bab 4 | P0057, P0080, P0084, P0111 | Titik dua ditambah; "dengan cara menentukan"; "kelemahannya: pelacakan" | Kalimat rusak |
| Bab 6 | P0124, P0175 | Kalimat panjang dipecah ("kompleks. Untuk instrumen"); "aplikasi manager referens seperti Mandelay atau Zetero" menjadi "aplikasi pengelola referensi seperti Mendeley atau Zotero" | Kalimat rusak; nama aplikasi yang benar dipakai Bab 4 |
| Bab 5, 6 | P0166, P0151 | Nama penulis diberi tanda hubung (Luque-Vara dan seterusnya) | Sama dengan entri daftar rujukan di berkas itu |

## Daftar lengkap per berkas

### Pendahuluan (29 catatan)

| Paragraf | Jenis | Sebelum | Sesudah |
|---|---|---|---|
| P0005 | nomor gambar menurut urutan muncul | "Gambar 1.2 Kerangka Teoretis Pengem" | "Gambar 1.1 Kerangka Teoretis Pengem" |
| P0011 | nomor gambar menurut urutan muncul | "Gambar 1.1 Alur Belajar Adaptif Sma" | "Gambar 1.2 Alur Belajar Adaptif Sma" |
| P0009 | salah ketik | "r adaptif adalah alur berfikir yang diterapkan dala"; "i Malang. Adapun alur berfikir yang diterapkan dala" | "r adaptif adalah alur berpikir yang diterapkan dala"; "i Malang. Adapun alur berpikir yang diterapkan dala" |
| P0009 | salah ketik | "n dalam modul ini dapat dlihat pada gambar berikut" | "n dalam modul ini dapat dilihat pada gambar berikut" |
| P0012 | tanda banding terbalik | "hasiswa memperoleh nilai 80 > maka mahasiswa masuk ked" | "hasiswa memperoleh nilai > 80 maka mahasiswa masuk ked" |
| P0012 | kalimat rusak | "lajaran jalur cepat yang dimana akan diarahkan pada penge" | "lajaran jalur cepat yang akan diarahkan pada penge" |
| P0012 | salah ketik | "m dan akan diberi perlakukan pembelajaran yang lebi" | "m dan akan diberi perlakuan pembelajaran yang lebi" |
| P0013 | spasi di awal paragraf | "Tahapan adaptif tersebut" | "Tahapan adaptif tersebut" |
| P0013 | kalimat rusak | "kapi dengan kuis formatif yang dimana jika memperoleh nilai < 70" | "kapi dengan kuis formatif. Jika memperoleh nilai < 70" |
| P0013 | salah ketik | "tnya, sedangkan jika mempperoleh nilai ≥ 70 maka ma" | "tnya, sedangkan jika memperoleh nilai ≥ 70 maka ma" |
| P0021 | salah ketik | "ahasiswa dalam menyelesaian Tugas Akhir. Selain pe" | "ahasiswa dalam menyelesaikan Tugas Akhir. Selain pe" |
| P0011 | nama produk | "lur Belajar Adaptif Smart-Flip 5.0" | "lur Belajar Adaptif Smart Flip 5.0" |
| P0097 | huruf besar | "Kegiatan Tatap muka pada Mata Kulia" | "Kegiatan tatap muka pada Mata Kulia" |
| P0097 | huruf besar | "if (UTS dan UAS). Setiap Bab pada modul ini dilengk" | "if (UTS dan UAS). Setiap bab pada modul ini dilengk" |
| P0145 | salah ketik | "Model - model pengembangan dalam" | "Model-model pengembangan dalam" |
| P0167 | kalimat rusak | "Pada pertemuan ke-8 (Ujian Ten" | "pertemuan ke-8 (Ujian Ten" |
| P0167 | kalimat rusak | "pertemuan ke-8 (Ujian Teng" | "Pertemuan ke-8 (Ujian Teng" |
| P0009 | proyek | "tian dan Pengembangan Projek yang merupakan salah s" | "tian dan Pengembangan Proyek yang merupakan salah s" |
| P0012 | teoretis | "memahami baik secara teoritis maupun secara praktis" | "memahami baik secara teoretis maupun secara praktis" |
| P0012 | ke dalam | "0 maka mahasiswa masuk kedalam kelompok pembelajar" | "0 maka mahasiswa masuk ke dalam kelompok pembelajar" |
| P0013 | proyek | "erta mengerjakan mini projek yang akan menjadi dasa" | "erta mengerjakan mini proyek yang akan menjadi dasa" |
| P0013 | proyek | "tian dan Pengembangan Projek. Pada setiap akhir bab" | "tian dan Pengembangan Proyek. Pada setiap akhir bab" |
| P0020 | proyek | "erta mengerjakan mini projek yang akan menjadi dasa" | "erta mengerjakan mini proyek yang akan menjadi dasa" |
| P0021 | proyek | ". Selain penyelesaian projek mini, pengetahuan maha" | ". Selain penyelesaian proyek mini, pengetahuan maha" |
| P0021 | draf | "hasiswa menghasilkan draft proposal penelitian dan"; "dkannya dalam bentuk draft proposal penelitian dan" | "hasiswa menghasilkan draf proposal penelitian dan"; "dkannya dalam bentuk draf proposal penelitian dan" |
| P0029 | proyek | "alam menyusun rencana projek dalam bentuk proposal projek. Mata kuliah ini ditur" | "alam menyusun rencana proyek dalam bentuk proposal proyek. Mata kuliah ini ditur" |
| P0029 | ke dalam | "a, kemudian dijabarkan kedalam CPMK dan Sub CPMK." | "a, kemudian dijabarkan ke dalam CPMK dan Sub CPMK." |
| P0158 | spasi ganda | "ktik pengumpulan data dan  analisis data, Aktivitas" | "ktik pengumpulan data dan analisis data, Aktivitas" |
| P0162 | proyek | "duk & instrumen (mini projek), umpan balik dosen, p" | "duk & instrumen (mini proyek), umpan balik dosen, p" |

### Bab 1 (7 catatan)

| Paragraf | Jenis | Sebelum | Sesudah |
|---|---|---|---|
| P0050 | ejaan | "ang ingin mengurangi antrian kasir yang panjang saa" | "ang ingin mengurangi antrean kasir yang panjang saa" |
| P0011 | bentuk terikat | "Keterkaitan Antar BAB / Proposal Akhir:" | "Keterkaitan Antarbab / Proposal Akhir:" |
| P0014 | huruf besar rujukan gambar atau tabel | "dan 2 dapat dilihat pada tabel 1.1 berikut." | "dan 2 dapat dilihat pada Tabel 1.1 berikut." |
| P0035 | spasi ganda | "eberapa pendekatan teori  Creswell & Creswell (2018" | "eberapa pendekatan teori Creswell & Creswell (2018" |
| P0057 | teoretis | "yang menjadi pijakan teoritis maupun praktis. Ringk" | "yang menjadi pijakan teoretis maupun praktis. Ringk" |
| P0071 | huruf besar rujukan gambar atau tabel | "n, seperti terlihat pada gambar 1.1 berikut." | "n, seperti terlihat pada Gambar 1.1 berikut." |
| P0071 | di mana | "rkaitan satu sama lain dimana paradigma penelitian" | "rkaitan satu sama lain di mana paradigma penelitian" |

### Bab 2 (12 catatan)

| Paragraf | Jenis | Sebelum | Sesudah |
|---|---|---|---|
| P0007 | judul diseragamkan dengan Bab 1 | "Pendahuluan Bab" | "Pendahuluan" |
| P0012 | tanda baca hilang | "yang konkret. Hasil Bab 2 yaitu topik yang telah d"; "eserta bukti pendukungnya  akan menjadi bahan utama" | "yang konkret. Hasil Bab 2, yaitu topik yang telah d"; "eserta bukti pendukungnya, akan menjadi bahan utama" |
| P0053 | tanda baca hilang | "g yang terlibat langsung supervisor, staf pelaksan"; "na, atau bahkan pelanggan karena seringkali akar m" | "g yang terlibat langsung (supervisor, staf pelaksan"; "na, atau bahkan pelanggan) karena seringkali akar m" |
| P0127 | kalimat tanya berakhir titik | "nyumbang masalah tersebut." | "nyumbang masalah tersebut?" |
| P0011 | bentuk terikat | "Keterkaitan Antar BAB / Proposal Akhir:" | "Keterkaitan Antarbab / Proposal Akhir:" |
| P0059 | bentuk terikat | "g bersifat pengamatan non ilmiah atau data statisti" | "g bersifat pengamatan nonilmiah atau data statisti" |
| P0082 | bentuk terikat | "cok adalah wawancara semi terstruktur. Menurut Adeo" | "cok adalah wawancara semiterstruktur. Menurut Adeo" |
| P0022 | spasi ganda | "dengan topik sebelumnya  (paradigma yang telah dip" | "dengan topik sebelumnya (paradigma yang telah dip" |
| P0053 | sering kali | "pelanggan) karena seringkali akar masalah baru te" | "pelanggan) karena sering kali akar masalah baru te" |
| P0063 | teoretis | "yang menjadi pijakan teoritis maupun praktis. Ringk" | "yang menjadi pijakan teoretis maupun praktis. Ringk" |
| P0078 | huruf besar rujukan gambar atau tabel | "uluan dapat dilihat pada gambar 2.1 berikut." | "uluan dapat dilihat pada Gambar 2.1 berikut." |
| P0105 | subbab | "Pada proposal, sub bab 1.2 Identifikasi Masa" | "Pada proposal, subbab 1.2 Identifikasi Masa" |

### Bab 3 (22 catatan)

| Paragraf | Jenis | Sebelum | Sesudah |
|---|---|---|---|
| P0007 | judul diseragamkan dengan Bab 1 | "Pendahuluan Bab" | "Pendahuluan" |
| P0075 | kalimat rusak | "lum menuju rumusan tujuan pola yang persis diajark" | "lum menuju rumusan tujuan, pola yang persis diajark" |
| P0075 | huruf besar | "endukung - urgensi" pada Bab ini." | "endukung - urgensi" pada bab ini." |
| P0093 | salah ketik | "mbangan maka sebaiknya memngikuti alur penyusunan b" | "mbangan maka sebaiknya mengikuti alur penyusunan b" |
| P0093 | salah ketik | "pengembangan projek dapar dilihat pada gambar 3.1" | "pengembangan projek dapat dilihat pada gambar 3.1" |
| P0093 | ejaan | "h baik dan dapat menjadi pondasi dalam melakukan pe" | "h baik dan dapat menjadi fondasi dalam melakukan pe" |
| P0125 | kalimat rusak | "elah penelitian selesai. Dalam proposal masuk pada" | "elah penelitian selesai. Batasan dalam proposal masuk pada" |
| P0168 | judul diseragamkan dengan Bab 1 | "Format Pengumpulan Tugas:" | "Format Pengumpulan Tugas" |
| P0170 | judul diseragamkan dengan Bab 1 | "Daftar Rujukan" | "Daftar Rujukan Bab 3" |
| P0010 | bentuk terikat | "Keterkaitan Antar BAB / Proposal Akhir:" | "Keterkaitan Antarbab / Proposal Akhir:" |
| P0026 | tanda baca hilang | "3.1 dan kaidah APA (2020) memandu latihan menulis" | "3.1 dan kaidah APA (2020); memandu latihan menulis" |
| P0093 | kalimat rusak | "kan pengembangan produk. Berikut alur penyusunan latar bela" | "kan pengembangan produk. Alur penyusunan latar bela" |
| P0126 | kata hilang | "engikuti model yang akan pilih pada Bab 5. Pada ti" | "engikuti model yang akan dipilih pada Bab 5. Pada ti" |
| P0126 | kalimat rusak | "h yang dipilih pada Bab 2, dari akses data yang dim" | "h yang dipilih pada Bab 2 atau dari akses data yang dim" |
| P0079 | teoretis | "yang menjadi pijakan teoritis maupun praktis. Ringk" | "yang menjadi pijakan teoretis maupun praktis. Ringk" |
| P0093 | proyek | "Latar belakang projek dalam sebuah proposal"; "belakang pengembangan projek dapat dilihat pada gam" | "Latar belakang proyek dalam sebuah proposal"; "belakang pengembangan proyek dapat dilihat pada gam" |
| P0093 | huruf besar rujukan gambar atau tabel | "royek dapat dilihat pada gambar 3.1 berikut." | "royek dapat dilihat pada Gambar 3.1 berikut." |
| P0101 | subbab | "an ditulis nanti pada sub bab Penelitian yang Relev" | "an ditulis nanti pada subbab Penelitian yang Relev" |
| P0148 | subbab | "yang dijelaskan pada sub bab berikutnya. Dalam sus"; "ngkup tidak mempunyai sub bab sendiri, sehingga bar" | "yang dijelaskan pada subbab berikutnya. Dalam sus"; "ngkup tidak mempunyai subbab sendiri, sehingga bar" |
| P0151 | subbab | "onal ditulis di akhir sub bab 1.5." | "onal ditulis di akhir subbab 1.5." |
| P0160 | draf | "Tulis draft latar belakang mengikuti" | "Tulis draf latar belakang mengikuti" |
| P0169 | subbab | ".docx) dengan susunan sub bab: 1.1 Latar Belakang M"; "onal ditulis di akhir sub bab 1.5. Font Times New R" | ".docx) dengan susunan subbab: 1.1 Latar Belakang M"; "onal ditulis di akhir subbab 1.5. Font Times New R" |

Ditambah: 1 paragraf bergaya judul tanpa isi (di atas "Dari Identifikasi Masalah ke Rumusan Masalah") dibuang.

### Bab 4 (16 catatan)

| Paragraf | Jenis | Sebelum | Sesudah |
|---|---|---|---|
| P0076 | salah ketik | "penelitian. Semua unsur ntersebut saling berkaitan" | "penelitian. Semua unsur tersebut saling berkaitan" |
| P0082 | salah ketik | "n), lalu menunjukkan polaseperti apakah sumber-sum" | "n), lalu menunjukkan pola seperti apakah sumber-sum" |
| P0108 | nama produk | "engayanya (plugin) untuk word, lalu masukkan setiap" | "engayanya (plugin) untuk Word, lalu masukkan setiap" |
| P0107 | nama produk | "menyisipkan kutipan ke Ms word dan menyusun daftar" | "menyisipkan kutipan ke Microsoft word dan menyusun daftar" |
| P0107 | nama produk | "kan kutipan ke Microsoft word dan menyusun daftar r" | "kan kutipan ke Microsoft Word dan menyusun daftar r" |
| P0057 | kalimat rusak | "n dalam skala kecil pada Bab ini memetakan beberapa sumbe" | "n dalam skala kecil pada bab ini: memetakan beberapa sumbe" |
| P0080 | salah ketik | "ipertanggungjawabkan dari pada penelusuran acak yan" | "ipertanggungjawabkan daripada penelusuran acak yan" |
| P0080 | kalimat rusak | "skala kecil dengan cara tentukan dahulu kata kunci" | "skala kecil dengan cara menentukan dahulu kata kunci" |
| P0084 | tanda baca hilang | "ertahap ini tetap berlaku mulai dari pencarian lua" | "ertahap ini tetap berlaku: mulai dari pencarian lua" |
| P0111 | kalimat rusak | "eme mengakui kelemahannya pada pelacakan per sumber men" | "eme mengakui kelemahannya: pelacakan per sumber men" |
| P0061 | teoretis | "yang menjadi pijakan teoritis maupun praktis. Ringk" | "yang menjadi pijakan teoretis maupun praktis. Ringk" |
| P0076 | huruf besar rujukan gambar atau tabel | "staka dapat dilihat pada gambar 4.1 berikut." | "staka dapat dilihat pada Gambar 4.1 berikut." |
| P0111 | subbab | "g dapat dipakai untuk sub bab 2.1 proposal." | "g dapat dipakai untuk subbab 2.1 proposal." |
| P0114 | spasi ganda | "Analisis  Sumber" | "Analisis Sumber" |
| P0151 | spasi ganda | "maan dengan proyek saya,  perbedaan dengan proyek s" | "maan dengan proyek saya, perbedaan dengan proyek s" |
| P0155 | subbab | "t Word (.docx) dengan sub bab: 2.1 Kajian Teori (satu sub bab per tema), 2.2 Peneli" | "t Word (.docx) dengan subbab: 2.1 Kajian Teori (satu subbab per tema), 2.2 Peneli" |

### Bab 5 (13 catatan)

| Paragraf | Jenis | Sebelum | Sesudah |
|---|---|---|---|
| P0007 | judul diseragamkan dengan Bab 1 | "Pendahuluan Bab" | "Pendahuluan" |
| P0099 | tanda baca hilang | "ealistis untuk diterapkan  4D, ADDIE, Waterfall, Bo" | "ealistis untuk diterapkan: 4D, ADDIE, Waterfall, Bo" |
| P0162 | huruf besar judul | "5. Dari Flowchart menjadi rancangan Prototipe" | "5. Dari Flowchart Menjadi Rancangan Prototipe" |
| P0166 | nama penulis | "npa kriteria jelas. Luque Vara, Linares-Manrique, Fernández Gómez, Martín Salvador, Sánchez Ojeda, dan Enrique Mirón (2020) menyatakan b" | "npa kriteria jelas. Luque-Vara, Linares-Manrique, Fernández-Gómez, Martín-Salvador, Sánchez-Ojeda, dan Enrique-Mirón (2020) menyatakan b" |
| P0214 | judul diseragamkan dengan Bab 1 | "Format Pengumpulan Tugas:" | "Format Pengumpulan Tugas" |
| P0216 | judul diseragamkan dengan Bab 1 | "Daftar Rujukan" | "Daftar Rujukan Bab 5" |
| P0101 | ejaan | "arena sifatnya yang siklikal memungkinkan evaluasi be" | "arena sifatnya yang siklis memungkinkan evaluasi be" |
| P0159 | titik akhir | "endukung pilihan tersebut" | "endukung pilihan tersebut." |
| P0099 | spasi ganda | "erfall, Borg & Gall, XP,  GDLC, dan RAD? Jelaskan a" | "erfall, Borg & Gall, XP, GDLC, dan RAD? Jelaskan a" |
| P0105 | proyek | "el Pengembangan untuk Projek Mahasiswa" | "el Pengembangan untuk Proyek Mahasiswa" |
| P0161 | subbab | "l adalah narasi, satu sub bab per tahap, karena nar" | "l adalah narasi, satu subbab per tahap, karena nar" |
| P0192 | subbab | "n atau jabatannya. Di sub bab 3.3 proposal, cukup s"; "ranya dijelaskan pada sub bab berikut." | "n atau jabatannya. Di subbab 3.3 proposal, cukup s"; "ranya dijelaskan pada subbab berikut." |
| P0196 | subbab | "n ke daftar baca". Di sub bab 3.3 proposal, tuliska" | "n ke daftar baca". Di subbab 3.3 proposal, tuliska" |

### Bab 6 (11 catatan)

| Paragraf | Jenis | Sebelum | Sesudah |
|---|---|---|---|
| P0095 | salah ketik | "ian dijabarkan menjadi intrumen penelitian yang da" | "ian dijabarkan menjadi instrumen penelitian yang da" |
| P0124 | kalimat rusak | "rumus statistik kompleks untuk instrumen validasi a" | "rumus statistik kompleks. Untuk instrumen validasi a" |
| P0124 | bentuk terikat | "tingkat kesepakatan antar penilai (inter rater agre" | "tingkat kesepakatan antarpenilai (inter rater agre" |
| P0151 | nama penulis | "seperti dicontohkan Luque Vara dkk. (2020), sebuah" | "seperti dicontohkan Luque-Vara dkk. (2020), sebuah" |
| P0175 | salah ketik nama aplikasi | "nya menggunakan aplikasi manager referens seperti Mandelay atau Zetero." | "nya menggunakan aplikasi pengelola referensi seperti Mendeley atau Zotero." |
| P0080 | teoretis | "yang menjadi pijakan teoritis maupun praktis. Ringk" | "yang menjadi pijakan teoretis maupun praktis. Ringk" |
| P0095 | huruf besar rujukan gambar atau tabel | "roduk dapat dilihat pada gambar 6.1 berikut." | "roduk dapat dilihat pada Gambar 6.1 berikut." |
| P0098 | subbab | "itu sudah tersedia di sub bab 1.5 proposal, yaitu p" | "itu sudah tersedia di subbab 1.5 proposal, yaitu p" |
| P0121 | subbab | "inilah yang dimuat di sub bab 3.4 proposal, sedangk" | "inilah yang dimuat di subbab 3.4 proposal, sedangk" |
| P0173 | subbab | "an tulis sumbernya di sub bab 3.5 proposal. Untuk p" | "an tulis sumbernya di subbab 3.5 proposal. Untuk p" |
| P0184 | subbab | "t Word (.docx) dengan sub bab: 3.1 Model Pengembang" | "t Word (.docx) dengan subbab: 3.1 Model Pengembang" |

### Penutup (4 catatan)

| Paragraf | Jenis | Sebelum | Sesudah |
|---|---|---|---|
| P0076 | rujukan mengikuti nomor gambar baru | "ar adaptif pada Gambar 1.1 (Bagian I) dan roadmap e" | "ar adaptif pada Gambar 1.2 (Bagian I) dan roadmap e" |
| P0019 | bentuk terikat | "ilitasi peer review antar kelompok" | "ilitasi peer review antarkelompok" |
| P0073 | bentuk terikat | "enyesuaikan pembagian sub komponen (misalnya propor" | "enyesuaikan pembagian subkomponen (misalnya propor" |
| P0073 | bentuk terikat | "(misalnya proporsi antar-bab dalam komponen Proyek" | "(misalnya proporsi antarbab dalam komponen Proyek" |

## Komentar tim di Bab 5 (antrean #214 A)

Komentar Inawati FS "sesuaikan dengan isi yang dibahas" (11 Okt 2026 08:13:34Z) semula menempel pada nomor halaman di daftar isi dan terhapus saat daftar isi dibangun ulang pada #208. Komentar itu dipasang lagi pada judul "Daftar Isi" dengan nama, tanggal, dan teks aslinya, ditambah satu balasan atas nama "Claude (sesi Johan)" yang menjelaskan pemindahannya. Bab 5 kini memuat 11 komentar: 9 yang lama, 1 yang dipasang lagi, 1 balasan. Skripnya `komentar214.py`.

## Yang sengaja tidak diubah

- Nama mata kuliah "Metode Pengembangan Proyek" di Pendahuluan P0029 dan P0049. Sampul, kaki halaman enam bab, dan aplikasi memakai "Metode Penelitian dan Pengembangan Proyek", tetapi nama resmi di RPS tidak bisa dibuktikan sesi. Butuh jawaban tim (antrean #223).
- "Mini Projek": nama menu di aplikasi. "MINI PROJEK" di dalam gambar alur belajar juga tetap.
- "Sub CPMK", "Sub-CPMK", "sub CPMK" (Pendahuluan dan Penutup): istilah kurikulum, bentuknya dipilih tim.
- "Tabel Bagian 1.1" di Pendahuluan dan "Gambar 2.0 (Bagian II)" di Penutup: penomoran lintas bagian, dan berkas pembuka Bagian II tidak ada di folder ini.
- Judul bernomor 1 sampai 10 di Bab 5 (bab lain tidak bernomor) dan judul subbab Bab 4 "Menyusun Sintesis, Bukan Sekadar Kumpulan Kutipan".
- Halaman terakhir yang hanya berisi sedikit baris di Bab 3 dan Penutup: itu sisa isi yang wajar. Halaman dua baris di Pendahuluan hilang sendiri sesudah pembetulan (10 menjadi 9 halaman).
- Spasi di akhir judul "Pendahuluan " di Bab 1, 4, 6 (tidak tercetak), "siklis" dan "Peta Mind-Map" di tempat lain, serta entri daftar rujukan dan teks berbahasa Inggris.

## Pemeriksa akhir

Satu agen model opus, hanya membaca. Ia menjalankan ulang `cek221.py`, membandingkan asal dan hasil dengan skrip sendiri (teks semua paragraf, sifat tabel dan seksi, format per huruf), membaca tiap pembetulan, membaca penuh Pendahuluan, Bab 3, Bab 5, dan badan Bab 4, membuka PDF, membaca XML komentar Bab 5, dan membuat 12 berkas uji di `periksa/`.

| Sanggahan | Nasib |
|---|---|
| Penukaran nomor gambar di Pendahuluan membuat rujukan "Gambar 1.1 (Bagian I)" di Penutup menunjuk gambar yang salah | Diterima. Rujukan di Penutup P0076 menjadi "Gambar 1.2 (Bagian I)" |
| Bab 4 P0107: "Microsoft W" tegak dan "ord" miring di PDF | Diterima. Pembetulan dikerjakan per run: "Microsoft " tegak, "Word" miring seperti kata aslinya |
| Salah ketik dan kalimat rusak tertinggal (27 butir) | Diterima 24 butir, semuanya masuk daftar di atas. Tiga dibiarkan: "Sub CPMK", "Tabel Bagian 1.1", "Peta Mind-Map" |
| `cek221.py` meloloskan 4 dari 12 berkas uji: huruf pindah antar-run, arsir sel, margin seksi, garis tabel | Diterima. Pembanding kini membandingkan seluruh badan dokumen dan format tiap huruf yang tidak diganti; tiga uji ulang sesi tertangkap. Pembanding yang baru langsung menemukan satu cacat lagi (huruf "P" tegak di "Pertemuan ke-8", Pendahuluan P0167), yang lalu diperbaiki |
| Nama mata kuliah di Pendahuluan P0029 dan P0049 diganti tanpa bukti dari RPS | Diterima. Penggantian dibatalkan, jadi pertanyaan untuk tim |
| Bab 3 P0093: kata "berikut" dua kali | Diterima |
| "87 pembetulan" adalah jumlah catatan, bukan jumlah penggantian | Diterima. Skrip kini mencatat keduanya |
| Balasan komentar bertanggal bulat dan menyebut "antrean #208" | Diterima. Tanggal memakai waktu pemasangan dan kata antrean dibuang |
| Spasi di akhir judul "Pendahuluan " di tiga bab | Tidak dikerjakan: tidak tercetak |

Pembetulan sesudah pemeriksa tidak diperiksa agen lagi. Sesi membacanya satu per satu dan menjalankan ulang semua pembanding.
Yang tidak diperiksa pemeriksa: Bab 1, 2, 6, dan Penutup tidak dibaca penuh (hanya disapu dengan pola), jadi salah ketik di empat berkas itu mungkin masih ada; berkas tidak dibuka di Word oleh pemeriksa (sesi yang membukanya); nama resmi mata kuliah dan kebenaran isi rujukan.

## Cara memeriksa ulang

Dari `.claude/cadangan-221/` pada worktree sesi:

```bash
python cek221.py asal hasil
python ../cadangan-217/cekpdf217.py akhir pdf
python tulis221.py
```

Yang pertama harus berakhir `SEMUA LOLOS`. Yang kedua harus menunjukkan semua baris daftar isi enam bab cocok (17, 17, 17, 16, 15, 15); ia mencetak `PERIKSA` untuk Bab 3, 4, dan 6 karena empat potong teks bukan tabel, sama seperti pada #217. Yang ketiga, tanpa `--tulis`, hanya memeriksa berkas kunci dan md5.

## Putaran kedua: Bab 1, Bab 2, Bab 6, dan Penutup dibaca penuh (antrean #223 butir 5)

Dikerjakan 12 Okt 2026 sesudah pemeriksa putaran pertama menyebut empat berkas ini baru disapu dengan pola. Sesi membaca keempatnya dari awal sampai akhir (daftar rujukan dilewati), lalu membetulkan dengan cara yang sama. Skrip dan cadangan ada di `.claude/cadangan-223/`; berkas asal putaran ini adalah hasil putaran pertama.

Jumlah: 56 penggantian teks di 47 paragraf (Bab 1: 13, Bab 2: 11, Bab 6: 25, Penutup: 7). Sebagian besar berupa kalimat yang tanda bacanya hilang dan dua kalimat yang tersambung koma. Jumlah halaman tidak berubah (20, 21, 18, 9).

Yang memakai tafsiran sesi dan perlu dibaca tim:

- Bab 6 P0009: tujuan pembelajaran terpotong di "menentukan teknik pengumpulan"; sesi menambahkan kata "data", mengikuti butir berikutnya dan bunyi Sub-CPMK di Pendahuluan ("menentukan teknik pengumpulan & analisis data").
- Bab 1 P0047: "Sebagai mahasiswa vokasi, akan lebih sering berhadapan" menjadi "Mahasiswa vokasi akan lebih sering berhadapan" (kalimat asal tanpa subjek).
- Bab 2 P0104: deret tiga pertanyaan yang semula disambung titik koma dijadikan tiga kalimat tanya, dan kata "Terakhir," dibuang.
- Bab 6 P0171: "Batas 0,78 yang disebut di awal bagian ini" menjadi "pada bagian sebelumnya", karena angka itu ada di bagian Standar Validitas dan Reliabilitas Instrumen.
- Tujuh titik dua yang memisahkan dua kegiatan dalam sel tabel (Bab 1 P0040 dan enam di Penutup) dijadikan titik koma, seperti sel lain di tabel yang sama.

### Bab 1 (13 catatan)

| Paragraf | Jenis | Sebelum | Sesudah |
|---|---|---|---|
| P0040 | tanda baca | "gma, alasan) sebagai AM-1: berdiskusi kelompok." | "gma, alasan) sebagai AM-1; berdiskusi kelompok." |
| P0047 | kalimat rusak | "Sebagai mahasiswa vokasi, akan lebih sering berhad" | "Mahasiswa vokasi akan lebih sering berhad" |
| P0047 | tanda baca hilang | "ilah yang sering tertukar yaitu penelitian terapan" | "ilah yang sering tertukar, yaitu penelitian terapan" |
| P0047 | tanda baca hilang | "ni menggabungkan keduanya mahasiswa akan meneliti" | "ni menggabungkan keduanya: mahasiswa akan meneliti" |
| P0049 | kalimat rusak | "i produk atau sistem baru, inilah paradigma yang pali" | "i produk atau sistem baru. Inilah paradigma yang pali" |
| P0135 | kalimat tanya berakhir titik | "an mana yang harus diubah." | "an mana yang harus diubah?" |
| P0137 | kalimat rusak | "pai ke lorong. Itu gejala, masalahnya baru terlihat k" | "pai ke lorong. Itu gejala. Masalahnya baru terlihat k" |
| P0138 | tanda baca | "ke produk yang berlainan, bingkai pertama mengarah" | "ke produk yang berlainan: bingkai pertama mengarah" |
| P0141 | kata hilang | "eadaan mahasiswa magang, pada waktu yang sama menj" | "eadaan mahasiswa magang, yang pada waktu yang sama menj" |
| P0145 | huruf besar judul kolom | "Yang mahasiswa Lakukan" | "Yang Mahasiswa Lakukan" |
| P0050 | kalimat rusak | "langsung membuat aplikasi, mereka lebih dulu mengumpu" | "langsung membuat aplikasi. Mereka lebih dulu mengumpu" |
| P0071 | kalimat rusak | "n yang diteliti, kemudian pada penelitian kuantitatif m" | "n yang diteliti, kemudian penelitian kuantitatif m" |
| P0137 | tanda baca hilang | "isalnya, di loket layanan mahasiswa melihat antrea" | "isalnya, di loket layanan, mahasiswa melihat antrea" |

### Bab 2 (11 catatan)

| Paragraf | Jenis | Sebelum | Sesudah |
|---|---|---|---|
| P0014 | kalimat rusak | "rikut (pertemuan 3 dan 4), setiap aktivitas pembelaja" | "rikut (pertemuan 3 dan 4). Setiap aktivitas pembelaja" |
| P0027 | tanda baca hilang | "Mardapi, & Koehler, 2020) membimbing observasi lap" | "Mardapi, & Koehler, 2020); membimbing observasi lap" |
| P0055 | kalimat rusak | "ak dijadikan topik proyek, untuk menyaringnya gunakan tiga kriteria se" | "ak dijadikan topik proyek. Untuk menyaringnya, gunakan tiga kriteria se" |
| P0056 | tanda baca hilang | "awal pengajuan pinjaman" topik yang lebih layak," | "awal pengajuan pinjaman", topik yang lebih layak," |
| P0060 | tanda baca hilang | "dijadikan lensa tambahan apakah masalah yang diam" | "dijadikan lensa tambahan: apakah masalah yang diam" |
| P0078 | kata hilang | "uluan dapat dilakukan jika telah mengidentifikasi" | "uluan dapat dilakukan jika mahasiswa telah mengidentifikasi" |
| P0101 | tanda baca | "tiga hal untuk tiap pihak meliputi (1) apa yang ia kerjakan" | "tiga hal untuk tiap pihak: (1) apa yang ia kerjakan" |
| P0104 | tanda baca | "draf masing-masing tugas meliputi (1) topik disangka masal" | "draf masing-masing tugas: (1) topik disangka masal" |
| P0104 | tanda baca | "ir dengan tiga pertanyaan seperti (1) Apakah butir ini men" | "ir dengan tiga pertanyaan: (1) Apakah butir ini men" |
| P0104 | tanda baca | ""digitalisasi koperasi"?; (2) Apakah butir ini beb" | ""digitalisasi koperasi"? (2) Apakah butir ini beb" |
| P0104 | kalimat rusak | "menyamar sebagai masalah; dan (3) Terakhir, catatan atau dokumen mana" | "menyamar sebagai masalah. (3) Catatan atau dokumen mana" |

### Bab 6 (25 catatan)

| Paragraf | Jenis | Sebelum | Sesudah |
|---|---|---|---|
| P0009 | kata hilang | "tukan teknik pengumpulan" | "tukan teknik pengumpulan data" |
| P0027 | tanda baca hilang | "enurut Borg & Gall (2003) mendemonstrasikan penyus" | "enurut Borg & Gall (2003); mendemonstrasikan penyus" |
| P0070 | kalimat rusak | "ilai atau menguji sesuatu dalam konteks proyek penge" | "ilai atau menguji sesuatu. Dalam konteks proyek penge" |
| P0077 | tanda baca hilang | "bukan saling menggantikan instrumen yang reliabel" | "bukan saling menggantikan: instrumen yang reliabel" |
| P0099 | huruf besar | "perkembangan penyusunan Skala Likert mengangkat du" | "perkembangan penyusunan skala Likert mengangkat du" |
| P0099 | tanda baca hilang | "ng berguna pada tahap ini yaitu definisi konstruk" | "ng berguna pada tahap ini, yaitu definisi konstruk" |
| P0123 | bentuk terikat | "analisis statistik pasca-pengumpulan data. Setiap" | "analisis statistik pascapengumpulan data. Setiap" |
| P0126 | huruf besar dan tanda baca | "nya dijawab dengan skala likert yaitu deret pilihan bert" | "nya dijawab dengan skala Likert, yaitu deret pilihan bert" |
| P0145 | bentuk terikat | "Kesepakatan antar-validator atau uji coba u" | "Kesepakatan antarvalidator atau uji coba u" |
| P0152 | kalimat rusak | "umum, bukan angka mutlak dosen pengampu tetap berwe" | "umum, bukan angka mutlak. Dosen pengampu tetap berwe" |
| P0175 | kata baku | "enyusunan daftar pustaka baiknya menggunakan aplik" | "enyusunan daftar pustaka sebaiknya menggunakan aplik" |
| P0027 | kata hilang | "serta prinsip validitas reliabilitas menurut Borg" | "serta prinsip validitas dan reliabilitas menurut Borg" |
| P0127 | kalimat rusak | "100%. Sebagai ilustrasi, tiga validator menilai d" | "100%. Sebagai ilustrasi, bila tiga validator menilai d" |
| P0127 | kalimat rusak | "dengan skor tertinggi 5, maka skor maksimumnya 3 × 8 ×" | "dengan skor tertinggi 5, skor maksimumnya 3 × 8 ×" |
| P0131 | kata hilang | "rupakan salah satu faktor paling konsisten menentu" | "rupakan salah satu faktor yang paling konsisten menentu" |
| P0171 | rujukan bagian keliru | "Batas 0,78 yang disebut di awal bagian ini memberi keputusan yang s" | "Batas 0,78 yang disebut pada bagian sebelumnya memberi keputusan yang s" |
| P0025 | huruf besar | "Menit" | "menit" |
| P0030 | huruf besar | "Menit" | "menit" |
| P0035 | huruf besar | "Menit" | "menit" |
| P0041 | huruf besar | "Menit" | "menit" |
| P0046 | huruf besar | "Menit" | "menit" |
| P0051 | huruf besar | "Menit" | "menit" |
| P0057 | huruf besar | "Menit" | "menit" |
| P0062 | huruf besar | "Menit" | "menit" |
| P0067 | huruf besar | "Menit" | "menit" |

### Penutup (7 catatan)

| Paragraf | Jenis | Sebelum | Sesudah |
|---|---|---|---|
| P0004 | titik akhir | "dasar pengembangan modul" | "dasar pengembangan modul." |
| P0013 | tanda baca | "t/mendalam tiap mahasiswa: memandu diskusi kasus pa" | "t/mendalam tiap mahasiswa; memandu diskusi kasus pa" |
| P0016 | tanda baca | "ervasi/wawancara lapangan: memverifikasi kelayakan" | "ervasi/wawancara lapangan; memverifikasi kelayakan" |
| P0019 | tanda baca | "atas draf bab pendahuluan: memfasilitasi peer revie" | "atas draf bab pendahuluan; memfasilitasi peer revie" |
| P0028 | tanda baca | "eknik penelusuran pustaka: memeriksa outline kajian" | "eknik penelusuran pustaka; memeriksa outline kajian" |
| P0031 | tanda baca | "ng sesuai karakter proyek: memvalidasi skema valida" | "ng sesuai karakter proyek; memvalidasi skema valida" |
| P0034 | tanda baca | "cana teknik analisis data: memastikan kesesuaian de" | "cana teknik analisis data; memastikan kesesuaian de" |

### Yang sengaja tidak diubah pada putaran kedua

- Bab 6 P0184 "Dikirim melalui menu Mini Projek di Smart Flip 5.0." (kalimat tanpa subjek): kalimat yang sama ada di Bab 3 dan Bab 4, dan pada #217 ketiganya sengaja dijaga satu bentuk. Diubah bersama atau tidak sama sekali.
- Lima kalimat yang maknanya perlu diputuskan tim: Bab 1 P0053 ("Pembedaan paradigma penelitian-penelitian sebelumnya lebih dari kategorisasi akademik"), Bab 1 P0081 ("berbasis proyek nyata pada Bab 1", mungkin "sejak Bab 1"), Bab 1 P0135 ("rancangan pertama saya, agar pengembang tahu"), Bab 2 P0101 ("terhambat oleh sumber daya yang terbatas dan dukungan pemangku kepentingan"), dan istilah "Tes Formatif" berdampingan dengan "Kuis Formatif".
- Bab 6 P0126: koma sesudah "Likert" ikut tercetak miring. Tidak dikerjakan: nyaris tidak tampak.
- Sekitar 45 soal gaya (taksiran pemeriksa): butir Aktivitas Mandiri tanpa titik akhir, "di mana" sebagai kata sambung, "vs", dan sisa kata "mahasiswa" pengganti "Anda" yang terasa kaku.
- Penutup menyebut "ADDIE/4D" di tiga tempat, sedangkan Bab 5 sekarang membahas tujuh model. Isi, bukan salah ketik.

### Pemeriksa akhir putaran kedua

Satu agen model opus, hanya membaca. Ia menjalankan ulang `cek223.py`, membandingkan dengan skrip sendiri (teks, struktur, format per huruf), membaca tiap pembetulan, membaca penuh keempat berkas, membuka PDF, dan membuat 10 berkas uji di `periksa/`.

| Sanggahan | Nasib |
|---|---|
| Sembilan salah nyata masih tertinggal sesudah sesi membaca penuh (dua kalimat tersambung koma, kata hilang, "Menit" berhuruf besar di sembilan sel Bab 6, dan lain-lain) | Delapan dibetulkan dan masuk daftar di atas; satu dibiarkan (Bab 6 P0184, lihat di atas) |
| Bab 2 P0104 sesudah pembetulan masih memuat tanda tanya yang diikuti titik koma | Diterima. Deret dijadikan tiga kalimat tanya |
| Bab 2 P0055: 17 huruf pindah dari run berwarna hitam tertulis ke run tanpa warna | Tidak tampak di cetakan (keduanya hitam). Pembanding kini menyamakan hitam tertulis dengan warna bawaan, sehingga daftar pengecualian dikosongkan |
| `cek223.py` meloloskan 2 dari 10 berkas uji: atribut penjaga spasi dibuang, dan huruf dipindah di paragraf yang masuk daftar pengecualian | Diterima. Pembanding kini memeriksa spasi tepi dan tidak punya pengecualian; uji ulang sesi untuk keduanya tertangkap |
| Bab 6 P0009: kata "data" adalah tebakan atas rumusan capaian dari RPS | Dibiarkan sebagai tafsiran yang ditandai di atas; tim perlu mengiyakan |
| Bab 6 P0126: koma sisipan ikut miring | Tidak dikerjakan (sepele) |
| "baiknya" menjadi "sebaiknya" dicatat sebagai salah ketik | Diterima. Jenisnya dicatat sebagai kata baku |

Pembetulan sesudah pemeriksa tidak diperiksa agen lagi; sesi membacanya satu per satu dan menjalankan ulang pembanding. Yang tidak diperiksa pemeriksa: tampilan PDF dengan mata, daftar rujukan, rumusan capaian di RPS, dan sel tabel yang sangat pendek.

Cara memeriksa ulang, dari `.claude/cadangan-223/`: `python cek223.py asal hasil` harus berakhir `SEMUA LOLOS`.

## Putaran ketiga: keputusan isi (antrean #223 sisa, 18 Okt 2026)

Johan menyerahkan pertanyaan isi yang tertunda ke rekomendasi sesi: "sesuaikan dengan rekomendasimu yang mana baik nya" (18 Okt 2026). Skrip dan cadangan ada di `.claude/cadangan-227/`. Berkas asal putaran ini adalah naskah 12 Okt (md5 sama dengan salinan terakhir yang ditulis sesi). Jumlah: 38 penggantian teks di 7 berkas (Pendahuluan 18, Bab 1: 4, Bab 2: 1, Bab 3: 1, Bab 4: 1, Bab 6: 2, Penutup 10). Jumlah halaman tidak berubah. Bab 5 tidak disentuh.

| Pertanyaan | Keputusan | Alasan |
|---|---|---|
| Nama mata kuliah di Pendahuluan P0029, P0049 | "Metode Penelitian dan Pengembangan Proyek" | Tiga paragraf lain di Pendahuluan, dua di Penutup, dan sampul memakai nama itu. Aplikasi memakai "Metode Penelitian dan Pengembangan" tanpa "Proyek". P0049 mengutip judul RPS; judul resmi RPS belum dicocokkan |
| Sub CPMK, Sub-CPMK, sub CPMK | "Sub-CPMK" di semua tempat (8 di Pendahuluan, 2 di Penutup) | Bentuk berstrip dipakai panduan penyusunan kurikulum pendidikan tinggi |
| "Tabel Bagian 1.1" di Pendahuluan | "Tabel 1.1" | Tiga tabel sesudahnya bernomor 1.2 sampai 1.4 dan gambar di berkas yang sama bernomor 1.1, 1.2. Nomornya kembar dengan Tabel 1.1 di Bab 1, sama seperti gambarnya; Penutup memakai pola lain ("Tabel Bagian III.n") |
| "Gambar 2.0 (Bagian II)" di Penutup P0076 | Rujukan gambar dibuang: "roadmap enam bab pada Bagian II" | Gambar itu tidak ada di delapan berkas |
| Judul bernomor 1 sampai 10 di Bab 5 | Dibiarkan | Teks Bab 5 P0133 merujuk "bagian 1" dan "bagian 2"; berkasnya juga sedang dibuka di Word saat dikerjakan |
| Bab 1 P0053 | "Pembedaan paradigma penelitian bukan sekadar urusan kategorisasi akademik." | Kalimat lanjutannya (Creswell) menjelaskan bahwa paradigma mengikuti sifat masalah |
| Bab 1 P0081 | "berbasis proyek nyata sejak Bab 1" | Lanjutan kalimat: "alih-alih menunda praktik hingga akhir semester" |
| Bab 1 P0135 | "agar saya tahu bagian mana yang harus diubah?" | Dua pertanyaan sebelumnya memakai "saya" |
| Bab 2 P0101 | "sumber daya yang terbatas dan kurangnya dukungan pemangku kepentingan" | Kalimat sesudahnya menyuruh meminta izin uji coba sejak awal |
| Tes Formatif dan Kuis Formatif | "Tes Formatif" (13 tempat diganti, termasuk "hasil kuis" menjadi "hasil tes" dan satu "Tes formatif Bab 2" menjadi huruf besar) | Aplikasi hanya memakai "Tes Formatif"; di tujuh berkas asal ada 21 "Tes Formatif" dan 13 "kuis" |
| Kalimat "Dikirim melalui menu Mini Projek" di Bab 3, 4, 6 | "Berkas Bab 1 proposal itu dikirim", "Berkas Bab 2 proposal itu dikirim", "Berkas Bab 3 proposal itu dikirim" | Semula "Berkas ini dikirim"; pemeriksa menunjukkan "berkas" terdekat di Bab 4 dan 6 adalah berkas AM yang justru tidak diunggah |
| "ADDIE/4D" dan "ADDIE vs 4D" di Penutup P0031, P0052, P0097 dan Bab 6 P0091 | "(model di Bab 5)", "model-model pengembangan di Bab 5", "(model pengembangan, Bab 5)" | Bab 5 kini membahas tujuh model; Bab 5 P0009 menulis "ADDIE, 4D, atau model lain" |

Lima tafsiran putaran kedua (Bab 6 P0009 "data", Bab 1 P0047, Bab 2 P0104, Bab 6 P0171, tujuh titik koma di tabel) dibiarkan.

Pemeriksa akhir (1 agen opus) memeriksa versi pertama: klaim pembanding, sisa bentuk lama, dan halaman benar; 5 sanggahan. Diterima dan diperbaiki: "Berkas ini" yang ambigu di Bab 4 dan 6, "satu dari tujuh model" yang lebih sempit dari Bab 5 (jadi "model di Bab 5"), "Tes formatif Bab 2" huruf kecil, angka hitungan Tes/Kuis dan alasan nama di aplikasi (dibetulkan di tabel ini), serta pengecekan sisa yang tidak menghentikan skrip (kini keluar dengan galat bila ada sisa). Ditolak: penomoran "Tabel Bagian I.n" untuk Pendahuluan, karena gambar Pendahuluan juga bernomor 1.n dan Penutup sudah merujuknya sebagai "Gambar 1.2 (Bagian I)".

Cara memeriksa ulang, dari `.claude/cadangan-227/`: `python cek227.py asal hasil` harus berakhir `SEMUA LOLOS`, dan `python betul227.py asal <folder-baru>` keluar tanpa baris "sisa".
