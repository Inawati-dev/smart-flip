# Daftar perubahan sapuan naskah (antrean #216 dan #217)

Disusun 11 Okt 2026 dari `usul/<kode>.json` dan keluaran `proses217.py` di `.claude/cadangan-217/` pada worktree sesi. Sesudah sapuan ini seluruh teks isi berwarna hitam, jadi daftar ini satu-satunya tempat melihat kalimat mana yang diubah. Berkas sebelum sapuan (masih berwarna merah dan biru) ada di `.claude/cadangan-217/asal/`.

Dua putaran, masing-masing 8 agen `sonnet`, satu berkas satu agen, hanya membaca. Putaran pertama memakai daftar pola Indonesia (`BRIEF-HUMANIZER.md`, `kemampuan-core.md` §CORE-221): 62 usulan. Putaran kedua mewajibkan agen memanggil skill `humanizer:humanizer` (versi 2.11.2, `BRIEF-HUMANIZER-2.md`): 44 usulan; kedelapan agen melaporkan skill itu terpanggil dan terbaca. Sesi meninjau tiap usulan, lalu dua pemeriksa (model opus) membaca hasilnya. Sesudah tinjauan dan dua pemeriksaan, yang diterapkan 56 kalimat dari putaran pertama dan 34 dari putaran kedua. Usulan asli agen ada di `usul-agen/` dan `usul2-agen/`.

## Ringkasan per berkas

| Berkas | Kalimat diubah | Paragraf badan dijadikan rata kiri-kanan | Paragraf tabel dijadikan 11 pt | Paragraf tabel dijadikan spasi 1,5 | Run dijadikan hitam | Sampul |
|---|---|---|---|---|---|---|
| Pendahuluan | 6 | 0 | 151 | 151 | 0 | sampul depan dibuat di seksi sendiri, sampul belakang ditambah |
| Bab 1 | 21 | 0 | 90 | 0 | 111 | sampul depan diganti, sampul belakang ditambah |
| Bab 2 | 10 | 0 | 79 | 0 | 137 | sampul depan diganti, sampul belakang ditambah |
| Bab 3 | 14 | 0 | 0 | 0 | 172 | sampul depan diganti, sampul belakang ditambah |
| Bab 4 | 16 | 0 | 3 | 0 | 193 | sampul depan diganti, sampul belakang ditambah |
| Bab 5 | 9 | 0 | 114 | 0 | 329 | sampul depan diganti, sampul belakang ditambah |
| Bab 6 | 7 | 0 | 111 | 0 | 168 | sampul depan diganti, sampul belakang ditambah |
| Penutup | 7 | 0 | 163 | 59 | 0 | sampul depan dibuat di seksi sendiri, sampul belakang ditambah |

Angka "paragraf tabel dijadikan 11 pt" ikut menghitung paragraf yang hurufnya sudah 11 pt tetapi tanda akhir paragrafnya belum.

## Pendahuluan: 6 kalimat

| Paragraf | Pola | Sebelum | Sesudah |
|---|---|---|---|
| P0007 | bukan sekadar | bukan sekadar alat ukur nilai akhir semata. | sehingga fungsinya tidak berhenti pada pengukuran nilai akhir. |
| P0007 | kata kerja penilai | menegaskan bahwa SDL | menyatakan bahwa SDL |
| P0013 | penghubung pembuka | Selanjutnya pada setiap akhir bab | Pada setiap akhir bab |
| P0009 | putaran 2, skill: 8 menghindari is/are; 23 frasa isian (dengan tujuan untuk) | merupakan alur berfikir yang diterapkan dalam modul ini dengan tujuan untuk memudahkan | adalah alur berfikir yang diterapkan dalam modul ini untuk memudahkan |
| P0029 | putaran 2, skill: 8 menghindari is/are; 11 pengulangan pembuka kalimat | Mata kuliah ini merupakan salah satu mata kuliah yang diturunkan dari CPL Program Studi: | Mata kuliah ini diturunkan dari CPL Program Studi: |
| P0097 | putaran 2, skill: 8 menghindari is/are (memberikan gambaran umum) | sedangkan tabel ini memberikan gambaran umum keterkaitan antara pertemuan | sedangkan tabel ini merangkum keterkaitan antara pertemuan |

## Bab 1: 21 kalimat

| Paragraf | Pola | Sebelum | Sesudah |
|---|---|---|---|
| P0012 | kata pembesar (fondasi) | Bab ini merupakan fondasi dalam membuat | Bab ini menjadi dasar dalam membuat |
| P0049 | penghubung pembuka | Sementara itu, R&D adalah | R&D adalah |
| P0049 | bukan sekadar | bukan sekadar laporan temuan | dan laporan temuan saja belum cukup |
| P0053 | bukan sekadar | bukanlah sekadar kategorisasi akademik semata | lebih dari kategorisasi akademik |
| P0053 | kata kerja penilai | menegaskan bahwa pemilihan | menyatakan bahwa pemilihan |
| P0053 | semata | dengan angka semata | dengan angka saja |
| P0054 | bukan sekadar, melainkan | mahasiswa bukan sekadar materi impor dari luar negeri, melainkan arah riset yang aktif dikembangkan di lingkungan kampus sendiri, | mahasiswa, selain datang dari luar negeri, juga menjadi arah riset yang aktif dikembangkan di lingkungan kampus sendiri, |
| P0055 | kata kerja penilai | menekankan bahwa paradigma | menulis bahwa paradigma |
| P0055 | bukan sekadar | bukan sekadar simpulan naratif | tidak berhenti pada simpulan naratif |
| P0080 | bukan sekadar, melainkan; kata kerja penilai | Skala ini menegaskan bahwa kompetensi merumuskan masalah nyata dan mengembangkan solusi berbasis R&D bukan sekadar muatan satu mata kuliah di satu kampus, melainkan kebutuhan keterampilan yang relevan bagi ratusan ribu lulusan vokasi yang akan memasuki dunia kerja setiap tahunnya. | Skala ini berarti kompetensi merumuskan masalah nyata dan mengembangkan solusi berbasis R&D dibutuhkan ratusan ribu lulusan vokasi yang akan memasuki dunia kerja setiap tahunnya, sehingga cakupannya melampaui satu mata kuliah di satu kampus. |
| P0081 | kata kerja penilai | turut menegaskan bahwa | juga menyatakan bahwa |
| P0081 | bukan sekadar | , bukan sekadar menguasai teori |  dan tidak hanya menguasai teori |
| P0081 | penunjuk kabur; kata kerja penilai | Hal ini memperkuat | Temuan ini mendukung |
| P0083 | kata pembesar (krusial) | langkah awal yang krusial | langkah awal yang penting |
| P0117 | bukan sekadar | Agar dapat meyakinkan mahasiswa bahwa paradigma R&D bukan sekadar materi teoretis di kelas, penting disampaikan bahwa | Agar mahasiswa yakin bahwa paradigma R&D lebih dari materi teoretis di kelas, perlu disampaikan bahwa |
| P0118 | bukan sekadar, melainkan | bukan sekadar tugas kuliah, melainkan berpotensi menyumbang pada arus keilmuan yang sedang aktif berkembang, | berpotensi menyumbang pada arus keilmuan yang sedang aktif berkembang dan tidak berhenti sebagai tugas kuliah, |
| P0054 | putaran 2, skill: 1 klaim penting dibesar-besarkan / 32 ungkapan berbentuk pepatah | berpeluang menyumbang pada percakapan keilmuan yang sama | berpeluang menyumbang pada penelitian di bidang yang sama |
| P0055 | putaran 2, skill: 1 klaim penting dibesar-besarkan / 8 menghindari 'adalah' | Pemahaman ini menjadi jembatan penting menuju Bab 5 | Pemahaman ini menjadi jembatan menuju Bab 5 |
| P0071 | putaran 2, skill: 23 frasa pengisi (pengulangan tanpa isi) | Meskipun ketiga jenis penelitian tersebut memiliki tujuan yang berbeda akan tetapi masih saling berkaitan satu sama lain, keterkaitan ketiga jenis penelitian tersebut dapat dilihat pada gambar 1.1 berikut. | Meskipun tujuan ketiga jenis penelitian itu berbeda, ketiganya saling berkaitan, seperti terlihat pada gambar 1.1 berikut. |
| P0076 | putaran 2, skill: 28 mengumumkan poin berikutnya | Sebagai ilustrasi konkret, perhatikan dua pertanyaan berikut yang tampak mirip namun menuntut paradigma berbeda: | Dua pertanyaan berikut tampak mirip namun menuntut paradigma berbeda: |
| P0080 | putaran 2, skill: 1 klaim dibesar-besarkan / 23 pengisi | Data kelembagaan menunjukkan betapa besarnya skala pendidikan tinggi vokasi di Indonesia yang menjadi konteks penerapan paradigma R&D ini. | Data kelembagaan menunjukkan skala pendidikan tinggi vokasi di Indonesia yang menjadi konteks penerapan paradigma R&D ini. |

## Bab 2: 10 kalimat

| Paragraf | Pola | Sebelum | Sesudah |
|---|---|---|---|
| P0059 | bukan semata, melainkan | Mengidentifikasi masalah secara tepat bukan tahap administratif semata, melainkan penentu kualitas seluruh proyek. | Ketepatan mengidentifikasi masalah menentukan kualitas seluruh proyek. |
| P0059 | bukan sekadar | , bukan sekadar keluhan sesaat yang | , dan tidak berhenti pada keluhan sesaat yang |
| P0110 | bukan sekadar, melainkan; penghubung pembuka | Oleh karena itu, latihan pada Bab 2 ini bukan sekadar tugas administratif mata kuliah, melainkan simulasi | Latihan pada Bab 2 ini adalah simulasi |
| P0107 | kata pembesar | benar-benar signifikan atau hanya | benar-benar penting atau hanya |
| P0130 | kata pembesar | kesenjangan yang signifikan | kesenjangan yang lebar |
| P0060 | putaran 2, skill: 23 filler phrases (juga sekaligus) | juga sekaligus melatih | sekaligus melatih |
| P0078 | putaran 2, skill: 23 filler phrases | Adapun beberapa tahapan yang perlu diperhatikan dan dilakukan dalam melakukan identifikasi masalah | Tahapan yang perlu diperhatikan dan dilakukan dalam identifikasi masalah |
| P0085 | putaran 2, skill: 11 repeating sentence openings | Kalimat ini menjadi kepala ikan | Masalah awal itu menjadi kepala ikan |
| P0107 | putaran 2, skill: 23 filler phrases (hanya ... semata) | hanya persepsi subjektif mahasiswa semata | hanya persepsi subjektif mahasiswa |
| P0129 | putaran 2, skill: 28 announcing the next point | Data menjadi penting di sini: Badan Pusat Statistik (2024) mencatat | Badan Pusat Statistik (2024) mencatat |

## Bab 3: 14 kalimat

| Paragraf | Pola | Sebelum | Sesudah |
|---|---|---|---|
| P0075 | lebih dari sekadar | memerlukan lebih dari sekadar kemampuan berbahasa, hal ini memerlukan kedisiplinan | memerlukan kemampuan berbahasa dan juga kedisiplinan |
| P0075 | kata kerja penilai | menekankan bahwa pernyataan masalah | menulis bahwa pernyataan masalah |
| P0098 | kata kerja penilai | menekankan bahwa latar belakang yang baik harus membangun | menyatakan bahwa latar belakang yang baik harus membangun |
| P0098 | bukan sekadar | , bukan sekadar kumpulan fakta yang berdiri sendiri-sendiri. | , dan tidak berhenti pada kumpulan fakta yang berdiri sendiri-sendiri. |
| P0156 | bukan sekadar | selalu didukung data, bukan sekadar asumsi. | selalu didukung data, bukan asumsi. |
| P0069 | kata kerja penilai | data pendukung yang memperkuat bahwa masalah ini nyata | data pendukung yang menunjukkan masalah ini nyata |
| P0077 | kata kerja penilai | yang menegaskan bahwa tujuan | yang menyatakan bahwa tujuan |
| P0106 | kata kerja penilai | menekankan bahwa kejelasan | menulis bahwa kejelasan |
| P0011 | putaran 2, skill: 1 klaim penting dibesar-besarkan / 24 penguat berlebih | Kualitas Bab 3 akan sangat memengaruhi bagaimana | Kualitas Bab 3 memengaruhi bagaimana |
| P0106 | putaran 2, skill: 1 klaim penting dibesar-besarkan | padahal ia adalah jembatan penting yang menghubungkan | padahal ia adalah jembatan yang menghubungkan |
| P0106 | putaran 2, skill: 24 penguat berlebih | akan sangat menentukan kualitas instrumen | menentukan kualitas instrumen |
| P0107 | putaran 2, skill: 24 penguat berlebih | Definisi sekonkret ini akan sangat memudahkan penyusunan | Definisi sekonkret ini memudahkan penyusunan |
| P0125 | putaran 2, skill: 28 mengumumkan poin berikutnya | Dua istilah berbahasa Inggris perlu dibedakan sebelum mahasiswa menulis bagian ini. Coker (2022) membedakannya: | Coker (2022) membedakan dua istilah berbahasa Inggris yang perlu dipahami sebelum mahasiswa menulis bagian ini: |
| P0156 | putaran 2, skill: 3 analisis dangkal di ekor kalimat / 4 bahasa berbunga | mengindikasikan derasnya arus digitalisasi usaha di berbagai sektor | mengindikasikan digitalisasi usaha yang berlangsung cepat di berbagai sektor |

## Bab 4: 16 kalimat

| Paragraf | Pola | Sebelum | Sesudah |
|---|---|---|---|
| P0052 | bukan sekadar; kata kerja penilai (menunjukkan bahwa) | yang menunjukkan bahwa proyek mahasiswa dibangun di atas pengetahuan yang sudah teruji, bukan sekadar opini pribadi. | yang menunjukkan bahwa proyek mahasiswa dibangun di atas pengetahuan yang sudah teruji, bukan di atas opini pribadi. |
| P0054 | bukan sekadar | , bukan sekadar menempelkan kutipan satu per satu. | , bukan menempelkan kutipan satu per satu. |
| P0055 | tidak hanya X, tetapi juga Y | tidak hanya mengutip teori antrean dari buku manajemen operasi, tetapi juga merujuk laporan | mengutip teori antrean dari buku manajemen operasi dan juga merujuk laporan |
| P0057 | bukan sekadar X, melainkan Y | Kajian pustaka yang baik bukan sekadar kumpulan kutipan, melainkan hasil pemetaan yang menunjukkan posisi proyek mahasiswa di antara pengetahuan yang sudah ada. | Kajian pustaka yang baik adalah hasil pemetaan yang menunjukkan posisi proyek mahasiswa di antara pengetahuan yang sudah ada, dan kumpulan kutipan saja belum cukup. |
| P0058 | kata kerja penilai (menekankan) | yang menekankan bahwa parafrase harus | yang menyatakan bahwa parafrase harus |
| P0079 | bukan sekadar | , bukan sekadar mengetik judul topik secara umum yang menghasilkan ribuan hasil tidak relevan. | , sedangkan mengetik judul topik secara umum saja menghasilkan ribuan hasil tidak relevan. |
| P0082 | bukan sekadar X, melainkan Y | Kajian pustaka yang baik bukan sekadar menyusun kutipan dari berbagai sumber secara berurutan ("Menurut pendapat A... Menurut pendapat B... Menurut pendapat C..."), melainkan mensintesiskan temuan-temuan tersebut menjadi argumen yang koheren. | Kajian pustaka yang baik tidak cukup menyusun kutipan dari berbagai sumber secara berurutan ("Menurut pendapat A... Menurut pendapat B... Menurut pendapat C..."); kajian itu mensintesiskan temuan-temuan tersebut menjadi argumen yang koheren. |
| P0084 | kata pembesar (mendalam, mengulang dalami) | saring dengan kriteria jelas, baru kemudian dalami sumber-sumber yang tersisa secara mendalam. | saring dengan kriteria jelas, baru kemudian dalami sumber-sumber yang tersisa. |
| P0110 | kata kerja penilai (menjembatani) | yang dipakai untuk menjembatani membaca dan menulis | yang dipakai untuk menghubungkan membaca dan menulis |
| P0139 | kata pembesar (signifikan) | menunjukkan lonjakan signifikan pada 2022 | menunjukkan lonjakan pada 2022 |
| P0011 | putaran 2, skill: 9 negasi menggantung di ujung kalimat (bukan asal pilih mengulang makna berdasar) | terasa masuk akal dan berdasar, bukan asal pilih. | terasa masuk akal dan berdasar. |
| P0052 | putaran 2, skill: 1 klaim pentingnya sesuatu tanpa isi (fungsinya jauh lebih penting) | padahal fungsinya jauh lebih penting: kajian pustaka adalah landasan berpikir | padahal kajian pustaka adalah landasan berpikir |
| P0054 | putaran 2, skill: 1 klaim penting yang menumpuk dengan 'wajib' | Dua keterampilan penting yang wajib dikuasai di sini | Dua keterampilan yang wajib dikuasai di sini |
| P0082 | putaran 2, skill: 23 isian dan pagar berlebih (secara alami, akan) | akan secara alami mengarah pada kesimpulan | mengarah pada kesimpulan |
| P0137 | putaran 2, skill: 28 mengumumkan poin berikutnya alih-alih menyatakannya | Periksa satu hal: setiap kotak harus dapat ditelusuri | Setiap kotak harus dapat ditelusuri |
| P0139 | putaran 2, skill: 11 pengulangan pembuka paragraf (Kajian pustaka yang baik, sudah dipakai P0057 dan P0082) | Kajian pustaka yang baik juga perlu memperhatikan tren | Kajian pustaka juga perlu memperhatikan tren |

## Bab 5: 9 kalimat

| Paragraf | Pola | Sebelum | Sesudah |
|---|---|---|---|
| P0059 | bukan semata | Pemilihan model pengembangan sebaiknya juga mempertimbangkan bukti efektivitas dari riset terdahulu, bukan semata preferensi pribadi. | Selain preferensi pribadi, pemilihan model pengembangan sebaiknya mempertimbangkan bukti efektivitas dari riset terdahulu. |
| P0166 | bukan sekadar | bukan sekadar kesan subjektif tanpa skala yang jelas | bukan berupa kesan subjektif tanpa skala yang jelas |
| P0166 | kata kerja penilai | menekankan pentingnya validasi konten | menyatakan bahwa validasi konten penting dilakukan |
| P0060 | penghubung pembuka | Sementara itu, kajian oleh Adelowo | Kajian oleh Adelowo |
| P0011 | putaran 2, skill: 1 klaim penting dibesar-besarkan (titik penentu) dan 8 menghindari is/are | Bab ini adalah titik penentu model yang akan digunakan, pilihan model pengembangan | Di bab ini mahasiswa menentukan model yang akan digunakan. Pilihan model pengembangan |
| P0060 | putaran 2, skill: 3 analisis dangkal di ekor kalimat (menjadikannya) | sehingga mudah disesuaikan dengan berbagai konteks belajar, menjadikannya pilihan tepat untuk proyek | sehingga mudah disesuaikan dengan berbagai konteks belajar dan cocok untuk proyek |
| P0094 | putaran 2, skill: 13 pasif tanpa pelaku yang jelas | Keterbatasannya dicatat Aleem dkk. (2016): | Aleem dkk. (2016) mencatat keterbatasannya: |
| P0098 | putaran 2, skill: 11 pengulangan pembuka kalimat | Mereka mencatat bahwa ukuran proyek yang relatif kecil ikut mendukung keberhasilan itu. Mereka juga menyebut risikonya: | Mereka mencatat bahwa ukuran proyek yang relatif kecil ikut mendukung keberhasilan itu, dan juga menyebut risikonya: |
| P0170 | putaran 2, skill: 28 mengumumkan poin berikutnya alih-alih menyatakannya | Ada satu risiko yang perlu mahasiswa hindari, yaitu validasi yang hanya memeriksa sisi teknis. | Mahasiswa perlu menghindari validasi yang hanya memeriksa sisi teknis. |

## Bab 6: 7 kalimat

| Paragraf | Pola | Sebelum | Sesudah |
|---|---|---|---|
| P0073 | penghubung pembuka (Selain itu) | Selain itu, mereka juga mewawancarai | Mereka juga mewawancarai |
| P0077 | kata kerja penilai (menegaskan) | Borg dan Gall (2003) menegaskan bahwa | Borg dan Gall (2003) menyatakan bahwa |
| P0123 | kata kerja penilai (menegaskan) | Luque-Vara dkk. (2020) menegaskan bahwa | Luque-Vara dkk. (2020) menyatakan bahwa |
| P0078 | atribusi kabur (banyak studi) | banyak studi pengembangan produk pendidikan di lingkup vokasi menggunakan | pengembangan produk pendidikan di lingkup vokasi sering menggunakan |
| P0132 | bukan sekadar + penghubung pembuka (Dengan demikian) | Dengan demikian, kemampuan merancang instrumen sederhana dan mengolah datanya menjadi rekomendasi konkret pada Bab 6 ini bukan sekadar keterampilan akademik semata, melainkan salah satu bentuk employability skill | Kemampuan merancang instrumen sederhana dan mengolah datanya menjadi rekomendasi konkret pada Bab 6 ini adalah keterampilan akademik sekaligus salah satu bentuk employability skill |
| P0077 | putaran 2, skill: 27 pura-pura membuka kebenaran yang lebih dalam (kata 'sesungguhnya') | Prinsip validitas dan reliabilitas sesungguhnya menjawab dua pertanyaan berbeda | Prinsip validitas dan reliabilitas menjawab dua pertanyaan berbeda |
| P0152 | putaran 2, skill: 23 frasa isian ('sifatnya adalah') | Ambang batas ini sifatnya adalah panduan umum | Ambang batas ini berupa panduan umum |

## Penutup: 7 kalimat

| Paragraf | Pola | Sebelum | Sesudah |
|---|---|---|---|
| P0050 | bukan sekadar | menilai kredibilitas sumber, bukan sekadar menyalin dari mesin pencari umum | menilai kredibilitas sumber dan tidak menyalin begitu saja dari mesin pencari umum |
| P0076 | bukan sekadar | utuh, bukan sekadar kumpulan tugas mingguan yang terpisah dan siap | utuh, bukan kumpulan tugas mingguan yang terpisah, dan siap |
| P0177 | bukan sekadar; kata pembesar (mendalam) | menunjukkan pemahaman mendalam, bukan sekadar membaca naskah | menunjukkan pemahaman mendalam, tidak hanya membaca naskah |
| P0077 | pembuka/penutup manis (secara keseluruhan) | memantau kelengkapan proposal secara keseluruhan. | memantau kelengkapan proposal. |
| P0120 | kata pembesar (signifikan) | Kesenjangan yang signifikan antara | Kesenjangan yang besar antara |
| P0075 | putaran 2, skill: 1 klaim pentingnya yang dibesar-besarkan (kata 'penting' tanpa isi) | satu bagian penting dari proposal akhir | satu bagian dari proposal akhir |
| P0103 | putaran 2, skill: 9 pasangan negasi 'bukan X melainkan Y' | Refleksi ini bukan penentu nilai akhir, melainkan alat bantu metakognitif agar mahasiswa menyadari bagian proposal mana yang masih perlu diperkuat sebelum presentasi UAS. | Refleksi ini tidak menentukan nilai akhir, tetapi berfungsi sebagai alat bantu metakognitif agar mahasiswa menyadari bagian proposal mana yang masih perlu diperkuat sebelum presentasi UAS. |

Jumlah kalimat diubah di delapan berkas: 90.

Nomor paragraf mengikuti `teks/<kode>.txt` (paragraf berteks di badan, di luar daftar isi, dihitung dari awal berkas).

## Yang sengaja tidak diubah

- Judul bab dan subbab, keterangan tabel dan gambar, baris sumber, dan daftar rujukan.
- Tiga tempat yang masih terjaring `cek_pola_ai.py` sebagai pola keras: contoh tujuan di dalam tanda petik di Bab 3 ("... secara keseluruhan"); judul subbab Bab 4 "Menyusun Sintesis, Bukan Sekadar Kumpulan Kutipan" beserta barisnya di daftar isi; kalimat Lu dkk. (2022) di Bab 5 yang memuat "banyak penelitian kegunaan" dengan rujukan di kalimat yang sama.
- Kata "Anda" di Bab 2 (contoh pertanyaan wawancara, menyapa orang yang diwawancarai).
- Sorotan kuning di tabel rincian pertemuan Pendahuluan (9 potong teks).
- Komentar tim: 9 di Bab 5, 1 di Bab 6.
- Warna kop bab dan kaki halaman; kotak satu sel (pertanyaan reflektif, studi kasus); perataan daftar rujukan (rata kiri, seperti semula); indent baris pertama.
- Salah ketik lama yang dilaporkan agen dan pemeriksa (antrean #221).

## Pemeriksa akhir

Dua pemeriksa model opus, hanya membaca. Keduanya menjalankan ulang `cek217.py` dan `cek_pola_ai.py`, membandingkan asal dan hasil dengan skrip sendiri, membaca tiap kalimat yang diubah di dalam paragrafnya, memotret halaman PDF, dan membuat berkas uji sendiri (`periksa/` dan `periksa2/`).

| Sanggahan | Nasib |
|---|---|
| Putaran pertama: makna bergeser di enam kalimat (b1 P0054, b3 P0104, b5 P0200, b6 P0078, p9 P0177, b4 P0082) | Diterima. Empat ditulis ulang, dua dikembalikan ke teks asal |
| Putaran pertama: pengganti jadi seragam ("tidak berhenti pada", "menyatakan bahwa") dan beberapa kata kerja melemah | Diterima. Sepuluh butir divariasikan atau dibuang |
| 26 paragraf tabel Penutup masih berspasi 1,0 | Diterima. Semua tabel data kini 1,5 (jarak baris 19 pt di PDF) |
| Tiga entri daftar rujukan ikut dirata kiri-kanan | Diterima. Dikembalikan; spek dibetulkan menjadi rata kiri |
| Keterangan Gambar 1.1 dan 1.2 Pendahuluan belum 1,5 | Diterima |
| Putaran kedua: lima kalimat janggal (p9 P0103, b1 P0055, b1 P0080, b5 P0011, b1 P0054) | Diterima. Ditulis ulang menurut usul pemeriksa |
| Putaran kedua: kalimat kembar di dua bab dan paragraf yang sama di lima bab jadi berbeda-beda | Diterima. Enam usulan dibuang supaya kembali satu bentuk |
| Judul "F. Refleksi Pencapaian CPMK" di Penutup tertinggal sendirian di kaki halaman | Diterima. Semua paragraf bergaya judul kini menempel pada paragraf berikutnya |
| `cek217.py` tidak menangkap 11 dan kemudian 3 jenis perubahan (warna lain, spasi tabel kosong, sorotan, judul diturunkan, tebal atau miring dibuang, teks tersembunyi, dan lain-lain) | Sebagian diterima: tujuh ditutup. Belum ditutup: isi komentar, teks kaki halaman, gambar isi yang diganti, ukuran huruf lewat gaya, nomor daftar isi yang diubah tangan. Kelimanya diperiksa pemeriksa secara manual atas berkas hasil dan bersih |
| Uraian tiga baris "bukan 11 pt" di `cekpdf217.py` kurang tepat (empat potong teks, bukan tiga) | Diterima sebagai catatan: keempatnya bukan teks tabel (dua entri rujukan, satu baris badan, satu baris daftar isi) |

Yang tidak diperiksa pemeriksa: kebenaran isi terhadap sumber rujukan; rupa halaman asal lawan hasil per halaman (tidak ada PDF asal, kecuali Pendahuluan yang dibandingkan sesi); halaman PDF selain yang dipotret.

## Cara memeriksa ulang

```bash
python cek217.py asal hasil
python cekpdf217.py hasil pdf
```

Yang pertama harus berakhir `SEMUA LOLOS`. Yang kedua mencetak `PERIKSA` untuk Bab 3, 4, dan 6 karena empat potong teks bukan tabel yang 22 huruf pertamanya sama dengan sebuah sel tabel; selain itu semua baris daftar isi harus cocok dan jarak baris tabel 19 pt.

