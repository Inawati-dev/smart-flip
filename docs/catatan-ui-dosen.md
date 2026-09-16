# Catatan UI dari sesi halaman dosen (15–16 September 2026)

Rumah aturan tampilan yang diputuskan Johan saat meninjau akses dosen. Tiap butir menyebut asal permintaannya (nomor di `docs/antrean-permintaan.md`) dan komponen yang menjalankannya. Halaman mahasiswa belum disapu dengan aturan ini; ceklistnya ada di bagian akhir.

## 1. Komponen bersama, bukan gaya per halaman

| Aturan | Komponen | Asal |
|---|---|---|
| Semua dropdown memakai satu komponen; opsi berjarak 1 px; ukuran `sm` (36 px) untuk filter, `md` (44 px) untuk form | `src/components/Select.tsx` | #22, #23 |
| Semua kelompok pil memakai satu komponen; pil tidak aktif berlatar `ivory` supaya tidak menyatu dengan halaman | `src/components/PillGroup.tsx` | #24, #37 |
| Filter kelas selalu dua dropdown: Tahun (angkatan) lalu Kelas; kelas mengikuti tahun terpilih | `src/components/KelasTahunFilter.tsx`, `lib/kelas.ts` (`tahunUnik`, `namaKelasUnik`, `cocokFilter`) | #32 |
| Label kelas menyebut angkatan: "Kelas A · 2024" | `labelKelas()` di `lib/kelas.ts` | #23 |
| Tombol pratinjau berkas (PDF, video) membuka modal lebar (maks 1200 px / 96vw, tinggi 88dvh) dengan iframe atau pemutar, bukan tab baru; ada tautan "Buka di tab baru" | `src/components/PdfPreviewLink.tsx` (`PreviewLink`, `PreviewModal`) | #31, #36, #40 |
| Tombol: empat kelas bersama (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`) dengan hover, aktif, fokus; lebar tidak berubah saat label berganti | `src/index.css` | #45, #46 |

## 2. Navigasi

- Lima menu sama untuk semua peran, urutan tetap: Dashboard, Modul, Video, Asesmen, Akun; dosen dapat item keenam "PDF" (`/akun/pdf`). Rel 80 px, label 10 px, flyout nama + keterangan saat hover, ubin ikon bergradasi. Di telepon jadi bilah bawah 52 px. (#14, #25, #34)
- Hanya satu item aktif: awalan path terpanjang yang cocok (`activeTo` di `Layout.tsx`). (#39)
- Tombol Keluar hanya di rel dan bilah bawah. Kode undangan dosen hanya di Akun. (#29, #34)

## 3. Halaman dosen

- Akun memuat profil (modal ubah), kelas, progres mengajar, Tema, Kode undangan, Notifikasi; `/pengaturan` mengalihkan ke `/akun`. (#28, #33)
- Modul: tabel 9 modul, Tambah modul (dengan unggah PDF opsional), Ganti PDF, Ubah, Hapus dengan modal konfirmasi, ikon pratinjau. (#35, #43)
- Video: Tambah tautan atau unggah berkas (bucket `modul-video`, mp4/webm ≤ 100 MB); thumbnail muncul saat tautan ditempel; kolom Video bergambar dan bisa diputar lewat modal. (#36, #44)
- Asesmen: hasil kelas (pre, post, peningkatan skor), Bank soal 5 jenis bermodal, Tes khusus berkode. Kata "N-Gain" tidak dipakai di layar; istilahnya "peningkatan skor". (#4, #7, #13)
- PDF Modul (`/akun/pdf`): daftar berkas bucket, hapus dengan modal, pratinjau. (#27)

## 4. Tema dan warna

- Hanya dua tema: Light dan Dark. Tema lama yang tersimpan jatuh ke Light. (#38, #42)
- Warna tidak ditulis tetap di komponen. Latar, teks, bingkai memakai token dasar (`--cream`, `--ivory`, `--bg3`, `--brown`, `--brown2`, `--brown3`, `--border`); status memakai token semantik (`--success`, `--danger`, `--warning`, `--info` dan pasangan `-soft`); overlay modal `--overlay`; bayangan `--shadow-color`. Kelas Tailwind: `bg-success-soft text-success`, dst. (#41)
- Tombol utama memakai `--btn-bg` dan `--btn-text`, bukan `bg-brown`, supaya tetap kontras di Dark. (#41)

## 5. Bahasa antarmuka

- Tanpa tanda pisah panjang (—) di teks yang tampil; pakai titik, koma, titik dua, atau kurung. Simbol "—" hanya sebagai pengganti nilai kosong. (#17)
- Modal wajib untuk aksi hapus, keluar, dan simpan yang tidak bisa dibatalkan. Input di modal 16 px. Tap target 44 px. (aturan proyek, dipakai ulang)

## 6. Belum diterapkan di halaman mahasiswa (ceklist sapuan berikutnya)

Halaman mahasiswa yang tampil di menu: Dashboard (`DashboardMhs`), Modul (`Modul.tsx`, `Ebook.tsx`), Video (`Video.tsx` sisi mahasiswa), Asesmen (`AsesmenMhs.tsx`, `Formatif.tsx`, `SoalRunner.tsx`, `Vark.tsx`, `TesKhusus.tsx` sisi mahasiswa), Akun, Login/Register/Reset.

- [ ] Tombol memakai kelas `.btn-*` bersama dengan hover dan lebar tetap (#45, #46)
- [ ] Dropdown dan pil memakai `Select` / `PillGroup` (sudah sebagian; cek `Ebook.tsx` pil mode baca)
- [ ] Warna literal diganti token (sapuan #41 baru menyentuh berkas yang juga dipakai dosen)
- [ ] Modal pratinjau untuk berkas di sisi mahasiswa bila ada tautan berkas
- [ ] Cek Dark di dua ukuran layar untuk tiap halaman mahasiswa
- [ ] Teks tanpa tanda pisah (sudah disapu 16 Sep; ulangi bila ada teks baru)

Halaman tersembunyi (Forum, Draf, Feedback, Observasi, Projek Akhir, Validasi, Analitik, Manajemen, Kelas, Changelog, Diagnostik, Workshop, Ngain, Profil) sengaja tidak disapu; masih memakai gaya lama.
