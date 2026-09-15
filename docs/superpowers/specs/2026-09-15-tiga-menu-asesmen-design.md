# Spec: SMART-FLIP 5.0 Tiga Menu — Video, Modul, Asesmen

Tanggal: 15 September 2026. Penulis: Claude (sesi Smart Flipbook), atas permintaan Johan.
Sumber keputusan: `docs/antrean-permintaan.md` #2–#16. Mockup: https://claude.ai/artifact/NxBQfhQYjKNhhdVmPynQab (versi 4, sesuai revisi ini).
**Status 15 Sep 2026 malam:** semua paket dikode dan tayang (commit `ad8996e`, bundle `index-D1V2kYaX.js`). Migrasi v17 sudah dijalankan; v18 dan v19 menunggu Johan. Rincian pelaksanaan: `docs/jejak-permintaan.md` #12–#13.

Revisi 15 Sep 2026 sore: pre-test tanpa kode; kode hanya untuk halaman tes khusus; menu sama untuk semua peran (Dashboard · Modul · Video · Asesmen); Dashboard dosen = aktivitas kelas.

Dokumen ini ditulis supaya tiap paket kerja bisa dikirim ke agen pelaksana tanpa membaca percakapan. Tiap paket menyebut berkas yang disentuh, pola yang ditiru, langkah verifikasi, dan kriteria terima yang bisa dijalankan orang lain.

## 0. Keputusan desain (semua sudah diputuskan)

| Kode | Pertanyaan | Opsi | Rekomendasi | Status |
|---|---|---|---|---|
| D1 | Apa itu "mata kuliah" di data? DB sekarang tidak punya entitas mata kuliah; hanya `classes` (kelas) dan satu kurikulum 9 modul | **A:** satu mata kuliah sekarang, satu pre-test; kolom `course_id` disiapkan tapi belum dipakai. **B:** tabel `courses` sekarang, modul dan pre-test menempel ke course | A. Aplikasi hanya punya satu kurikulum (9 modul R&D). B menambah 1 tabel, 3 kolom, 4 kebijakan RLS, dan layar kelola mata kuliah, tanpa pemakai kedua | **Diputuskan A** (Johan, 15 Sep 2026) |
| D2 | Tata letak: A Sidebar Ringkas, B Rak Sampul, C Jalur Pertemuan | lihat mockup | B | **Diputuskan C · Jalur Pertemuan** (Johan, 15 Sep 2026: "D2 pilih C"). Rekomendasi B tidak dipakai; tidak dibahas ulang |
| D3 | Ambang lulus 80 diberlakukan ke pengerjaan lama? Kolom `quiz_attempts.passed` dihitung DB dari skor. Kalau rumusnya diganti ke ≥80, pengerjaan lama berskor 60–79 berubah jadi "belum lulus" | **A:** ganti rumus di DB, data lama ikut berubah (konsisten). **B:** kolom baru `passed_80`, kolom lama tetap (dua kebenaran) | A. Data produksi saat ini data uji coba, bukan data riset final | **Diputuskan A** (Johan, 15 Sep 2026) |
| D5 | Kode tes berlaku untuk tes mana? | — | — | **Diputuskan** (Johan, 15 Sep 2026): pre-test dan formatif tanpa kode. Kode hanya untuk **halaman tes khusus** yang dibuat dosen (§4.6) |
| D6 | Post-test dijalankan lewat halaman tes khusus berkode, atau terbuka otomatis sesudah topik 9 seperti pre-test? | **A:** lewat halaman tes khusus (dosen membuat sesi post-test + kode, dikerjakan serentak di kelas). **B:** terbuka otomatis, tanpa kode | A. Post-test menutup pengukuran peningkatan skor; dikerjakan serentak lebih adil dan dosen tahu kapan datanya lengkap | **Diputuskan A** (Johan, 15 Sep 2026: "D6 pilih A") |
| D4 | Tes diagnostik 15 soal: tetap dipakai sebagai penentu jalur cepat/mendalam, atau diganti pre-test? | **A:** diganti; pre-test jadi satu-satunya gerbang. Jalur cepat/mendalam berhenti dihitung (halaman modul sekarang memakainya hanya untuk posisi satu section). **B:** keduanya wajib berurutan: pre-test lalu diagnostik | A | **Diputuskan A** (Johan, 15 Sep 2026) |

Semua keputusan D1–D6 sudah diambil (15 Sep 2026). Tidak ada yang memblokir. Eksekusi menunggu kata "kerjakan".

## 1. Tujuan

Mahasiswa masuk, mengerjakan pre-test satu kali (tanpa kode), lalu belajar topik demi topik. Tiap topik = satu modul: baca modul PDF, tonton video, kerjakan tes formatif (asesmen sesudah belajar). Skor ≥80 membuka topik berikutnya dan memunculkan modal apresiasi. Skor <80 = remedial: kerjakan ulang dengan soal yang diacak. Sesudah topik terakhir, post-test. N-Gain dihitung otomatis dari pre dan post.

Menu sama untuk semua peran, urutannya tetap: **Dashboard · Modul · Video · Asesmen**, ditambah Akun. Dosen (= admin, tanpa peran baru) melihat isi kelola di menu yang sama: Modul (PDF per modul), Video (tautan per modul), Asesmen (hasil kelas + bank soal + tes khusus berkode), dan Dashboard berisi seluruh aktivitas kelas. Bank soal adalah satu layar dengan modal untuk semua jenis soal: pre-test, formatif per modul, post-test, diagnostik, VARK.

### 1.1 Istilah di antarmuka

Di layar aplikasi tidak ada kata "N-Gain" (Johan, 15 Sep 2026: sulit dicerna). Yang tampil: **"peningkatan skor"** = kenaikan dari pre-test ke post-test dibanding ruang naik yang tersisa, dengan kategori tinggi (0,7 ke atas), sedang (0,3–0,7), rendah (di bawah 0,3), dan satu kalimat contoh angka di dekatnya. Rumusnya tetap (post − pre) ÷ (100 − pre); nama "N-Gain (Hake)" hanya dipakai di kode (`src/lib/ngain.ts`), laporan riset, dan dokumen ini.

## 2. Keputusan yang sudah diambil

| # | Keputusan | Sumber |
|---|---|---|
| 1 | Menu sama untuk semua peran: Dashboard · Modul · Video · Asesmen, ditambah Akun (profil, pengaturan, kelas untuk dosen, keluar) | antrean #2, #6, #14 |
| 2 | Menu lain disembunyikan, bukan dihapus: Dashboard, Diagnostik (lihat D4), Forum, Draf, Feedback, Aktivitas Mandiri, Projek Akhir, Validasi Ahli, Analitik Kelas, Kelola Modul, Changelog, Workshop. Route, tabel, data tetap | antrean #2 |
| 3 | VARK tidak disembunyikan; ia tampil di Asesmen mahasiswa. 12 soalnya pindah dari kode ke bank soal | antrean #7 |
| 4 | Admin = peran `dosen`. Tidak ada peran baru, tidak ada migrasi peran | antrean #5, memori `admin-adalah-dosen` |
| 5 | N-Gain dihitung dari skor pre-test dan post-test, tidak diketik manual | antrean #4 |
| 6 | Tiga menu terpisah di navigasi, bukan tab di dalam satu halaman | antrean #6 |
| 7 | Satu CMS bank soal bermodal untuk semua jenis soal | antrean #7 |
| 8 | Ambang lulus formatif 80, soal diacak, modal apresiasi, remedial | antrean #10 |
| 9 | Satu mata kuliah sekarang; pre-test menggantikan diagnostik sebagai gerbang; ambang 80 berlaku ke data lama | D1, D3, D4 |
| 10 | Profil tetap ada untuk kedua peran, di menu Akun | antrean #11 |
| 11 | Dashboard menu pertama semua peran; Dashboard dosen berisi seluruh aktivitas kelas | antrean #12, #14, #15 |
| 12 | Kode tes hanya untuk halaman tes khusus yang dibuat dosen; pre-test dan formatif tanpa kode | antrean #13, D5 |

## 3. Peran dan akses

| Peran | Dashboard | Modul | Video | Asesmen | Akun |
|---|---|---|---|---|---|
| mahasiswa | posisi topik, langkah berikutnya, skor terakhir, tes khusus yang dibuka dosen | daftar 9 modul, baca flipbook | daftar 9 video, tonton | pre-test, VARK, formatif per topik, tes khusus (masukkan kode), post-test, skor sendiri | profil, progres, pengaturan, keluar |
| dosen | seluruh aktivitas kelas (§5.0) | daftar 9 modul + PDF, unggah/ganti PDF | daftar 9 modul + tautan video, ubah tautan | hasil kelas (pre, post, N-Gain, formatif per modul) + bank soal + tes khusus berkode | profil, pengaturan, kelas, kode undangan dosen, keluar |

Gerbang route memakai `ProtectedRoute roles={[...]}` yang sudah ada (`src/components/ProtectedRoute.tsx:9-16`). Kebijakan RLS bank soal: baca semua pengguna login, tulis hanya `role = 'dosen'`, meniru `database/migration_v4_diagnostic_adaptive.sql:24-35`.

## 4. Alur mahasiswa

### 4.0 Dashboard mahasiswa

Halaman pertama sesudah login (sesudah pre-test selesai). Isi: topik sekarang (nomor, judul), langkah berikutnya sebagai satu tombol besar ("Baca modul 4" → "Tonton video 4" → "Kerjakan formatif 4", ditentukan dari `user_progress` dan `quiz_attempts`), skor formatif terakhir, jumlah topik selesai dari 9, dan kartu "Tes khusus dari dosen" bila ada sesi tes aktif untuk kelasnya (§4.6). Tidak ada grafik.

### 4.1 Gerbang masuk

1. Login sukses → cek apakah ada baris `quiz_attempts` dengan `kind = 'pre'` milik pengguna.
2. Tidak ada → semua route selain `/asesmen/pre` dialihkan ke `/asesmen/pre`. Pola: `Dashboard.tsx:87-91` sekarang mengalihkan ke `/diagnostik` dengan cara yang sama; ganti tujuannya. Pre-test **tidak** memakai kode.
3. Ada → masuk ke Dashboard.
4. VARK tidak menggerbang. Ia tampil di Asesmen sebagai "Sebelum belajar", bisa dikerjakan kapan saja, satu kali (pola `profiles.vark_completed_at` sekarang).

### 4.2 Topik (modul) 1–9

Status tiap topik dihitung dari data, tidak disimpan:

| Status | Syarat |
|---|---|
| terbuka | topik 1: pre-test selesai. Topik n>1: ada `quiz_attempts` `kind='formatif'`, `module_id = n-1`, `score >= 80` |
| terkunci | syarat di atas tidak terpenuhi |
| selesai | ada pengerjaan formatif topik n dengan skor ≥80 |

Guard ada di tiga tempat: daftar Video, daftar Modul, daftar Asesmen (item terkunci tidak bisa diklik, berlabel "Selesaikan topik n-1 dulu"), dan di halaman detail (`/video/:id`, `/modul/:id`, `/asesmen/formatif/:id`) yang mengalihkan ke daftar kalau terkunci. Guard sisi klien saja; RLS baca modul tidak diubah. Alasannya: aplikasi riset, bukan ujian bersertifikat; penegakan di server butuh kebijakan RLS per baris progress dan tidak diminta.

Urutan yang disarankan di dalam topik: modul, lalu video, lalu formatif (Johan: "test setelah belajar dari modul dan video"). Tombol langkah berikutnya di Dashboard mengikuti urutan itu. Formatif **tidak** dikunci oleh modul/video selesai; ia hanya dikunci oleh topik sebelumnya (§4.2). Penguncian oleh modul/video bisa ditambah lewat baris antrean baru kalau diminta. Formatif tidak memakai kode.

### 4.3 Tes formatif

- Soal: semua baris bank soal `kind='formatif'`, `module_id = n`. Minimal 1 soal; kalau 0, halaman menampilkan "Dosen belum menyiapkan soal" dan tidak bisa dimulai.
- Acak: urutan soal dan urutan opsi diacak per pengerjaan dengan Fisher–Yates. Urutan yang dipakai disimpan di `quiz_attempts.question_order` (array `{question_id, option_order[]}`) supaya jawaban bisa diaudit. Skor dihitung dengan memetakan kembali `option_order`.
- Skor: `round(benar / jumlah_soal × 100)`, sama dengan `Kuis.tsx` sekarang.
- Ambang: `PASS_SCORE = 80` di `src/lib/quizAttempts.ts`; kolom DB `passed` dihitung `score >= 80`. Keduanya diberi komentar yang menunjuk satu sama lain (aturan memori `ui-dev-conventions` butir 6).

### 4.4 Sesudah formatif

- Skor ≥80: modal apresiasi. Isi: skor, kalimat apresiasi, tombol "Lanjut ke topik n+1" (atau "Lanjut ke post-test" di topik 9) dan "Tutup". Pola modal: `LogoutModal.tsx` + kelas `.modal-overlay`/`.modal-box` proyek.
- Skor <80: modal remedial. Isi: skor, syarat 80, soal yang salah tidak ditampilkan (supaya remedial tidak hafalan), tombol "Kerjakan ulang" (pengerjaan baru dengan acakan baru) dan "Baca modul lagi".
- Jumlah remedial tidak dibatasi. Skor terbaik yang dipakai untuk status topik.

### 4.5 Pre-test dan post-test

- Pre-test: bank soal `kind='pre'`, dikerjakan satu kali, diacak, tanpa ambang lulus, tanpa modal apresiasi. Sesudah kirim: skor ditampilkan, lalu tombol "Mulai belajar".
- Post-test: bank soal `kind='post'`, satu kali, diacak, **hanya lewat sesi tes khusus berkode** (D6 = A). Tidak terbuka otomatis sesudah topik 9; sebelum dosen membuka sesi, baris post-test di Asesmen mahasiswa berstatus "Menunggu sesi dari dosen". Sesudah kirim: skor, N-Gain pribadi = (post − pre) ÷ (100 − pre), kategori Hake (tinggi >0,7; sedang 0,3–0,7; rendah <0,3). Kalau pre = 100, N-Gain ditulis "—" (pembagi nol).
- "Satu kali" ditegakkan di klien (tombol hilang kalau sudah ada pengerjaan) dan di DB lewat indeks unik parsial `(user_id, kind) WHERE kind IN ('pre','post')`.

### 4.6 Tes khusus berkode

Halaman tes khusus adalah tes yang dibuat dosen untuk dikerjakan pada waktu tertentu (misalnya post-test serentak di kelas, atau tes tambahan). Hanya halaman ini yang memakai kode. Pre-test dan formatif tidak.

- Dosen membuat **sesi tes** di Asesmen → Tes khusus: nama sesi, sumber soal (bank soal `kind='post'`, atau pilihan soal formatif beberapa topik), kelas (satu atau semua kelas miliknya), berlaku dari–sampai, acak ya/tidak, satu kali ya/tidak. Kode dibuat otomatis: 6 karakter huruf besar dan angka tanpa 0/O/1/I (mis. `7K3MQ2`). Sesi bisa ditutup kapan saja.
- Mahasiswa membuka Asesmen → "Tes khusus" (atau kartu di Dashboard) → memasukkan kode → cocok (sesi aktif, dalam rentang waktu, kelas cocok dengan `profiles.class_id`) → soal terbuka → kirim → skor tersimpan sebagai `quiz_attempts` dengan `kind` sesuai sumber soal dan `session_id` terisi. Kode salah → "Kode tidak dikenal atau sesi sudah ditutup", tanpa batas percobaan.
- Tabel `test_sessions`: `id, name, kind ('post'|'campuran'), module_ids INT[] (untuk campuran), class_ids UUID[], code UNIQUE, is_open, open_from, open_until, shuffle BOOL, single_attempt BOOL, dosen_id, created_at`. `quiz_attempts` mendapat kolom `session_id` (nullable). RLS: dosen menulis dan membaca sesi miliknya; mahasiswa membaca hanya lewat RPC `verify_test_code(code)` SECURITY DEFINER yang mengembalikan `{session_id, kind, module_ids}` atau null, meniru RPC kode undangan v16 supaya daftar sesi tidak bisa dibaca massal.
- Hasil sesi tampil di Asesmen dosen per sesi: siapa sudah/belum, skor, rata-rata, unduh CSV.

## 5. Alur dosen

### 5.0 Dashboard dosen = seluruh aktivitas kelas

Halaman pertama sesudah dosen login. Satu halaman, empat bagian, semua dari data (tidak ada angka statis):

1. **Filter**: kelas (semua / satu) dan rentang waktu (7 hari, 30 hari, semester). Berlaku untuk semua bagian di bawah.
2. **Angka ringkas** (6 kartu): mahasiswa aktif 7 hari terakhir / total; pre-test selesai / total; topik rata-rata kelas (median topik tertinggi yang lulus); rata-rata formatif; remedial 7 hari terakhir; sesi tes khusus aktif.
3. **Umpan aktivitas** (terbaru di atas, 50 baris, muat lagi): satu baris per kejadian: waktu, nama, kelas, kejadian. Jenis kejadian dan sumbernya: pre-test selesai (`quiz_attempts kind='pre'`); formatif lulus / remedial (`quiz_attempts kind='formatif'`, skor); post-test / tes khusus selesai (`quiz_attempts.session_id`); modul dibaca sampai halaman n (`user_progress.last_page`, `updated_at`); video ditonton (baris baru `video_progress`: `user_id, module_id, seconds, done, updated_at`, ditulis dari pemutar tiap 30 detik); VARK selesai (`profiles.vark_completed_at`); mahasiswa baru bergabung ke kelas (`profiles.created_at`, `class_id`). Semua diambil oleh satu fungsi `fetchAktivitasKelas(filter)` yang menggabungkan lima query dan mengurutkan menurut waktu; RLS `is_dosen_of()` yang ada membatasi ke kelas milik dosen.
4. **Perlu perhatian**: belum pre-test; tidak aktif >7 hari; remedial >2 kali pada satu topik; sesi tes khusus yang berakhir <24 jam dengan peserta belum lengkap. Tiap baris punya tautan ke mahasiswa/sesi terkait.
5. **Progres per mahasiswa per topik**: tabel mahasiswa × 9 topik, sel berisi status (lulus / remedial / belum), bisa diurutkan, unduh CSV. Ini menggantikan tabel di Analitik lama.

Jalan pintas (Bank soal, Tes khusus, Unggah PDF, Tautan video, Kelas) tetap ada di bagian atas, satu baris tombol.

Pola: `Dashboard.tsx:48-73` (`DosenHome`), `RecentActivityCard.tsx`, `analitik.ts:254-284` (query gabungan), `is_dosen_of()` (migration v13).

### 5.1 Video
Tabel 9 modul: nomor, judul, tautan video (`modules.video_url`), status (tayang / belum ada tautan). Tombol "Ubah" membuka modal satu input URL. Terima URL YouTube (`youtube.com/watch?v=`, `youtu.be/`) dan URL langsung `.mp4`. Mahasiswa melihat embed `<iframe>` YouTube atau `<video>` untuk `.mp4`.

### 5.2 Modul
Tabel 9 modul: nomor, judul, berkas PDF (`modules.pdf_path`), halaman, diperbarui. Tombol "Ganti PDF" memakai `uploadModulPdf`/`assignModulPdf` yang sudah ada (`src/lib/manajemen.ts:182-235, 289-295`). Ubah judul/deskripsi lewat modal yang sudah ada di Manajemen (`Manajemen.tsx:527-553`), dipindah ke halaman ini.

### 5.3 Asesmen
Halaman hasil: tiga angka (rata-rata pre, rata-rata post, N-Gain kelas), sebaran N-Gain tiga kategori, tabel per mahasiswa (pre, post, N-Gain, kategori), tabel formatif per modul (pengerjaan, rata-rata, % lulus ≥80). Semua dari `quiz_attempts`, dibatasi RLS `is_dosen_of()` yang sudah ada (migration v13). Tombol "Unduh CSV" memakai pola `Analitik.tsx` sekarang.

Tombol "Bank soal" membuka layar bank soal (§6).

## 6. Bank soal (CMS)

Satu layar, filter jenis: Pre-test · Formatif (pilih modul) · Post-test · Diagnostik · VARK. Tabel: pegangan seret, nomor, pertanyaan, kunci (atau label V/A/R/K untuk VARK), tombol Ubah dan Hapus.

Modal Tambah/Ubah: jenis (terkunci sesuai filter), modul (hanya formatif), pertanyaan (textarea), 4 opsi. Untuk pre/formatif/post/diagnostik: radio "Benar" di satu opsi, wajib diisi. Untuk VARK: opsi A/B/C/D berlabel tetap Visual/Auditory/Read-Write/Kinestetik, tanpa radio. Semua input `font-size: 16px` (aturan mobile proyek).

Modal hapus: konfirmasi wajib (aturan "Modal Wajib" CLAUDE.md proyek).

Seret untuk mengurutkan: pola dua fase yang sudah ada di `lib/manajemen.ts:350-371` dan `Manajemen.tsx:166-180`.

Sumber data per jenis:

| Jenis | Tabel | Catatan |
|---|---|---|
| pre, formatif, post, vark | `quiz_questions` + kolom baru `kind` | satu tabel, satu fungsi CRUD (`src/lib/kuisSoal.ts:64-94` diperluas) |
| diagnostik | `diagnostic_questions` | tabel dan CRUD yang ada dipakai apa adanya (`src/lib/diagnostic.ts:98-130`); tab Diagnostik memanggil fungsi itu. Kalau D4 = A, tab ini tetap ada tapi diberi catatan "tidak dipakai sebagai gerbang" |

## 7. Model data — migrasi v17

Berkas: `database/migration_v17_bank_soal.sql`. Idempoten (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`), mengikuti gaya migrasi v4 dan v11. SQL lengkap ditempel di obrolan saat WP2 selesai (aturan memori butir 5).

```sql
-- quiz_questions: satu bank untuk pre/formatif/post/vark
ALTER TABLE quiz_questions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'formatif'
    CHECK (kind IN ('pre','formatif','post','vark')),
  ALTER COLUMN module_id DROP NOT NULL,   -- sudah nullable di schema.sql; baris ini pengaman
  ALTER COLUMN answer_idx DROP NOT NULL;  -- VARK tidak punya kunci
-- formatif wajib punya modul; jenis lain wajib tanpa modul
ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_kind_module
  CHECK ((kind = 'formatif') = (module_id IS NOT NULL));
-- kunci wajib kecuali VARK
ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_kind_answer
  CHECK ((kind = 'vark') = (answer_idx IS NULL));

-- quiz_attempts: jenis + urutan acak + ambang 80
ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'formatif'
    CHECK (kind IN ('pre','formatif','post')),
  ADD COLUMN IF NOT EXISTS question_order JSONB,
  ALTER COLUMN module_id DROP NOT NULL;
ALTER TABLE quiz_attempts DROP COLUMN passed;
ALTER TABLE quiz_attempts ADD COLUMN passed BOOLEAN
  GENERATED ALWAYS AS (score >= 80) STORED;   -- pasangan: PASS_SCORE di src/lib/quizAttempts.ts
CREATE UNIQUE INDEX IF NOT EXISTS quiz_attempts_one_pre_post
  ON quiz_attempts (user_id, kind) WHERE kind IN ('pre','post');

-- 12 soal VARK dari src/pages/Vark.tsx:14-123, kind='vark', answer_idx NULL, order_num 1..12
INSERT INTO quiz_questions (kind, question, options, answer_idx, order_num) VALUES (...)
ON CONFLICT DO NOTHING;
```

RLS `quiz_questions` sekarang ada di `migration_v10_quiz_questions_rls.sql`; diperiksa saat WP2, tidak diubah kecuali menghalangi baris `module_id NULL`.

Tabel `ngain_entries`/`ngain_config` tidak dihapus; halaman N-Gain manual ikut disembunyikan.

Kalau D1 = B: tambah tabel `courses` dan kolom `course_id` di `modules`, `quiz_questions`, `quiz_attempts`; indeks unik pre/post jadi `(user_id, kind, course_id)`. Dikerjakan sebagai WP2b terpisah.

## 8. Navigasi dan route

### 8.0 Tata letak: C · Jalur Pertemuan (D2)

Mengikuti mockup opsi C (versi 4):

- **Rel ikon** di kiri (lebar 72 px): lima ikon berlabel Dashboard, Modul, Video, Asesmen, Akun; ikon aktif berlatar `--brown`. Di telepon (≤640 px) rel pindah ke bawah layar sebagai bilah 5 tombol, tinggi 52 px, `position: sticky; bottom: 0`, di atas batas lipatan 810 px.
- **Deret pertemuan P1–P9** di atas isi menu Modul, Video, dan Asesmen: tombol bulat, bisa digulir mendatar di telepon. Pertemuan selesai berwarna sage, pertemuan aktif berlatar `--brown`, pertemuan terkunci pudar dan tidak bisa diklik (tooltip "Selesaikan topik n-1 dulu"). Deret ini satu komponen `PertemuanStepper` dipakai tiga menu; pertemuan yang dipilih disimpan di URL (`/modul/4`, `/video/4`, `/asesmen/formatif/4`), bukan di state global, supaya pindah menu tetap di pertemuan yang sama.
- **Isi satu pertemuan tampil penuh**: Modul = flipbook dua halaman (`Ebook.tsx` yang ada) + panel samping posisi baca; Video = pemutar besar 16:9 + panel samping "setelah video ini" dan dua pertemuan berikutnya; Asesmen = kartu tes formatif pertemuan itu + panel samping pre-test, VARK, post-test/tes khusus. Di telepon panel samping turun ke bawah pemutar/flipbook (satu kolom).
- **Dashboard dan Akun** tidak memakai deret pertemuan.
- Warna, huruf, dan token tetap milik proyek (`--cream`, `--ivory`, `--sage`, `--terra`, `--brown`, Playfair Display, DM Sans). Sampul biru tua/emas dari opsi B tidak dipakai kecuali di halaman login yang sudah ada.


`src/components/Layout.tsx:54-120` `NAV_SECTIONS` diganti tiga item + menu akun. Route lama di `src/App.tsx` tetap terdaftar (keputusan #2), hanya tidak ada tautannya. Route baru:

| Route | Peran | Halaman |
|---|---|---|
| `/video` | semua | daftar video (mhs) / kelola tautan (dosen) |
| `/video/:id` | mahasiswa | pemutar |
| `/modul` | semua | daftar modul (mhs) / kelola PDF (dosen). Menggantikan `/ebook` sebagai daftar; `/ebook` tetap jadi pembaca |
| `/asesmen` | semua | mahasiswa: daftar pre/VARK/formatif/post; dosen: hasil kelas |
| `/asesmen/pre`, `/asesmen/post` | mahasiswa | pengerjaan |
| `/asesmen/formatif/:id` | mahasiswa | pengerjaan formatif (menggantikan `/modul/:id/kuis`; route lama dialihkan ke sini) |
| `/asesmen/vark` | mahasiswa | halaman `Vark.tsx` yang ada, soal dari bank |
| `/asesmen/bank` | dosen | bank soal |
| `/asesmen/tes` | dosen | daftar sesi tes khusus + buat/tutup |
| `/asesmen/tes/:code` | mahasiswa | pengerjaan tes khusus (sesudah kode diverifikasi) |
| `/dashboard` | semua | dashboard mahasiswa (§4.0) / dashboard dosen (§5.0); route awal semua peran |
| `/akun` | semua | profil (menggantikan `/profil` di menu; `/profil` dialihkan ke `/akun`) |

Route awal sesudah login: `/dashboard` untuk semua peran (mahasiswa tanpa pre-test dialihkan ke `/asesmen/pre`). Menu semua peran, urutan tetap: Dashboard · Modul · Video · Asesmen · Akun.

## 9. Paket kerja

Urutan: WP1 → WP2 → (WP3, WP4, WP5, WP8 paralel) → WP6 → WP6b → (WP7, WP9 paralel). Tiap WP satu commit. Model pelaksana sesuai §Tiering: `sonnet` untuk WP yang keempat syarat speknya terpenuhi; alasan kenaikan ditulis di laporan.

| WP | Isi | Berkas | Pola yang ditiru | Verifikasi | Kriteria terima | Model |
|---|---|---|---|---|---|---|
| 1 | Kerangka tata letak C: rel ikon 5 menu (bawah di telepon), komponen `PertemuanStepper`, route baru dengan halaman placeholder, route awal `/dashboard`, menu lama hilang | `Layout.tsx`, `App.tsx`, `src/components/PertemuanStepper.tsx` (baru), `Layout.test.tsx` | `NAV_SECTIONS` yang ada; mockup opsi C (§8.0) | `npm test`, `npm run build`, dua viewport | `grep -c "to: '/" src/components/Layout.tsx` = 5; stepper menandai selesai/aktif/terkunci untuk 3 keadaan contoh; tangkapan layar 1536×960 dan 412×915, rel bawah tidak jatuh di bawah 810 px | sonnet |
| 2 | Migrasi v17 + `src/lib/kuisSoal.ts` dan `quizAttempts.ts` diperluas (kind, question_order, PASS_SCORE=80); seed VARK | `database/migration_v17_bank_soal.sql`, `src/lib/kuisSoal.ts`, `quizAttempts.ts`, tes | migrasi v4, v11; `kuisSoal.ts:64-94` | `npm test`; SQL dijalankan Johan di SQL Editor; `select kind, count(*) from quiz_questions group by kind` | vark = 12; `passed` untuk skor 79 = false, 80 = true (query contoh ditempel) | inherit (keputusan skema, D3) |
| 3 | Bank soal dosen: layar, filter, tabel, modal tambah/ubah/hapus, seret urutan; VARK membaca bank | `src/pages/BankSoal.tsx` (baru), `Vark.tsx`, `src/lib/vark.ts` | `Manajemen.tsx:119-219, 886-995` | `npm test`, dua viewport, coba tambah–ubah–hapus di dev server | 5 jenis tampil; hapus selalu lewat modal; `grep -n "const QUESTIONS" src/pages/Vark.tsx` = nol hasil | sonnet |
| 4 | Video: daftar + pemutar (mhs), kelola tautan (dosen) | `src/pages/Video.tsx` (baru), `src/lib/manajemen.ts` (+`saveVideoUrl`) | `Ebook.tsx` daftar; `saveModulCustom` | dua viewport; tautan YouTube dan `.mp4` contoh | iframe/video muncul; URL tidak valid ditolak dengan pesan | sonnet |
| 5 | Modul: daftar (mhs) dan kelola PDF (dosen) di `/modul`; `/ebook` tetap pembaca | `src/pages/ModulList.tsx` (baru), `Manajemen.tsx` (dipindah bagiannya) | `Ebook.tsx` katalog; `uploadModulPdf` | dua viewport; unggah PDF contoh | daftar 9 modul; PDF terbuka di pembaca | sonnet |
| 6 | Asesmen mahasiswa: gerbang pre-test, daftar, formatif acak, modal apresiasi/remedial, post-test, N-Gain pribadi, guard topik | `src/pages/Asesmen.tsx` (mhs), `Kuis.tsx` → `Formatif.tsx`, `src/lib/topik.ts` (baru: status topik), `Dashboard.tsx:87-91` | `Kuis.tsx`; `LogoutModal.tsx`; `ngain.ts:24-45` | `npm test` termasuk tes unit: shuffle menjaga kunci, status topik, N-Gain pre=100; dua viewport | skor 80 = modal apresiasi; 79 = modal remedial; `/modul/5` saat topik 4 belum lulus dialihkan; pre-test kedua ditolak DB | inherit (alur bercabang, guard) |
| 6b | Tes khusus berkode: migrasi `test_sessions` + kolom `quiz_attempts.session_id` + RPC `verify_test_code`, layar sesi tes dosen (tabel + modal buat/tutup + hasil per sesi), halaman masukkan kode dan pengerjaan di sisi mahasiswa | `database/migration_v18_test_sessions.sql`, `src/lib/testSessions.ts` (baru), `src/pages/TesKhusus.tsx` (baru), `Asesmen.tsx` | RPC kode undangan `migration_v16`, `src/lib/inviteCode.ts`; `Formatif.tsx` untuk pengerjaan | `npm test`; SQL dijalankan Johan; coba kode benar/salah/sesi ditutup | kode salah ditolak; kode aktif membuka tes; `quiz_attempts.session_id` terisi (query ditempel) | inherit (RLS + RPC) |
| 8 | Dashboard mahasiswa (§4.0) dan Akun untuk kedua peran | `src/pages/Dashboard.tsx` (bagian mahasiswa), `src/pages/Akun.tsx` (baru, memakai `Profil.tsx` yang ada) | `Dashboard.tsx:120-131`, `Profil.tsx` | `npm test`, dua viewport | tombol langkah berikutnya benar untuk 3 keadaan contoh (belum baca / sudah baca belum tonton / siap formatif); `/profil` dialihkan ke `/akun` | sonnet |
| 9 | Dashboard dosen = aktivitas kelas (§5.0): migrasi `video_progress`, `fetchAktivitasKelas`, filter, 6 angka, umpan aktivitas, perlu perhatian, tabel mahasiswa × topik, CSV | `database/migration_v19_video_progress.sql`, `src/lib/aktivitas.ts` (baru), `src/pages/Dashboard.tsx` (DosenHome), `src/pages/Video.tsx` (tulis progres) | `analitik.ts:254-284`, `RecentActivityCard.tsx`, `Analitik.tsx` (tabel + CSV) | `npm test` termasuk tes unit penggabungan/pengurutan umpan; angka dicocokkan dengan SQL; dua viewport | 6 angka sama dengan query SQL (ditempel); umpan memuat 7 jenis kejadian; tabel mahasiswa × 9 topik terisi | inherit (query gabungan lintas 5 tabel, keputusan bentuk umpan) |
| 7 | Asesmen dosen: hasil kelas dari `quiz_attempts`, N-Gain otomatis, CSV; N-Gain manual disembunyikan | `src/pages/Asesmen.tsx` (dosen), `src/lib/asesmen.ts`, `ngain.ts` | `asesmen.ts:58-83`, `analitik.ts:144-159` | `npm test`; angka dicocokkan dengan query SQL langsung | rata-rata dan N-Gain sama dengan hitungan SQL (query ditempel) | sonnet |

Pemeriksa akhir (aturan global): satu kali sebelum laporan batch, membuka diff dan menjalankan ulang minimal satu kriteria terima per WP.

## 10. Verifikasi lintas paket

- `npm run typecheck`, `npm test`, `npm run build` hijau.
- Dua viewport wajib: laptop `1536x960x1.25`, telepon `412x915x2.625,mobile,touch`; batas lipatan telepon 810 px. Desktop 1920 tidak diuji kecuali diminta.
- Sesudah push: cek bundle hash berubah di `https://smart-flips.vercel.app`, lalu buka halaman yang berubah (memori `git-push-workflow`).
- OG Data (antrean #1) tetap baris terpisah; tidak digabung ke sini.

## 11. Di luar lingkup

Peran admin terpisah; penegakan urutan di server (RLS per progress); mata kuliah kedua; pembatasan jumlah remedial; syarat "modul/video selesai" sebelum formatif; kode untuk pre-test atau formatif; hapus halaman lama; laporan akhir dan artikel ilmiah.
