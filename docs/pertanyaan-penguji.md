# Pertanyaan lanjutan untuk penguji (angket #365)

Disiapkan 8 Nov 2026. Dikirim Johan sendiri ke penguji; jawabannya menentukan dua butir angket yang belum bisa dikerjakan tanpa data.

## Pesan siap kirim

> Terima kasih sudah menguji SMART-FLIP dan memberi saran. Agar perbaikannya tepat, boleh dibantu dua keterangan singkat?
>
> 1. **Perangkat dan Safari.** Kamu memakai Safari di perangkat apa (iPhone, iPad, atau Mac) dan versi berapa? (iPhone atau iPad: Pengaturan, Umum, Tentang, lihat "Versi iOS". Mac: menu Safari, Tentang Safari.) Halaman mana yang tampil berantakan, dan seperti apa (huruf terbalik, tombol bertumpuk, halaman kosong)? Tangkapan layar sangat membantu.
> 2. **Bagian yang terasa lambat.** Kamu bilang aplikasi perlu lebih interaktif dan responsif. Bagian mana yang terasa lambat atau kurang tanggap: saat membuka halaman, saat membalik halaman buku, saat mengerjakan tes, atau saat menekan tombol? Waktu itu kamu memakai wifi kampus atau data seluler?

## Cara membaca jawabannya

| Jawaban | Tindakan |
|---|---|
| iOS di bawah 16.4 | Aplikasi memakai Tailwind 4.3 yang butuh Safari 16.4 ke atas; putuskan apakah menampilkan pesan "perbarui peramban" atau menurunkan target build |
| iOS 16.4 ke atas, halaman buku atau login terbalik | Sudah diperbaiki #366 dan #371; minta penguji memuat ulang atau membuka tab baru |
| iOS 16.4 ke atas, masalah lain | Minta tangkapan layar; uji ulang di WebKit |
| Lambat di wifi kampus saat membuka halaman | Cek paket halaman gagal diunduh (#356) dan jaringan kampus |
| Lambat saat membalik halaman | Pembaca PDF memuat 372 KB gzip; pemanasan di latar sudah dibuat (#375) |
