# Spek: alur belajar di naskah "Bagian 1 Pendahuluan" masuk ke web SMART-FLIP

Status: USULAN, menunggu keputusan Johan. Belum ada kode yang diubah.
Dibuat 10 Okt 2026 dari permintaan Johan: "pelajari karena ini masuk di koding web, setelah itu buat spec dari smartflip" (antrean #119).

## 1. Sumber

- `kerja nyata/Bagian 1 Pendahuluan.docx` (1,28 MB, disimpan 10 Okt 2026 13.14). Ini versi revisi Bagian I: 85 paragraf, 2 tabel, 3 gambar, dan 4 komentar Bu Inawati.
- Pembanding: `kerja nyata/Naskah Final per Bagian/01 Bagian I - Pendahuluan.docx` (pecahan naskah final). Teks kedua berkas berbeda di 117 baris: versi revisi menambah sampul, menulis ulang bagian "Peta Konsep / Alur Belajar Adaptif", dan menyusun ulang kerangka teoretis.
- Keadaan platform dibaca dari kode cabang `claude/strange-mclean-f2e790` (`d564fc2`) pada 10 Okt 2026.

Empat komentar di berkas revisi:

| No | Tanggal | Menempel pada | Isi komentar |
|---|---|---|---|
| K1 | 25 Sep 2026 | Gambar 1.1 Alur Belajar Adaptif | Alurnya perlu direvisi supaya lebih sederhana dan mudah diimplementasikan |
| K2 | 10 Okt 2026 | Paragraf jalur cepat/mendalam | Saat login awal muncul tes diagnostik. Skor kurang dari 80 masuk kategori belajar mendalam, skor 80 atau lebih masuk jalur cepat |
| K3 | 10 Okt 2026 | Butir "setiap bab memiliki estimasi waktu belajar" | Durasi waktu belajar ditampilkan di setiap materi atau modul. Sesudah membaca, mahasiswa masuk ke aktivitas mandiri sebagai latihan atau mini proyek |
| K4 | 25 Sep 2026 | Tabel CPMK dan Sub CPMK | Perlu mengecek RPS |

## 2. Alur yang diminta naskah revisi

1. Mahasiswa login pertama kali, lalu langsung mengerjakan tes diagnostik awal.
2. Skor diagnostik 80 atau lebih: jalur cepat. Di bawah 80: belajar mendalam (perlakuan lebih intensif).
3. Tiap bab: baca materi (durasi belajar terlihat), lalu aktivitas mandiri (latihan atau mini proyek), lalu kuis formatif.
4. Kuis formatif di bawah 70: remedial, kembali ke materi, belum boleh ke bab berikutnya. Skor 70 atau lebih: lanjut ke bab berikutnya.
5. Mini proyek tiap bab terkumpul menjadi draf proposal. Di akhir ada ujian sumatif (UAS).
6. Pendukung: pelacak progres, dan forum atau fitur tanya dosen.

## 3. Naskah dibanding platform

| Butir | Naskah revisi | Platform sekarang | Selisih |
|---|---|---|---|
| A. Tes diagnostik saat login awal | Muncul saat login awal (K2) | Sudah ada: `ProtectedRoute.tsx:30` mengalihkan semua halaman ke `/asesmen/pre` sampai pre-test selesai | Tidak ada. Hanya istilah: platform menyebutnya "Pre-test" |
| B. Batas dan nama golongan | 80 atau lebih jalur cepat, di bawah 80 belajar mendalam | Batas sama (`golongan.ts:13`, `skor >= 80`). Namanya "Mahir" dan "Remedial" (`golongan.ts:18-22`) | Nama golongan berbeda |
| C. Perlakuan per golongan | Jalur cepat belajar mandiri, mendalam diberi perlakuan lebih intensif | Mahir: semua topik terbuka. Remedial: topik dibuka satu per satu (`topik.ts:127`) | Isi "perlakuan intensif" belum didefinisikan naskah |
| D. Batas lulus formatif | 70 | 80: `PASS_SCORE` (`quizAttempts.ts:8`) dan kolom `quiz_attempts.passed` yang dihitung basis data (`migration_v17_bank_soal.sql:64`). Batas golongan menumpang konstanta yang sama (`golongan.ts:11`) | Batas berbeda, dan dua batas masih satu konstanta |
| E. Durasi belajar per materi | Tampil di tiap materi atau modul (K3) | Hanya durasi video (`modules.duration_sec`, v26) di halaman Video. Modul PDF tidak punya perkiraan waktu | Belum ada |
| F. Aktivitas mandiri per bab | Wajib sesudah membaca; unggah PDF atau foto; dinilai dengan bobot kriteria | Belum ada. `src/lib/aktivitas.ts` adalah umpan kegiatan dasbor dosen, bukan pengumpulan tugas. Yang ada hanya Tugas akhir, satu tugas per mata kuliah | Fitur baru |
| G. Urutan langkah | Baca, aktivitas mandiri, formatif | `langkah.ts:10`: baca, video, formatif | Langkah aktivitas belum ada |
| H. Remedial formatif | Kembali ke materi, belum boleh lanjut | Topik berikutnya memang terkunci. Belum ada arahan kembali ke materi | Arahan belum ada |
| I. Forum atau tanya dosen | Disebut di petunjuk penggunaan | `/forum` dialihkan ke Dashboard (`App.tsx:103`) | Fitur tidak ada |
| J. Draf proposal dan UAS | Mini proyek tiap bab menjadi draf proposal; UAS di akhir | Tugas akhir ada (`/asesmen/tugas-akhir`); tidak terhubung ke tugas per bab | Kumpulan per bab belum ada |
| K. CPMK dan Sub CPMK | Dua tabel | Tidak ditampilkan | Opsional |

## 4. Paket kerja yang diusulkan

Urutan dari yang paling murah. Tiap paket satu commit dan diverifikasi di laptop 1536x960 dan telepon 412x915.

**WP-1. Nama golongan mengikuti naskah (kecil, tanpa skema).**
"Mahir" menjadi "Jalur cepat", "Remedial" menjadi "Belajar mendalam", "Pre-test" di layar mahasiswa menjadi "Tes diagnostik awal". Nilai di kode (`'mahir'`, `'remedial'`) tidak diganti.
Kriteria terima: `git grep -n "'Mahir'\|'Remedial'" -- src/lib/golongan.ts` nol hasil; uji `golongan.test.ts` lolos.

**WP-2. Pisahkan dua batas, lalu batas formatif jadi 70 (sedang, MENGUBAH SKEMA).**
`AMBANG_DIAGNOSTIK = 80` dan `AMBANG_FORMATIF = 70` menjadi dua konstanta. Kolom `quiz_attempts.passed` dibuat ulang dengan `score >= 70` lewat migrasi v27.
Akibat yang perlu disetujui: pengerjaan lama berskor 70 sampai 79 berubah dari remedial menjadi lulus, dan rekap dosen ikut berubah.
Kriteria terima: `git grep -n "PASS_SCORE" -- src` nol hasil; `select count(*) from quiz_attempts where passed <> (score >= 70)` = 0; uji `topik.test.ts` dan `asesmen.test.ts` lolos dengan batas baru.

**WP-3. Durasi belajar per topik (kecil sampai sedang, MENGUBAH SKEMA).**
Kolom baru `modules.estimasi_menit`, diisi dosen di halaman Modul, tampil di kartu topik dan di halaman baca. Kosong berarti tidak ditampilkan.
Kriteria terima: kartu topik menampilkan "± n menit" bila terisi; tidak ada teks "null" atau "0 menit" bila kosong.

**WP-4. Aktivitas mandiri per topik (besar, MENGUBAH SKEMA dan penyimpanan berkas).**
Dosen menulis petunjuk, format, dan kriteria berbobot per topik. Mahasiswa mengunggah PDF atau foto. Dosen menilai per kriteria. Langkah di Dashboard menjadi baca, aktivitas mandiri, formatif. Pola unggah dan penilaian meniru Tugas akhir yang sudah ada.
Butuh: tabel petunjuk, tabel kiriman, wadah berkas, aturan akses per kelas.
Kriteria terima ditulis sesudah keputusan nomor 3 dan 4 di bawah.

**WP-5. Arahan remedial (kecil, tanpa skema).**
Hasil formatif di bawah batas menampilkan tombol "Baca ulang materi" yang membuka topik itu, di samping tombol ulangi kuis.

**WP-6. Tanya dosen (ukuran bergantung keputusan nomor 5).**

Di luar spek ini: isi enam bab, 60 soal, remedial dan pengayaan per bab, multimedia (antrean #108).

## 5. Keputusan yang dibutuhkan

1. Nama golongan: pakai "Jalur cepat" dan "Belajar mendalam" di layar? Rekomendasi: ya.
2. Batas formatif turun dari 80 ke 70? Naskah revisi menulis 70, tetapi pengerjaan lama 70 sampai 79 akan berubah status. Ini mengubah data produksi, jadi keputusan Johan.
3. Aktivitas mandiri: wajib sebelum kuis formatif (naskah Bab 1: "paling lambat sebelum mengerjakan Kuis Formatif") atau sesudah lulus formatif (paragraf alur revisi: lulus, lalu "mengerjakan mini projek")? Kedua kalimat ada di naskah.
4. Aktivitas mandiri mengunci kuis, atau hanya dicatat? Mengunci berarti mahasiswa tidak bisa kuis sebelum mengunggah.
5. Tanya dosen: hidupkan forum, buat kolom tanya per topik, atau hapus kalimatnya dari naskah?
6. Perlakuan "lebih intensif" untuk belajar mendalam: cukup topik dibuka satu per satu seperti sekarang, atau ada isi tambahan?
7. Jalur cepat sekarang membuka semua topik sekaligus. Naskah revisi menulis semua mahasiswa lanjut bab hanya bila formatif lulus. Apakah jalur cepat tetap boleh melompat?

## 6. Hal di naskah yang perlu dibetulkan penulis

- Paragraf alur menulis "nilai 80 > jalur cepat" dan "≤ 80 belajar mendalam", sedangkan komentar K2 menulis 80 atau lebih jalur cepat. Skor tepat 80 jatuh di golongan berbeda. Platform mengikuti K2.
- Subbab 1.5.1 masih menyebut pengayaan untuk skor di atas 80, padahal paragraf alur revisi hanya punya dua cabang di 70. Berkas tiap bab juga masih memuat "Konten Pengayaan (Skor > 80)".
- Nomor subbab melompat: 1.5.1, 1.5.2, 1.5.4, lalu 1.5.2 lagi.
- Di tabel matriks, Sub CPMK 4.1 sampai 4.4 berada di bawah CPMK 3; baris CPMK 4 tidak muncul.
- Nama mata kuliah ditulis tiga cara: "Metode Penelitian dan Pengembangan Proyek", "... Projek", dan "Metode Pengembangan Proyek".
- Daftar penulis di sampul revisi (4 nama) berbeda dari naskah final (7 nama); "Violita" di revisi, "Viola" di final.
