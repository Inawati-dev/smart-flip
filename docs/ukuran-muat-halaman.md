# Ukuran muat halaman (angket butir 3, antrean #372)

Pengukuran 8 Nov 2026 dari `vite build` (gzip dihitung dari berkas `dist/`, bukan dari jaringan). Waktu muat di bawah adalah **TAKSIRAN**: ukuran dibagi kecepatan; tidak ada pengukuran di jaringan seluler nyata.

| Tahap | Isi | Ukuran gzip | Taksiran 3G cepat (400 kbps = 50 KB/s) | Taksiran 2G (100 kbps = 12,5 KB/s) |
|---|---|---|---|---|
| Muat awal (semua halaman) | index, runtime, query, react, supabase, icons, css | 175,9 KB | 3,5 detik | 14 detik |
| + Layout dan Dashboard | kerangka dan halaman pertama setelah masuk | 20,1 KB | 0,4 detik | 1,6 detik |
| + Pembaca PDF | pdf.js 88 KB + worker 284 KB | 372 KB | 7,4 detik | 30 detik |
| Pratinjau Word (baru #367) | mammoth, dimuat hanya saat pratinjau Word dibuka | 92 KB | 1,8 detik | 7,4 detik |
| Halaman tes (Formatif, AsesmenMhs) | satu per halaman | 2,9 dan 7,1 KB | di bawah 0,2 detik | di bawah 0,6 detik |

Temuan:
- Muat awal 176 KB sudah ringan; keluhan "susah loading dan harus direfresh" lebih cocok dengan paket halaman yang gagal diunduh saat sinyal putus-nyambung (diperbaiki #356: unduhan diulang dan modal koneksi) daripada ukuran paket.
- Bagian terberat adalah pembaca PDF: 372 KB gzip, terutama `pdf.worker` 284 KB, dan baru diunduh saat modul dibuka pertama kali. Di 3G cepat sekitar 7 detik sebelum halaman pertama muncul.
- Mammoth (pratinjau Word) tidak masuk muat awal.

Usulan (belum dikerjakan, menunggu Johan): unduh `pdf.worker` di latar begitu mahasiswa membuka daftar modul, supaya saat modul dibuka berkas itu sudah ada di singgahan peramban. Ukuran kecil; manfaat terbesar di jaringan lambat.
