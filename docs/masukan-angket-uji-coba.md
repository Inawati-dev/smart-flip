# Rekap saran perbaikan setelah uji coba (angket)

Sumber: `C:/Users/Johan/Downloads/Rekap Saran Perbaikan Setelah Uji Coba.docx` (15 butir, tanpa nama penguji dan tanpa jumlah penguji per butir). Dibaca 8 Nov 2026. Status dibandingkan dengan pekerjaan tayang sampai commit `d50abbf3`.

| # | Masukan penguji (ringkas) | Kelompok | Status sekarang | Usulan |
|---|---|---|---|---|
| 1 | Simpan progres jawaban; lebih interaktif dan responsif | Simpan jawaban | Jawaban tersimpan: selesai #355. "Interaktif dan responsif" terlalu umum | Tanya penguji bagian mana yang terasa lambat |
| 2 | Gagal membuat akun walau data benar | Pendaftaran | Selesai: #348 (batas email Supabase), #349, #350 (pesan galat jaringan); Johan 6 Nov: semua akun baru sudah bisa | Tidak ada |
| 3 | Fitur yang diklik lama loading dan harus refresh | Koneksi | Sebagian: #356 (paket halaman diulang, modal koneksi). Belum diukur pada jaringan lambat | Ukur waktu muat per halaman di jaringan 3G terhambat |
| 4 | Video materi lebih menarik bila ada ilustrasi pendukung | Konten | Belum; urutan Johan: bab, studi kasus, tes HOTS, baru video dan suara | Masuk tahap video |
| 5 | Animasi flipbook lebih elastis, tidak kaku | Flipbook | Sebagian: #354 (gaya iSukarno), #357 (bayangan balikan). Balikan masih lembar kaku | #354 B balikan melengkung (pustaka baru) |
| 6 | Browser lain (Safari) tampilan berantakan | Kompatibilitas | Belum diperiksa. Tailwind 4.3 dan target bawaan Vite butuh Safari 16.4 ke atas; iPhone lebih lama kemungkinan rusak total | Uji WebKit (Playwright) dan putuskan batas versi |
| 7 | Animasi flipbook di semua bagian belum sempurna, kaku | Flipbook | Sama dengan #5 (dua penguji) | Sama dengan #5 |
| 8 | Mini project: apakah mahasiswa bisa menerima feedback; UI/UX lebih mudah dipahami | Mini Projek | Ada: teks "Umpan balik dosen" per kiriman (MiniProjek.tsx:306, 585) dan kabar di lonceng; tampil sebagai satu baris teks | Kartu umpan balik tersendiri dengan tanggal, status baca, dan tombol balas |
| 9 | Unduh file hasil feedback sebaiknya lewat preview dulu | Mini Projek | Belum: "Unduh Berkas Saya" mengunduh langsung | Pakai `PdfPreviewLink` yang sudah ada untuk PDF |
| 10 | Halaman login: tampilan dan animasi tidak rapi | Login | Belum; #352 hanya hover dan fokus kotak | Perlu contoh konkret: bagian mana yang tidak rapi dan di perangkat apa |
| 11 | Menu Kirim: saran dan laporan bug dari pengguna | Fitur baru | Belum ada | Menu baru + tabel `laporan` (+1 SQL) |
| 12 | Dashboard: notifikasi jadwal terdekat dan tugas belum selesai, dengan persen selesai | Notifikasi | Sebagian: #353 (lonceng) memuat modul belum selesai, video, jadwal terdekat; persen total belum ada di notifikasi | Tambah baris "N% selesai" di lonceng dan kartu dashboard |
| 13 | Refresh halaman asesmen mereset tes dan soal berganti | Simpan jawaban | Selesai #355: soal, urutan, dan jawaban tersimpan di perangkat | Tidak ada |
| 14 | Opsi notifikasi yang bisa di-toggle per jenis, bebas dimatikan | Notifikasi | Sebagian: #360 dan #360 B (satu saklar semua notifikasi, ikut akun) | Saklar per jenis: pengingat dosen, belajar, jadwal, Mini Projek |
| 15 | Tes asesmen awal menyimpan jawaban agar tidak mengulang dari awal saat lag atau refresh | Simpan jawaban | Selesai #355 | Tidak ada |

Butir kembar: 1, 13, dan 15 (simpan jawaban); 5 dan 7 (animasi flipbook); 12 dan 14 (notifikasi). Jumlah masukan unik 11 sampai 12.

## Keputusan Johan 8 Nov 2026

Butir 6 (Safari mobile) aman setelah uji iPhone nyata; butir 1 (responsif) cukup; butir 3 (loading lambat) belum ada bukti jaringan nyata. Ketiganya ditutup, `docs/pertanyaan-penguji.md` tidak dikirim. Batas yang diketahui: iOS di bawah 16.4 tidak diuji dan kemungkinan tidak jalan (Tailwind 4.3). Butir 4 (video ilustrasi) tetap ditutup sampai tahap video. Butir 8 dan 9 menunggu uji Johan dengan data nyata.
