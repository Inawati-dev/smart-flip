# Referensi Sumber — Smart Flipbook (SMART-FLIP 5.0)

Dibuat: 2026-08-07 · sesi: Smart Flipbook (worktree `strange-mclean-f2e790`) · aturan: `~/.claude/CLAUDE.md` section "Papan Pekerjaan, Referensi Sumber, Kejujuran Inventaris" · alasan & cara kerja: `kemampuan-workflow.md` §WF-206
Bangun HTML (tiap berkas ini berubah): `python "C:\1-Johan\10. Pengembangan\AI Skill\00 - Dokumentasi\build_html.py" --proyek "C:\1-Johan\10. Pengembangan\Smart Flipbook\docs\referensi_smart-flipbook.md"`

## Ringkasan

Proyek ini **tidak memanggil satu pun API pihak ketiga dari kode aplikasi**. Yang diperiksa untuk memastikannya:

- `grep -rEoh "https?://" src/` — hasilnya hanya 7 kemunculan, seluruhnya nilai dummy di berkas uji (`https://x/y.pdf`, `https://contoh.test/a.pdf`, `http://localhost/abc`), namespace SVG (`http://www.w3.org/2000/svg`), placeholder Supabase saat env kosong, dan satu tautan dokumentasi format changelog. Tidak ada endpoint nyata.
- `grep -rn "fetch(\|axios\|XMLHttpRequest" src/` — **nol hasil**. Semua trafik jaringan lewat klien `@supabase/supabase-js`.
- `package.json` — satu-satunya dependensi yang menyentuh jaringan saat runtime adalah `@supabase/supabase-js`. `pdfjs-dist` di-bundel lokal oleh Vite (worker-nya `?url` dari paket terpasang, bukan CDN).

Jadi sumber luar proyek ini seluruhnya berupa **layanan infrastruktur** (Supabase, Vercel, GitHub Actions), ditambah **dataset lokal** (PDF di `books/`) dan **referensi kepustakaan** (DOI jurnal) yang statusnya bermasalah — lihat dua section terakhir.

| Sumber | Jenis | Akses | Diambil / tersedia | Berkas lokal | Dipakai untuk | Diverifikasi |
|---|---|---|---|---|---|---|
| Supabase (PostgreSQL + Auth + Storage) | API layanan | auth (anon key di env) | 18 / 18 tabel · 3 / 3 bucket | — (data di server) | seluruh halaman aplikasi | 2026-08-07 |
| Vercel | hosting/deploy | auth (akun Inawati) | — | — | produksi `smart-flips.vercel.app` | 2026-08-07 |
| GitHub Actions (`scan-books.yml`) | otomasi terjadwal | repo `Inawati-dev/smart-flip` | — | `config.json` | **tidak ada yang membaca** — lihat catatan | 2026-08-07 |
| Berkas PDF `books/` | dataset lokal | berkas repo | 8 / 8 berkas | `books/*.pdf` | **tidak dibaca aplikasi React** | 2026-08-07 |
| DOI jurnal (27 tautan) | referensi kepustakaan | publik (doi.org) | 0 / 27 sampai ke produksi | `legacy/modules-data.js` | halaman Modul — **selalu kosong** | 2026-08-07 |
| SAKTI (proyek sendiri) | referensi desain | repo lokal | — | — | pola sidebar & badge logo | 2026-08-07 |

## Peta halaman → sumber

Semua halaman membaca dari Supabase lewat `src/lib/*.ts`. Tidak ada satu pun halaman yang menjahit dua sumber — tiap ruas berasal dari satu tabel.

| Halaman / fitur | Berkas data yang dibaca | Sumber asal | Jahitan? | Diverifikasi |
|---|---|---|---|---|
| Login `/` | `profiles` (via Auth) | Supabase | tidak | 2026-08-07 |
| Registrasi `/register` | `dosen_invite_codes` (via RPC `verify_dosen_invite_code`), `classes` | Supabase | tidak | 2026-08-07 |
| Dashboard `/dashboard` | `user_progress`, `modules`, `classes` | Supabase | tidak | 2026-08-07 |
| Katalog Modul `/ebook` | `modules.pdf_path` → bucket `modul-pdf` | Supabase | tidak | 2026-08-07 |
| Modul `/modul/:id` | `modules` (+ `user_progress`) | Supabase | tidak — **tapi 6 ruas selalu kosong**, lihat §Ruas hantu | 2026-08-07 |
| Kuis `/modul/:id/kuis` | `quiz_questions`, `quiz_attempts` | Supabase | tidak | 2026-08-07 |
| Workshop `/modul/:id/workshop` | `workshop_content` + fallback statis `src/lib/workshop.ts` | Supabase + kode | tidak (fallback, bukan jahitan — DB menang penuh kalau ada barisnya) | 2026-08-07 |
| Diagnostik `/diagnostik` | `diagnostic_questions` + fallback statis `src/lib/diagnostic.ts` | Supabase + kode | tidak (fallback penuh, sama seperti Workshop) | 2026-08-07 |
| Forum `/forum` | `forum_posts` | Supabase | tidak | 2026-08-07 |
| Draf `/draf` | `drafts`, `draft_comments` | Supabase | tidak | 2026-08-07 |
| Projek Akhir `/projek-akhir` | `final_projects` → bucket `projek-akhir` | Supabase | tidak | 2026-08-07 |
| Aktivitas Mandiri `/observasi` | `observasi_tugas`, `observasi_submissions` → bucket `observasi-file` | Supabase | tidak | 2026-08-07 |
| Asesmen `/asesmen` | `quiz_attempts`, `observasi_*`, `ngain_entries`, `ngain_config` | Supabase | tidak | 2026-08-07 |
| Analitik `/analitik` | `profiles`, `user_progress`, `quiz_attempts`, `feedback`, `classes` | Supabase | tidak | 2026-08-07 |
| Kelas `/kelas` | `classes`, `profiles` | Supabase | tidak | 2026-08-07 |
| Kelola Modul `/manajemen` | `modules`, `quiz_questions`, `diagnostic_questions`, `workshop_content`, bucket `modul-pdf` | Supabase | tidak | 2026-08-07 |
| Feedback `/feedback` | `feedback` | Supabase | tidak | 2026-08-07 |
| Gaya Belajar `/vark` | `profiles.learning_style` | Supabase | tidak | 2026-08-07 |
| Validasi Ahli `/validasi` | localStorage (belum ada tabel) | lokal peramban | tidak | 2026-08-07 |
| Pengaturan `/pengaturan` | `dosen_invite_codes` (via RPC get/set) | Supabase | tidak | 2026-08-07 |
| Changelog `/changelog` | konstanta di `src/pages/Changelog.tsx` | kode | tidak | 2026-08-07 |

## Supabase (PostgreSQL + Auth + Storage)

- **URL / endpoint:** dari env `VITE_SUPABASE_URL`; kunci anon dari `VITE_SUPABASE_ANON_KEY`. Nilai aslinya **tidak dicatat di berkas ini** (rahasia; tersimpan di Vercel → Settings → Environment Variables, scope Production).
- **Jenis:** API layanan (PostgREST + GoTrue + Storage)
- **Akses & batasan:** auth via kunci anon + RLS per baris. **Paket Free — project otomatis di-pause setelah ~7 hari tanpa aktivitas API.** Terbukti nyata 2026-08-06: login produksi gagal "Failed to fetch" karena project berstatus paused; pulih setelah "Resume project" dari dashboard Supabase.
- **Berkas lokal:** tidak ada — seluruh data tinggal di server. Klien: `src/lib/supabase.ts:1-11`.
- **Dipakai untuk:** semua halaman kecuali Changelog dan Validasi Ahli.
- **Bukti di kode:** `src/lib/supabase.ts:3-4` (baca env), `src/lib/modules.ts:44`, `src/lib/analitik.ts:257-268`, `src/lib/asesmen.ts:86-99`, `src/lib/observasi.ts`, `src/lib/projekAkhir.ts`, `src/lib/inviteCode.ts:30`.

| Tersedia (inventaris lengkap) | Diambil? | Alasan / bukti | Keputusan |
|---|---|---|---|
| `profiles` | ✅ diambil | identitas, peran, kelas, gaya belajar | dipakai |
| `modules` | ✅ diambil | metadata modul + `pdf_path` | dipakai |
| `quiz_questions` | ✅ diambil | bank soal kuis per modul | dipakai |
| `quiz_attempts` | ✅ diambil | hasil kuis; sumber tab Tes Formatif & Pilihan Ganda | dipakai |
| `user_progress` | ✅ diambil | progres & waktu belajar | dipakai |
| `drafts`, `draft_comments` | ✅ diambil | asistensi draf per modul | dipakai |
| `forum_posts` | ✅ diambil | diskusi per modul | dipakai |
| `feedback` | ✅ diambil | penilaian kepraktisan | dipakai |
| `classes` | ✅ diambil | rombongan belajar + kode gabung | dipakai |
| `diagnostic_questions` | ✅ diambil | tes penempatan | dipakai |
| `workshop_content` | ✅ diambil | konten workshop per modul | dipakai |
| `ngain_entries`, `ngain_config` | ✅ diambil | lembar kerja N-Gain | dipakai |
| `dosen_invite_codes` | ✅ diambil (lewat RPC) | tabel sengaja tanpa policy; hanya 3 RPC pintunya | migration v16 |
| `observasi_tugas`, `observasi_submissions` | ✅ diambil | aktivitas mandiri observasi lapangan | migration v14 |
| `final_projects` | ✅ diambil | proposal projek akhir | migration v15 |
| bucket `modul-pdf` (publik) | ✅ diambil | PDF modul | migration v3 |
| bucket `observasi-file` (publik) | ✅ diambil | unggahan hasil observasi | migration v14 |
| bucket `projek-akhir` (privat) | ✅ diambil | proposal; diunduh lewat signed URL | migration v15 |

Tidak ada tabel atau bucket yang sengaja dilewatkan — seluruh 18 tabel dan 3 bucket dipakai.

## Ruas hantu di tabel `modules` — halaman Modul membaca kolom yang tidak ada

**Temuan saat menyusun berkas ini. Bukan permintaan tugas, tapi langsung menyangkut "halaman ini dibangun dari data mana", jadi dicatat.**

`src/lib/modules.ts:26-40` (`normalizeModuleRow`) membaca **14 ruas**, sedangkan `database/schema.sql:20-29` cuma mendefinisikan **8 kolom**. Enam ruas sisanya tidak pernah ada di skema, dan tidak ada satu pun migration yang menambahkannya (`grep "ALTER TABLE modules" database/*.sql` cuma menemukan baris `ENABLE ROW LEVEL SECURITY`).

| Ruas dibaca kode | Ada di skema? | Akibat di produksi | Dirender di |
|---|---|---|---|
| `id`, `order_num`, `title`, `description`, `video_url`, `pdf_path`, `is_active` | ✅ ada | normal | seluruh halaman modul |
| `capaian` (**CPMK / tujuan pembelajaran**) | ❌ tidak ada | selalu `[]` | `src/pages/Modul.tsx:218` |
| `materi` (daftar sesi/topik) | ❌ tidak ada | selalu `[]` | `src/pages/Modul.tsx:140` |
| `jurnal` | ❌ tidak ada | selalu `[]` → tampil "Belum ada referensi jurnal." | `src/pages/Modul.tsx:88-102` |
| `studiKasus` | ❌ tidak ada | selalu `[]` | `src/pages/Modul.tsx:104-105` |
| `sub`, `color`, `videoId` | ❌ tidak ada | selalu nilai bawaan | kartu & header modul |

Ini satu keluarga dengan bug `modules.kuis` yang sudah diperbaiki di v1.1.0 (kuis dialihkan ke tabel `quiz_questions`); lima ruas sisanya tidak ikut diperbaiki waktu itu.

**Kaitan langsung dengan backlog CPMK.** Dokumen *Konsep Modul Flip Book 5.0* meminta tiap modul memuat "tujuan pembelajaran; cpmk dan sub cpmk". Ruas `capaian` sebenarnya sudah dirender di halaman Modul — yang belum ada cuma tempat menyimpannya. Jadi hambatannya bukan hanya "belum ada contoh isi", tapi juga belum ada kolom/tabelnya.

**Status: belum diputuskan.** Perlu keputusan Johan sebelum dikerjakan — apakah ditambah sebagai kolom JSONB di `modules`, atau tabel terpisah seperti `quiz_questions`. Tidak diputuskan sendiri.

## Berkas PDF di `books/`

- **Jenis:** dataset lokal (berkas repo)
- **Akses & batasan:** berkas biasa di repo; `books/` sebagian di-gitignore.
- **Berkas lokal:** 8 berkas terdaftar di `config.json`.
- **Dipakai untuk:** **tidak ada.** Aplikasi React membaca PDF modul dari `modules.pdf_path` (bucket Storage `modul-pdf`), bukan dari `books/`. `grep -rn "config.json\|booksFolder" src/` hanya menemukan penyebutan di teks Changelog, bukan pembacaan data.
- **Bukti di kode:** pembacanya cuma `legacy/script.js` (situs vanilla yang sudah dipensiunkan).

| Tersedia (inventaris lengkap) | Diambil? | Alasan / bukti | Keputusan |
|---|---|---|---|
| `01. Investing Ideas .pdf` | ❌ tidak dibaca aplikasi | terdaftar di `config.json`, tapi `config.json` tidak dibaca `src/` | **belum diputuskan** |
| `01. Street Investing.pdf` | ❌ tidak dibaca aplikasi | idem | **belum diputuskan** |
| `03. The Fundamental Puzzle.pdf` | ❌ tidak dibaca aplikasi | idem | **belum diputuskan** |
| `125. The Psychology of Money (Morgan Housel).pdf` | ❌ tidak dibaca aplikasi | idem | **belum diputuskan** |
| `FAKTUR FV 8 JUNI 2026.pdf` | ❌ tidak dibaca aplikasi | idem — **lihat catatan di bawah** | **belum diputuskan** |
| `Investasi-Saham.pdf` | ❌ tidak dibaca aplikasi | idem | **belum diputuskan** |
| `LPEM_PDB_Q1_2026_English_FINAL_2_edit-revisi-preview-2.pdf` | ❌ tidak dibaca aplikasi | idem | **belum diputuskan** |
| `analisis_pdb_q1_2026-1.pdf` | ❌ tidak dibaca aplikasi | idem | **belum diputuskan** |

**Dua hal yang perlu keputusan Johan, bukan diputuskan agen:**

1. Isi `books/` seluruhnya bertema keuangan/investasi dan ekonomi makro — tidak ada kaitannya dengan Metode Penelitian & Pengembangan yang jadi materi SMART-FLIP. Dugaan (belum dikonfirmasi): sisa dari flipbook generik sebelum proyek ini menjadi e-modul R&D. Perlu konfirmasi sebelum dihapus.
2. `FAKTUR FV 8 JUNI 2026.pdf` terbaca sebagai **dokumen faktur/keuangan Fakultas Vokasi**, bukan bahan ajar. Namanya tercatat di `config.json` yang ikut ter-commit ke repo. Isinya tidak saya buka. Perlu dicek Johan apakah berkasnya sendiri ikut ter-commit dan apakah bersifat rahasia.

## GitHub Actions — `scan-books.yml`

- **URL / endpoint:** repo `Inawati-dev/smart-flip`, workflow `.github/workflows/scan-books.yml`
- **Jenis:** otomasi terjadwal
- **Akses & batasan:** `cron: '*/30 * * * *'` — jalan tiap 30 menit, plus tiap push ke `books/**`, plus manual.
- **Berkas lokal:** menulis `config.json` lewat `scan_books.py`.
- **Dipakai untuk:** **tidak ada konsumen yang hidup.** Keluarannya (`config.json`) cuma dibaca `legacy/script.js`.
- **Bukti di kode:** `.github/workflows/scan-books.yml:5-6`, `scan_books.py:11-12`.

**Angka yang perlu diketahui Johan:** `git log --oneline --all | grep -c "auto-update book catalog"` = **883 commit**. Semuanya memperbarui berkas yang tidak dibaca aplikasi produksi.

**Status: belum diputuskan.** Pilihannya mematikan jadwal cron-nya, atau membiarkan. Tidak dimatikan sendiri.

## DOI jurnal (referensi kepustakaan)

- **URL / endpoint:** 27 tautan `https://doi.org/...` (jurnal pendidikan Indonesia: JPNK, JPP, JTP, JPV, Cakrawala Pendidikan, dll.)
- **Jenis:** referensi kepustakaan
- **Akses & batasan:** publik lewat doi.org. **Belum pernah diuji resolusinya dari sesi ini** — tidak ada satu pun DOI yang saya buka untuk memastikan artikelnya benar ada dan judul/penulisnya cocok.
- **Berkas lokal:** `legacy/modules-data.js` (27 kemunculan `doi:`).
- **Dipakai untuk:** **tidak sampai ke produksi.** Halaman Modul membacanya dari `modules.jurnal`, kolom yang tidak ada di skema (lihat §Ruas hantu) — jadi bagian Jurnal selalu menampilkan "Belum ada referensi jurnal."
- **Bukti di kode:** `legacy/modules-data.js:94,102,110,212,220,…`; render di `src/pages/Modul.tsx:88-102`; sanitasi protokol di `src/pages/Modul.tsx:11-15`.

| Tersedia (inventaris lengkap) | Diambil? | Alasan / bukti | Keputusan |
|---|---|---|---|
| 27 DOI jurnal di `legacy/modules-data.js` | ❓ belum diuji | belum ada satu pun yang diresolusi untuk verifikasi | **belum diputuskan** |
| 18 studi kasus di berkas yang sama | ❓ belum diuji | idem; juga tidak sampai produksi | **belum diputuskan** |

**Catatan kejujuran.** Memori sesi sebelumnya menyebut DOI di `modules-data.js` berstatus *unverified*, dan berbeda dari ~30 sitasi naskah akademik yang penulisnya sudah cek ulang ke Scopus. Dua himpunan itu jangan dicampur: yang di naskah sudah diverifikasi penulis, yang 27 di kode ini belum. Berkas ini tidak mengklaim keduanya sama.

## Referensi desain (proyek sendiri, bukan sumber data)

- **SAKTI (Tracing Keuangan)** — `C:\1-Johan\10. Pengembangan\SAKTI - Tracing Keuangan`. Pola sidebar (icon-rail + flyout, kartu profil di dasar) dan bentuk badge logo diadaptasi dari sini. Bukti: `src/components/AuthShell.tsx:5-8` ("echoes SAKTI's IconRailV2 sidebar badge"), `src/components/Layout.tsx:52`.
- **Registri.148 / react-reui-sample** — `AI Skill\04 - Referensi\Referensi UI Standar\react-reui-sample`. Buku spesimen tabel/sidebar/kartu dipakai sebagai rujukan gaya. Tidak ada kode yang disalin ke proyek ini.

Keduanya referensi visual, tidak menyumbang satu pun angka atau baris data.

## Keputusan "tidak diambil" / ganti sumber / jahit

| Sumber · ruas | Jenis keputusan | Alasan | Bukti (tabel pembanding / angka) | Diputuskan oleh | Tanggal |
|---|---|---|---|---|---|
| `modules.capaian/materi/jurnal/studiKasus/sub/color/videoId` | kolom belum ada | dibaca kode, tidak ada di skema | `src/lib/modules.ts:26-40` vs `database/schema.sql:20-29`; `grep "ALTER TABLE modules"` nihil | **belum diputuskan** | 2026-08-07 |
| `books/*.pdf` (8 berkas) | tidak dibaca aplikasi | `config.json` hanya dibaca `legacy/script.js` | `grep -rn "config.json" src/` → nihil pembacaan data | **belum diputuskan** | 2026-08-07 |
| `books/FAKTUR FV 8 JUNI 2026.pdf` | perlu dicek kerahasiaannya | terbaca sebagai dokumen faktur, bukan bahan ajar | terdaftar di `config.json` yang ter-commit | **belum diputuskan** | 2026-08-07 |
| Cron `scan-books.yml` tiap 30 menit | keluaran tanpa konsumen | 883 commit memperbarui berkas yang tidak dibaca produksi | `git log --oneline --all \| grep -c "auto-update book catalog"` = 883 | **belum diputuskan** | 2026-08-07 |
| 27 DOI jurnal | belum diverifikasi | tidak ada yang diresolusi | `grep -c "doi" legacy/modules-data.js` = 27 | **belum diputuskan** | 2026-08-07 |

Tidak ada jahitan data di proyek ini: tiap ruas di tiap halaman berasal dari satu tabel Supabase. Fallback statis di Workshop dan Diagnostik bukan jahitan — DB menang penuh saat barisnya ada, konstanta hanya dipakai kalau tidak ada sama sekali.

## Riwayat

- 2026-08-07 — dibuat; sumber: 6; halaman dipetakan: 21; yang belum diputuskan: 5; jahitan: 0. Temuan tambahan saat penyusunan: 6 ruas `modules` dibaca kode tapi tidak ada di skema (menghambat backlog CPMK), dan cron 883 commit tanpa konsumen.
