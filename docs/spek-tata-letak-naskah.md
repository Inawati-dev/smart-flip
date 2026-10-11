# Spek tata letak naskah (usulan, antrean #217)

Disusun 11 Okt 2026 dari hasil ukur, belum disetujui Johan. Angka diambil dari berkas Bab 1 (`03 ... .docx`, tersimpan 11 Okt 2026 14:01), yaitu berkas yang sudah Johan terima sesudah #200 sampai #205. Perintah ukur: `python spek216.py asal 03` dan `python ukur216.py asal` di `.claude/cadangan-216/` pada worktree sesi. Keduanya hanya membaca.

## Angka baku

| Bagian | Fon | Ukuran | Spasi baris | Rata | Lain-lain |
|---|---|---|---|---|---|
| Kertas dan margin | | | | | A4 21,0 x 29,7 cm; margin 2,54 cm di empat sisi (sama di delapan berkas) |
| Paragraf badan | Times New Roman | 12 pt | 1,5 | kiri-kanan | baris pertama menjorok 1 cm; jarak sebelum dan sesudah 0 |
| Judul bagian (A, B, C, D) dan judul subbab | mengikuti gaya Heading 2 dan Heading 3 berkas | | | | tidak diubah |
| Keterangan tabel dan gambar | Times New Roman | 12 pt | 1,5 | tengah | |
| Baris "Sumber" di bawah gambar | Times New Roman | 12 pt | 1,5 | tengah | |
| Isi tabel | Times New Roman | butuh pilihan Johan: 11 atau 12 pt | 1,5 | kiri | tabel tiga garis (tanpa garis tegak), tidak diubah |
| Daftar rujukan | Times New Roman | 12 pt | 1,5 | kiri | baris kedua menjorok. Dibetulkan 11 Okt 2026 sesudah pemeriksa: di enam bab entri rujukan memang rata kiri, dan sapuan tidak mengubahnya |
| Kop bab, kepala dan kaki halaman | mengikuti rancangan berkas | | | | tidak diubah, warnanya juga tidak |
| Warna teks | | | | | hitam untuk seluruh isi; warna kop bab dan kaki halaman tetap |

## Penyimpangan yang ditemukan

Jumlah paragraf yang berbeda dari angka baku, per berkas. "Gaya" berarti nilainya tidak ditulis di paragraf dan mengikuti gaya dokumen, jadi belum tentu tampak berbeda di halaman.

| Berkas | Badan (rata) | Isi tabel (ukuran) | Isi tabel (spasi) | Rujukan (rata) | Catatan |
|---|---|---|---|---|---|
| Bab 1 (acuan) | 1 dari 42 | 30 dari 97 | 4 dari 97 | 0 dari 12 | |
| Bab 2 | 0 dari 43 | 7 dari 86 | 4 dari 86 | 0 dari 14 | kata "Anda" masih 1 |
| Bab 3 | 4 dari 46 | 100 dari 100 (11 pt) | 4 dari 100 | 7 dari 7 | kata "Anda" 6 (dikerjakan #210) |
| Bab 4 | 2 dari 40 | 87 dari 88 (11 pt) | 4 dari 88 | 9 dari 9 | kata rusak 5 macam (dikerjakan #210) |
| Bab 5 | 6 dari 59 | 5 dari 119 | 4 dari 119 | 0 dari 27 | 9 komentar tim |
| Bab 6 | 3 dari 37 | 117 dari 117 (11 pt) | 4 dari 117 | 13 dari 13 | kata rusak 6 macam (dikerjakan #210); 1 komentar tim |
| Pendahuluan | 0 dari 17 | 68 dari 137 | 137 dari 137 (1,1 dan 1,15) | tidak ada | 885 huruf berfon Gungsuh; tanpa sampul; tanpa warna merah atau biru; tanpa komentar; tanpa kata rusak |
| Penutup | 4 dari 29 | 130 dari 130 | 59 dari 130 | tidak ada | tanpa sampul; seluruh teks hitam; tanpa komentar; tanpa kata rusak |

Spasi baris paragraf badan: 427 dari 428 paragraf sudah 1,5 (`ukur216.py`), jadi permintaan "spasi paragraf 1.5" sudah terpenuhi di badan dan yang perlu disamakan adalah tabel Pendahuluan dan Penutup.

## Urutan kerja yang diusulkan

1. Isi: #210 dan #211 A ditulis ke naskah.
2. Sapuan humanizer per berkas; daftar kalimat sebelum dan sesudah ditulis ke `docs/` per berkas.
3. Cadangan delapan berkas berwarna, lalu tata letak baku dan warna hitam lewat satu skrip.
4. Sampul depan dan belakang.
5. Daftar isi dibangun ulang dan PDF diekspor.
6. Pemeriksa akhir; berkas asli diganti sesudah pemeriksa.

Sampul dan daftar isi dikerjakan paling akhir karena jumlah halaman berubah di tiap langkah sebelumnya.

## Yang tidak boleh diubah agen humanizer

Rujukan, angka, rumus, nama orang, judul bab dan subbab, isi tabel bersumber, dan kutipan langsung. Yang diubah hanya gaya kalimat. Ukuran sebelum dan sesudah per berkas memakai `cek_pola_ai.py`.
