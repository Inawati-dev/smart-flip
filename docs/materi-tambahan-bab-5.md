# Daftar tulisan sesi di Bab 5 (antrean #208)

Disusun 11 Okt 2026. Berkas yang dikerjakan: `kerja nyata/Naskah sampai Aktivitas Mandiri/07 Bagian II - Bab 5 Model-Model Pengembangan dan Validasi Produk (sampai Aktivitas Mandiri).docx`, versi tim tertanggal 11 Okt 2026 15:21 (md5 `0d0fe21400c0a7e321dcd65a5ae54407`). Salinan versi itu ada di `.claude/cadangan-208/` pada checkout utama.

Semua yang ada di daftar ini ditulis sesi (mesin) dan berwarna **biru 0070C0** di naskah. Teks merah sudah ada di berkas sebelum sesi ini dan tidak diubah, kecuali kata yang masuk tabel pembetulan. Merah itu bukan tulisan tim: dari 72 paragraf yang hampir seluruhnya merah, 66 teksnya sudah ada di versi sesi 11 Okt 2026 11:04 (enam sisanya judul bagian yang nomornya diganti), dan tidak ada yang bermerah di versi 10 Okt 2026 14:46 (`kerja nyata/Naskah Final per Bagian/`, 0 huruf merah). Jadi merah menandai materi tambahan sesi mesin sebelumnya, biru menandai tulisan sesi 11 Okt sore, dan hitam adalah naskah asal. Keluaran `merah.py` di `.claude/cadangan-208/`.

Skrip: `gambar208.py` (menggambar), `isi208.py` (isi teks), `sisip208.py` (menyisipkan), `word208.py` (daftar isi dan PDF), `cek208.py` (pembanding) di `.claude/cadangan-208/` pada worktree sesi. Berkas hasil yang ditulis ke naskah bermd5 `c27562f47d3288548213508b9b95960e` (11 Okt 2026 16:27).

## Komentar tim dan tanggapannya

Sepuluh komentar Word dari Inawati FS (11 Okt 2026).

| Komentar | Letak | Isi | Yang dikerjakan |
|---|---|---|---|
| 0 | Daftar isi | sesuaikan dengan isi yang dibahas | Daftar isi dibangun ulang lewat Word. Judul "Model-Model Pengembangan" dijadikan judul bagian bernomor 1 supaya ikut terdaftar. Satu judul kosong di antara bagian 3 dan 4 dibuang. |
| 1 | Judul Gambar 5.1 | semua gambar model diganti berdasarkan gambar asli dan bersumber ilmiah yang jelas | Tujuh gambar digambar ulang mengikuti gambar di artikel jurnal, masing-masing diberi baris "Sumber". |
| 2 sampai 7 | Gambar ADDIE, Waterfall, Borg dan Gall, XP, GDLC, RAD | sesuai sumber ilmiah dan tambahkan penjelasan keunggulan setiap model | Uraian keunggulan (dan keterbatasan bila sumbernya menyebut) ditambahkan sesudah tiap gambar. Model 4D juga diberi uraian. |
| 8 | Bagian 2, Kriteria Praktis | tambahkan penjelasan model lain, jangan hanya ADDIE dan 4D | Dua paragraf baru untuk Waterfall, RAD, Borg dan Gall, XP, dan GDLC. |
| 9 | Bagian 3, Perbandingan | topik sesuaikan dengan semua model yang dibahas | Satu paragraf pengantar dan Tabel 5.4 (keunggulan dan keterbatasan tujuh model). |

Komentar 0 tidak ada lagi di berkas hasil. Word menghapusnya ketika daftar isi dibangun ulang, karena komentar itu menempel pada baris daftar isi yang lama. Sembilan komentar lain masih ada di tempatnya.

## Sumber yang dipakai

Semua artikel jurnal akses terbuka ber-DOI, dibuka dan dibaca sesi pada 11 Okt 2026. Kolom "Yang diambil" ditulis dengan kata sendiri; halaman menunjuk tempat kalimat aslinya.

| Sumber | Dipakai untuk | Yang diambil | Halaman |
|---|---|---|---|
| Waruwu (2024), Jurnal Ilmiah Profesi Pendidikan 9(2), DOI 10.29303/jipp.v9i2.2141 | Gambar 5.1, 5.2, 5.4; keunggulan 4D, ADDIE, Borg dan Gall | Borg dan Gall: berangkat dari analisis kebutuhan, tahapan lengkap, uji coba lebih dari satu kali. 4D (merujuk Maydiantoro, 2021): tahapan sederhana dan tidak lama; berakhir pada penyebaran tanpa evaluasi. ADDIE: tiap tahap dievaluasi, sistematis dan terstruktur; perlu waktu lama, formal, kaku. | 1225, 1226, 1227 |
| Saravanos dan Curinga (2023), Applied System Innovation 6(6), 108, DOI 10.3390/asi6060108 | Gambar 5.3; keunggulan Waterfall | Tahapan jelas dan mudah dipahami sehingga tetap menjadi dasar pendidikan komputasi; kutipan mereka atas penulis lain bahwa organisasi masih memakainya karena rekam jejaknya terbukti; kejelasan kebutuhan adalah anggapan yang melekat pada model ini. | Bagian 2 dan 3 (dibaca dari versi arXiv 2308.03940, hlm. 4, 5, 7; versi terbit di situs jurnal tidak bisa diunduh sesi, jadi nomor gambarnya tidak ditulis di naskah). Kalimat tentang rekam jejak adalah kutipan mereka atas Fagarasan dkk. |
| Al-Saqqa, Sawalha, dan AbdelNabi (2020), iJIM 14(11), DOI 10.3991/ijim.v14i11.13269 | Gambar 5.5; keunggulan dan keterbatasan XP | Enam fase daur hidup XP; empat keunggulan (rilis kecil yang sering, produktivitas lewat umpan balik cepat, kesederhanaan lewat perapian kode, mutu lewat uji otomatis); empat keterbatasan (tim terpisah tempat, pelatihan teknis untuk menulis uji lebih dulu, dokumentasi informal, keterlibatan pelanggan yang menyita waktu). | 262 sampai 264 |
| Aleem, Capretz, dan Ahmed (2016), JSERD 4, 6, DOI 10.1186/s40411-016-0032-7 | Keunggulan GDLC | Pengembangan permainan berbeda dari perangkat lunak biasa karena memadukan suara, seni, sistem kendali, kecerdasan buatan, dan faktor manusia. Daur hidup yang sudah diusulkan, termasuk milik Ramadan dan Widyani (2013), dinilai belum menjamin proses pengembangan yang bermutu. Artikel ini tidak menilai GDLC sebagai unggul. | 1 dan 2 |
| Santika, Ramadhan, Andri, Solehuddin, dan Juanita (2019), Sebatik 23(2), DOI 10.46984/sebatik.v23i2.788 | Gambar 5.6; uraian uji beta | Memuat gambar GDLC Ramadan dan Widyani (2013); uji beta dikerjakan penguji pihak ketiga, berada di luar siklus produksi, dan hasilnya dapat membuat tim mengulang siklus itu. | 394 dan 395 |
| Hidayat dan Hati (2021), Jurnal Sistem Informasi 10(1), DOI 10.51998/jsi.v10i1.352 | Gambar 5.7; keunggulan RAD | Alasan mereka memilih RAD: siklus lebih pendek, lebih fleksibel, keterlibatan pengguna naik, kemungkinan kesalahan ditekan. Memuat gambar empat fase RAD. | 10 |
| Delima, Santosa, dan Purwadi (2017), IJITEE 1(2), DOI 10.22146/ijitee.28362 | Keunggulan RAD; kriteria memilih | Situs web selesai dalam 30 minggu oleh tim lima orang, lebih cepat dari rencana delapan bulan; ukuran proyek yang relatif kecil ikut mendukung. Risiko RAD: mutu dapat turun karena waktu singkat, menuntut tim ahli sehingga biaya tinggi; sesuai untuk proyek kecil sampai menengah. Sumber menulis "30 weeks or 150 days", padahal 30 minggu kalender adalah 210 hari; naskah memakai 30 minggu karena tabel jadwal di sumber berjumlah 30 minggu. | 36, 39, 43 |

Rujukan tangan kedua, disebut begitu di naskah: Maydiantoro (2021) lewat Waruwu (2024); gambar Ramadan dan Widyani (2013) lewat Santika dkk. (2019). Artikel Ramadan dan Widyani sendiri tidak terbuka untuk umum dan tidak dibaca sesi.

Calon sumber yang tidak jadi dipakai karena berkasnya tidak bisa diunduh sesi: Spatioti dkk. (2022, sudah dirujuk tim di naskah), Shrivastava dkk. (2021), Aswati dkk. (2017), Irawan dkk. (2018), Putri dkk. (2023). Husniah dkk. (2018) dibuka tetapi memakai GDLC versi lain (empat tahap), jadi tidak dipakai.

## Gambar

| Gambar | Digambar ulang dari | Beda dengan gambar sumber |
|---|---|---|
| 5.1 Model 4D | Waruwu (2024), Gambar 2 | Sumber hanya memuat empat nama tahap. Padanan Indonesia dan satu baris isi tiap tahap diambil dari paragraf 4D yang sudah ada di bab ini. |
| 5.2 ADDIE | Waruwu (2024), Gambar 3 | Susunan dan arah panah sama: Evaluate di tengah dengan panah ke empat tahap, panah luar searah jarum jam. Sumber menulis Development, Implementation, Evaluation; gambar memakai Develop, Implement, Evaluate seperti teks bab. Padanan Indonesia ditambahkan. |
| 5.3 Waterfall | Saravanos dan Curinga (2023), Gambar 1 | Nama tahap diindonesiakan dan diberi rincian lima tahap yang disebut di teks sumber. Keterangan arti panah ditambahkan. Panah balik di sumber bergantian di kiri dan kanan; di gambar baru semuanya di kiri. |
| 5.4 Borg dan Gall | Waruwu (2024), Gambar 1 | Susunan sama (4, 4, 2 kotak). Nama langkah memakai istilah Indonesia yang sudah dipakai di bab ini; langkah diberi nomor. Gambar sumber runtut dari langkah 1 ke 10 tanpa panah kembali, sedangkan paragraf lama di bab ini menyebutnya "siklus"; kata itu tidak diubah. |
| 5.5 XP | Al-Saqqa dkk. (2020), Gambar 5 | Disederhanakan: semua unsur gambar sumber ada, alur panahnya dirapikan (di sumber "prioritas" dan "estimasi usaha" berpanah sendiri, dan ada dua panah persetujuan pelanggan; di gambar baru satu). Empat aktivitas Pressman (2010) di paragraf lama tidak sama persis dengan enam fase ini; uraian baru menjelaskan hubungan keduanya. |
| 5.6 GDLC | Ramadan dan Widyani (2013) dalam Santika dkk. (2019), Gambar 1 | Baris "tahap" (foundation, structure, formal details, refinement) tidak digambar; baris versi digambar. Tulisan pada garis putus-putus berasal dari teks Santika dkk. |
| 5.7 RAD | Hidayat dan Hati (2021), Gambar 1 | Susunan sama. Padanan Indonesia ditambahkan. |

## Materi baru

| No | Letak | Jenis | Awal kalimat | Kata |
|---|---|---|---|---|
| 1 sampai 7 | Di bawah tiap keterangan gambar | baris sumber | Sumber: digambar ulang dari ... | 7 baris |
| 8 | Sesudah Gambar 5.1 | paragraf | Keunggulan model 4D ada pada tahapannya yang ringkas. | 61 |
| 9 | Sesudah Gambar 5.2 | paragraf | Keunggulan ADDIE ada pada evaluasi yang menyertai setiap tahap. | 84 |
| 10 | Sesudah Gambar 5.3 | paragraf | Keunggulan Waterfall adalah tahapannya yang jelas dan mudah dipahami. | 79 |
| 11 | Sesudah Gambar 5.4 | paragraf | Keunggulan model Borg dan Gall ada pada kelengkapan tahapnya. | 70 |
| 12 | Sesudah Gambar 5.5 | paragraf | Keunggulan XP berasal dari rilis kecil yang sering. | 89 |
| 13 | Sesudah Gambar 5.5 | paragraf | XP juga punya keterbatasan. | 49 |
| 14 | Sesudah Gambar 5.6 | paragraf | Keunggulan GDLC adalah tahapannya yang disusun khusus untuk permainan. | 129 |
| 15 | Sesudah Gambar 5.7 | paragraf | Keunggulan RAD adalah waktu pengembangan yang pendek. | 116 |
| 16 | Bagian 2 | paragraf | Tiga faktor yang sama berlaku untuk lima model lainnya. | 96 |
| 17 | Bagian 2 | paragraf | XP menuntut banyak dari tim dan mitra. | 115 |
| 18 | Bagian 3 | paragraf | Tabel 5.4 melengkapi perbandingan itu dengan keunggulan dan keterbatasan tiap model ... | 73 |
| 19 | Bagian 3 | keterangan dan tabel | Tabel 5.4 Keunggulan dan Keterbatasan Tujuh Model Pengembangan | 8 baris, 3 kolom |
| 20 sampai 26 | Daftar Rujukan Bab 5 | entri rujukan | Aleem; Al-Saqqa; Delima; Hidayat; Santika; Saravanos; Waruwu | 7 entri |

Jumlah kata sebelas paragraf uraian: 961 (keluaran `python isi208.py teks-baru.txt`).

## Pembetulan teks lama

Bagian yang diganti berwarna biru.

| Letak (awal paragraf) | Sebelum | Sesudah | Alasan |
|---|---|---|---|
| Agile Extreme Programming (XP) ... | oleh Beck dan Andres (2004) menjelaskan XP sebagai | dijelaskan Beck dan Andres (2004) sebagai | kalimat kehilangan subjek sesudah nama model dipindah ke depan |
| Game Development Life Cycle (GDLC) ... | menyusun GDLC karena | disusun karena | sama |
| Rapid Application Development (RAD) ... | merumuskan RAD untuk | dirumuskan untuk | sama |
| Rapid Application Development (RAD) ... | mengmahasiswalkan | mengandalkan | kata rusak akibat cari-ganti "anda" menjadi "mahasiswa" |
| Untuk menafsirkan skor ... | tmahasiswa | tanda | sama |
| Waterfall merupakan model ... | Royce (1970), Sommerville (2016) | Royce (1970). Sommerville (2016) | dua kalimat disambung koma |
| Rapid Application Development (RAD) ... | pengguna  (Martin | pengguna (Martin | spasi ganda |
| Selain perbedaan jumlah dan sifat tahapan ... | tiga faktor praktis (1) | tiga faktor praktis: (1) | titik dua sebelum perincian |
| Keterangan tabel studi literatur ADDIE | Tabel 5.4 | Tabel 5.2 | nomor tabel melompat dari 5.1 ke 5.4 |
| Paragraf dan keterangan tabel perbandingan; butir Aktivitas Mandiri | Tabel 5.5 (3 tempat) | Tabel 5.3 | nomor diurutkan; kalimat Refleksi yang menunjuk "Tabel 5.3" kini benar |
| Paragraf dan keterangan tabel peran validator | Tabel 5.6 (2 tempat) | Tabel 5.5 | nomor diurutkan; Tabel 5.4 kini tabel keunggulan dan keterbatasan |

## Perubahan tata letak tanpa perubahan kata

- Judul "Model-Model Pengembangan" dijadikan gaya judul bagian (Heading 3) dan diberi nomor "1." yang diketik, menggantikan nomor otomatis.
- Satu paragraf judul kosong di antara bagian 3 dan 4 dibuang.
- Bingkai merah pada empat gambar lama (penanda yang sudah ada di versi tim) ikut hilang bersama gambarnya.
- Keterangan gambar dibuat menempel pada baris sumbernya (tidak terpisah halaman).
- Baris kepala Tabel 5.3 dan Tabel 5.4 diulang bila tabel terpotong ke halaman berikutnya.
- Jumlah halaman 22 menjadi 27 (hitungan Word).

## Cara memeriksa ulang

```bash
python cek208.py asal.docx hasil.docx
```

Keluaran yang diharapkan diakhiri `LOLOS`: teks lama tidak ada yang hilang dan urutannya tetap, huruf merah tidak berkurang di luar pembetulan (19.707 menjadi 19.670 huruf, selisih 37 huruf sama dengan panjang kata merah yang dibetulkan), 50 paragraf baru semuanya biru dan isinya sama dengan `isi208.py`, nomor tabel 5.1 sampai 5.5 dan gambar 5.1 sampai 5.7 urut.

```bash
python "C:\1-Johan\10. Pengembangan\AI Skill\00 - Dokumentasi\cek_pola_ai.py" teks-baru.txt
```

Keluaran yang diharapkan: `keras = 0`, `gagal = 0`.

## Pemeriksa akhir

Satu agen `sonnet`, 11 Okt 2026, hanya membaca. Ia membuka tujuh PDF sumber, tujuh gambar, PDF hasil, menjalankan ulang `cek208.py` dan `cek_pola_ai.py`, mencocokkan tujuh rujukan ke Crossref, dan membuat lima berkas uji sendiri di `.claude/cadangan-208/periksa/`.

| Sanggahan | Nasib |
|---|---|
| "150 hari" tidak cocok dengan tabel jadwal sumber (30 minggu) | Diterima. Naskah memakai 30 minggu. |
| Sel keterbatasan RAD di Tabel 5.4 bukan keterbatasan menurut sumber | Diterima. Diganti risiko yang disebut Delima dkk. hlm. 36 dan 43; paragraf RAD ditambah satu kalimat risiko. |
| Aleem dkk. tidak menilai GDLC unggul; mereka malah mencatat kelemahannya | Diterima. Kalimat "teknik rekayasa perangkat lunak membantu ..." dibuang; kelemahan itu ditulis di paragraf dan di tabel. |
| Sel Waterfall memuat kutipan tangan kedua tanpa disebut | Diterima. "Rekam jejak" dibuang dari sel; paragraf menyebut Fagarasan dkk. |
| "Empat keunggulan" XP, padahal sumber menyebut "sebagian" | Diterima. Ditulis "empat di antara keunggulan XP". |
| Sel 4D menyebut Waruwu saja | Diterima. Ditulis "Maydiantoro, 2021, dalam Waruwu, 2024". |
| Nomor "Gambar 1" Saravanos dan Curinga tidak terbukti di versi terbit | Diterima. Nomor gambar dibuang dari baris sumber. |
| Panah ADDIE digambar dua arah, sumber searah dari Evaluation | Diterima. Gambar dan kalimat dibetulkan. |
| Panah XP: uji dan basis kode dua arah; persetujuan pelanggan berujung di tempat yang salah | Diterima. Gambar dibetulkan. |
| Panah balik Waterfall di sumber bergantian sisi | Dicatat di tabel Gambar, gambar tidak diubah. |
| Tiga salah ketik lama terlewat (koma penyambung kalimat, spasi ganda, titik dua) | Diterima. Masuk tabel pembetulan. |
| Paragraf ADDIE lama (Evaluate tahap terakhir) berbeda dengan gambar (Evaluate di tengah) | Diterima. Paragraf baru menjelaskan keduanya menurut Waruwu hlm. 1227. |
| Paragraf Borg dan Gall lama memakai kata "siklus", gambar sumber runtut | Dicatat di tabel Gambar, teks lama tidak diubah. |
| `cek208.py` tidak menangkap satu huruf baru yang tidak biru, paragraf lama yang ditukar urutan, dan isi paragraf baru yang diubah | Diterima. Pembanding diperketat; tiga celah itu kini diperiksa. |
| `cek208.py` tidak menangkap huruf miring atau tebal teks lama yang dibuang | Belum diperbaiki (di luar yang disentuh skrip penyisip). |

Yang tidak diperiksa pemeriksa: artikel Maydiantoro, Ramadan dan Widyani, dan versi terbit Saravanos dan Curinga; halaman PDF 1 sampai 3 dan 16 sampai 27; tampilan di Word (hanya PDF ekspor).
