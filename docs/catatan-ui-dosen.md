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
- Ubin ikon rel memakai token per tema `navTileBg/Bg2/Fg/ActiveBg/ActiveFg/ActiveRing` (bukan ivory/cream), supaya tetap terang di Dark; item aktif = tint aksen + cincin tipis + ikon dan label berwarna aksen, bukan ubin aksen penuh. (#50)
- Tombol Keluar hanya di rel dan bilah bawah. Kode undangan dosen hanya di Akun. (#29, #34)

## 3. Halaman dosen

- Akun memuat profil (modal ubah), kelas, progres mengajar, Tema, Kode undangan, Notifikasi; `/pengaturan` mengalihkan ke `/akun`. (#28, #33)
- Satuan per pertemuan disebut "topik" di semua teks pengguna; nama menu Modul dan Video tetap. Tambah topik, Ubah topik, Hapus topik. (papan #35)
- Modul: tabel 9 topik, Tambah topik (dengan unggah PDF opsional), Ganti PDF, Ubah topik, Hapus dengan modal konfirmasi, ikon pratinjau. (#35, #43)
- Unggah berkas selalu lewat `FileInput` (`src/components/FileInput.tsx`): tombol "Pilih ...", nama dan ukuran berkas, batas ukuran. Tidak ada `<input type="file">` polos di halaman yang tampil. (papan #36)
- Kolom Aksi tabel: header dan sel `text-center`, tombol berlabel plus ikon (`.btn .btn-secondary`, tinggi 44 px), hapus ikon saja (`.btn-danger .btn-icon`) dengan `aria-label`; di telepon label disembunyikan (`hidden sm:inline`). (papan #37)
- Pemisah baris tabel dan daftar memakai `.row-divider` (0,5 px); kepala halaman, kepala modal, dan footer aksi modal tetap 1 px. (papan #33)
- Video: Tambah tautan atau unggah berkas (bucket `modul-video`, mp4/webm ≤ 100 MB); thumbnail muncul saat tautan ditempel; kolom Video bergambar dan bisa diputar lewat modal. (#36, #44)
- Asesmen: hasil kelas (pre, post, peningkatan skor), Bank soal 5 jenis bermodal, Tes khusus berkode. Kata "N-Gain" tidak dipakai di layar; istilahnya "peningkatan skor". (#4, #7, #13)
- Berkas (`/akun/pdf`, rel "Berkas"): dua tab `PillGroup` berlencana, PDF topik dan Video topik; daftar berkas bucket, pratinjau, hapus dengan modal. (#27, papan #38)
- Dashboard dosen: Aktivitas, Perlu perhatian, Progres jadi tab `PillGroup` berlencana; tab tersimpan di `?tab=`. (papan #34)

## 4. Tema dan warna

- Hanya dua tema: Light dan Dark. Tema lama yang tersimpan jatuh ke Light. (#38, #42)
- Warna tidak ditulis tetap di komponen. Latar, teks, bingkai memakai token dasar (`--cream`, `--ivory`, `--bg3`, `--brown`, `--brown2`, `--brown3`, `--border`); status memakai token semantik (`--success`, `--danger`, `--warning`, `--info` dan pasangan `-soft`); overlay modal `--overlay`; bayangan `--shadow-color`. Kelas Tailwind: `bg-success-soft text-success`, dst. (#41)
- Tombol utama memakai `--btn-bg` dan `--btn-text`, bukan `bg-brown`, supaya tetap kontras di Dark. (#41)

## 5. Bahasa antarmuka

- Tanpa tanda pisah panjang (—) di teks yang tampil; pakai titik, koma, titik dua, atau kurung. Simbol "—" hanya sebagai pengganti nilai kosong. (#17)
- Modal wajib untuk aksi hapus, keluar, dan simpan yang tidak bisa dibatalkan. Input di modal 16 px. Tap target 44 px. (aturan proyek, dipakai ulang)

## 6. Sudah diterapkan di halaman mahasiswa (16 Sep 2026)

Halaman mahasiswa yang tampil di menu: Dashboard (`DashboardMhs`), Modul (`Modul.tsx`, `Ebook.tsx`), Video (`Video.tsx` sisi mahasiswa), Asesmen (`AsesmenMhs.tsx`, `Formatif.tsx`, `SoalRunner.tsx`, `Vark.tsx`, `TesKhusus.tsx` sisi mahasiswa), Akun.

- [x] Tombol memakai kelas `.btn-*` bersama dengan hover dan lebar tetap (#45, #46). Diubah: pil mode baca dan tombol zoom di `Ebook.tsx`, label "Ganti foto" di `Akun.tsx`. `PertemuanStepper` tetap bulat 44x44 (bukan `.btn`), fokusnya disamakan lewat kelas baru `.step-pill` di `index.css`. Bukti: `grep -rn "min-h-11 px-\|min-h-\[44px\] px-" src/pages/{Modul,Ebook,AsesmenMhs,Formatif,Vark}.tsx src/components/{SoalRunner,PertemuanStepper}.tsx` = 0 hasil.
- [x] Dropdown dan pil memakai `Select` / `PillGroup`. Pil mode baca `Ebook.tsx` (Flip 3D / Buka Buku / Geser) diganti `PillGroup` size `sm`. Tidak ada dropdown lain di jalur mahasiswa yang perlu diganti.
- [x] Warna literal diganti token. `ModuleCard.tsx` (`text-white` -> `text-btn-text`), `SoalRunner.tsx` (`bg-sage-d`/`bg-red` + `text-white` -> `bg-success`/`bg-danger` + `text-btn-text`, kontras dihitung WCAG: 5,26-10,76:1). VARK (`Vark.tsx`) tetap 4 warna identitas V/A/R/K mentah (tidak ada token yang cocok, lihat komentar di kode) tapi titik pakai yang duduk di atas latar bereaksi tema (label dimensi, angka batang rendah) dipindah ke `color-mix()` supaya terbaca di Dark (diverifikasi live: kontras naik dari ~3,7:1 jadi ~5,0:1 untuk R/K). `Video.tsx` masih punya 5 warna literal tapi semuanya di bagian `VideoDosen` (modal edit tautan + toast), di luar cakupan berkas ini (tugas ini dibatasi ke sisi mahasiswa saja), sengaja tidak diubah.
- [x] Modal aksi mahasiswa (apresiasi/remedial di `Formatif.tsx`, `LogoutModal.tsx`) diverifikasi memakai `var(--overlay)`, `var(--ivory)`, `.btn-*`, input 16px, sudah sesuai sejak sapuan dosen, tidak perlu diubah. `TesKhusus.tsx` sisi mahasiswa tidak punya modal (kode dimasukkan di kartu halaman, bukan overlay), tidak berlaku.
- [x] Dark dan Light dicek di 1536x960 dan 412x915 untuk semua 9 halaman/alur mahasiswa (lihat papan pekerjaan untuk detail temuan dan perbaikan).
- [x] Teks tanpa tanda pisah panjang: disapu ulang, 0 pelanggaran baru ditemukan di teks UI (label tombol, judul, pesan) di 9 berkas mahasiswa. Semua sudah memakai "belum", kalimat pendek, tanpa Title Case sejak sapuan 16 Sep sebelumnya.
- [ ] Modal pratinjau untuk berkas di sisi mahasiswa bila ada tautan berkas, tidak berlaku untuk halaman yang disapu sesi ini: `Ebook.tsx` dan `Video.tsx` (mahasiswa) ADALAH pembaca/pemutarnya sendiri, bukan tautan yang perlu modal pratinjau terpisah seperti di tabel dosen. Belum dicek untuk halaman tersembunyi (Forum, Draf, dst).

Halaman tersembunyi (Forum, Draf, Feedback, Observasi, Projek Akhir, Validasi, Analitik, Manajemen, Kelas, Changelog, Diagnostik, Workshop, Ngain, Profil) sengaja tidak disapu; masih memakai gaya lama.
