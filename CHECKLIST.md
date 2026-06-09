# SMART-FLIP 5.0 — Checklist Pengembangan

> Penelitian Dana Internal UM 2026 — Fakultas Vokasi  
> Repo: github.com/JIAkbar/smart-flipbook  
> Stack: HTML/CSS/JS (GitHub Pages) + Supabase (PostgreSQL + Auth)

---

## FASE 0 — Setup Infrastruktur
- [x] Buat akun Supabase (gratis) di supabase.com
- [x] Buat project baru di Supabase → `smart-flip` (Singapore) · URL & key tersimpan di `supabase.js`
- [x] Jalankan SQL schema (lihat `database/schema.sql`) di Supabase SQL Editor — 8 tabel berhasil
- [ ] Aktifkan Email Auth di Supabase → Authentication → Providers
- [x] Buat file `supabase.js` dengan credential Supabase (ada di .gitignore)
- [x] Fix `supabase.js`: variabel client `db` → `sb` (konsisten dengan semua halaman)
- [ ] Test koneksi: buka `serve.bat`, cek console browser (jalankan ini setelah fix!)

---

## FASE 0b — UI Utama (Flipbook Reader)
- [x] Buat `ebook.html` — split-layout flipbook reader: `#flipPane` (kiri) + `#catPane` (kanan)
- [x] Rewrite `style.css` — CSS Grid `1fr 320px`, mobile overlay, expanded mode, responsive
- [x] Rewrite `script.js` — DOM IDs baru, `FlipbookCache3`, 3D flip, zoom, pinch, IndexedDB
- [x] Bugfix zoom: `SCALE 1.5 → 2.0` (render lebih tajam), `ZOOM_MAX 4 → 2` (maks 200%)
- [x] Bugfix mobile: 1 halaman per layar (bukan 2), navigasi per halaman bukan per spread
- [x] Tambah swipe gesture di mobile untuk ganti halaman
- [x] Mobile behavior: flip pane overlay aktif saat buku dibuka, tombol ← Katalog untuk kembali
- [x] Expanded mode: tombol ⤢ / "Buka Penuh" menyembunyikan catalog pane
- [x] Auto-load buku pertama di desktop setelah katalog dimuat
- [x] Halaman changelog (`changelog.html`) — riwayat v0.1 → v0.4, roadmap hingga v1.0
- [x] Halaman checklist (`checklist.html`) — versi web CHECKLIST.md, dengan progress bar per fase
- [x] Link versi di topbar ebook.html (klik "v0.4" → changelog.html)
- [x] Tombol "← Dashboard" di ebook.html — arah dinamis berdasarkan role sesi (dosen/mahasiswa)
- [x] Menu "Perpustakaan" di sidebar dashboard-mhs.html & dashboard-dos.html → ebook.html
- [x] **v0.5** — Dashboard mahasiswa: sidebar lengkap (Dashboard, Modul, Video, Kuis, Forum, Draf, Progress, Pengaturan) + ikon SVG; welcome banner; stat cards; modul aktif dengan progress bar; dummy data
- [x] **v0.5** — Dashboard dosen: sidebar (Dashboard, Mahasiswa, Modul, Analitik, Forum, Validasi, Pengaturan); class header Kelas A 32 mahasiswa; bar chart distribusi skor kuis; tabel mahasiswa + search + export CSV; Analitik & Validasi
- [x] **v0.5** — Avatar dropdown (Edit Profil + Logout) di kedua dashboard; role badge topbar

---

## FASE 1 — Auth & Manajemen Pengguna
- [x] `index.html` = halaman login (pintu masuk utama situs)
- [x] `login.html` tetap ada sebagai arsip / backup
- [x] Halaman login (`login.html`) — form email + password + toggle role
- [x] Login dengan Supabase Auth (`supabase.auth.signInWithPassword`)
- [x] Setelah login → redirect berdasarkan role (`mahasiswa` → dashboard-mhs, `dosen` → dashboard-dos)
- [x] Halaman register (`register.html`) — form lengkap dengan NIM/NIDN
- [ ] Logout berfungsi
- [x] Session persist — redirect otomatis kalau sudah login
- [ ] Proteksi halaman: redirect ke login kalau belum login

---

## FASE 2 — Dashboard Mahasiswa
- [x] Layout split: sidebar navigasi + konten utama (`dashboard-mhs.html`)
- [x] Header: nama pengguna, avatar inisial, notifikasi
- [x] Stat cards: modul selesai, skor rata-rata kuis, total waktu belajar
- [x] Daftar modul dengan status (Selesai / Sedang / Terkunci)
- [x] Progress bar per modul
- [x] Modul terkunci otomatis sampai modul sebelumnya selesai (adaptive path)
- [ ] Tombol "Lanjut Belajar" → buka modul terakhir yang dikerjakan (Sprint 2)

## FASE 2b — Dashboard Dosen
- [x] Layout sidebar + konten utama (`dashboard-dos.html`)
- [x] Stat cards: total mahasiswa, rata-rata progress, draf, perlu asistensi
- [x] Tabel progress semua mahasiswa + search + highlight perlu bantuan
- [x] Export CSV data mahasiswa
- [x] Analitik: grafik distribusi skor + penyelesaian per modul

---

## FASE 3 — Konten Modul (Flipped Learning)
- [ ] Struktur 9 modul sesuai RPS (lihat mind map):
  1. Dasar & Konsep R&D
  2. Model ADDIE, 4D, Borg & Gall
  3. Needs Assessment & Gap Analysis
  4. Penyusunan Bab 1 Proposal
  5. Blueprint & Storyboard Produk
  6. Instrumen Validasi Ahli
  7. Analisis Data Validasi
  8. Uji Coba & Implementasi
  9. Evaluasi & Diseminasi
- [ ] Setiap modul punya: Video → PDF/E-modul → Kuis Formatif
- [ ] Embed video YouTube atau upload ke Supabase Storage
- [ ] E-modul PDF tampil sebagai flipbook (pakai reader yang sudah ada)
- [ ] Kuis formatif setelah tiap modul (pilihan ganda, min. 5 soal)
- [ ] Skor kuis tersimpan ke database
- [ ] Time-on-task tracking: catat waktu mulai & selesai per modul

---

## FASE 4 — Mesin AI Adaptif (Backend Sederhana)
- [ ] Asesmen awal gaya belajar (VARK quiz 12 pertanyaan) saat pertama login
- [ ] Simpan profil gaya belajar ke tabel `profiles`
- [ ] Algoritma jalur adaptif: urutkan konten berdasarkan gaya belajar
  - Visual → prioritas video & infografis
  - Reading → prioritas teks PDF
  - Kinesthetic → prioritas latihan & kuis
- [ ] Umpan balik instan setelah kuis: pesan berbeda per skor (< 60 / 60-80 / > 80)
- [ ] Rekomendasi "Kamu perlu mengulang..." jika skor < 60

---

## FASE 5 — Dasbor Pelacakan SDL
- [ ] Halaman "Progress Saya" untuk mahasiswa
- [ ] Grafik progres modul (donut chart)
- [ ] Log waktu belajar per sesi (time-on-task)
- [ ] Riwayat skor kuis (tabel + grafik tren)
- [ ] Checklist metakognitif: self-reflection form setelah tiap modul
- [ ] Log iterasi draf (versi 1, 2, dst.)

---

## FASE 6 — Dashboard Dosen
- [ ] Layout: sidebar + tabel mahasiswa
- [ ] Tabel progres semua mahasiswa (sortable)
- [ ] Filter kelas / kelompok
- [ ] Lihat detail per mahasiswa: progres modul, skor, waktu
- [ ] Flag otomatis mahasiswa yang perlu asistensi (skor < 60 atau tidak aktif 3+ hari)
- [ ] Grafik distribusi skor kuis per modul
- [ ] Export data ke CSV (untuk keperluan pelaporan penelitian)
- [ ] Manajemen modul: tambah/edit konten (dosen only)

---

## FASE 7 — Fitur Kolaborasi
- [ ] Portal Forum Peer-Review (per modul)
- [ ] Post pertanyaan + reply
- [ ] Panduan Workshop (PDF + jadwal)
- [ ] Portal Asistensi Draf:
  - Mahasiswa upload draf
  - Dosen beri komentar
  - Versioning draf (v1, v2, ...)

---

## FASE 8 — Notifikasi & Reminder
- [ ] Notifikasi in-app (bell icon)
- [ ] Email reminder via Supabase Edge Functions: "Kamu belum belajar 3 hari"
- [ ] Notif ke dosen: mahasiswa kumpulkan draf baru

---

## FASE 9 — Pengujian & Validasi (sesuai ADDIE)
- [ ] Instrumen validasi ahli media (Google Form + rekap otomatis)
- [ ] Instrumen validasi ahli materi
- [ ] Uji coba kelompok kecil (5-10 mahasiswa)
- [ ] Analisis data validasi (% kelayakan)
- [ ] Revisi berdasarkan masukan ahli
- [ ] Uji coba lapangan (kelas penuh)
- [ ] Desain kuasi-eksperimen: pre-test & post-test SDL
- [ ] Analisis N-Gain

---

## FASE 10 — Luaran Penelitian
- [ ] HKI: siapkan dokumen pendaftaran hak cipta
- [ ] Screenshot & dokumentasi produk untuk laporan
- [ ] Poster hasil penelitian (A1)
- [ ] Draft artikel jurnal SINTA 3
- [ ] Upload ke media sosial (IG/YouTube demo)

---

## Database Schema (Supabase)

```sql
-- profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id           UUID REFERENCES auth.users PRIMARY KEY,
  full_name    TEXT,
  nim_nidn     TEXT,
  role         TEXT CHECK (role IN ('mahasiswa', 'dosen')),
  learning_style TEXT,  -- visual / auditory / reading / kinesthetic
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- modules
CREATE TABLE modules (
  id           SERIAL PRIMARY KEY,
  order_num    INT,
  title        TEXT,
  description  TEXT,
  video_url    TEXT,
  pdf_url      TEXT,
  is_locked    BOOLEAN DEFAULT true
);

-- user_progress
CREATE TABLE user_progress (
  id           SERIAL PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id),
  module_id    INT  REFERENCES modules(id),
  status       TEXT CHECK (status IN ('not_started','in_progress','completed')),
  time_spent   INT DEFAULT 0,  -- detik
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, module_id)
);

-- quiz_questions
CREATE TABLE quiz_questions (
  id           SERIAL PRIMARY KEY,
  module_id    INT REFERENCES modules(id),
  question     TEXT,
  options      JSONB,   -- ["A. ...", "B. ...", ...]
  answer_index INT      -- 0-based
);

-- quiz_attempts
CREATE TABLE quiz_attempts (
  id           SERIAL PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id),
  module_id    INT  REFERENCES modules(id),
  score        INT,
  answers      JSONB,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- drafts
CREATE TABLE drafts (
  id           SERIAL PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id),
  module_id    INT REFERENCES modules(id),
  version      INT DEFAULT 1,
  file_url     TEXT,
  notes        TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- draft_comments (dosen → mahasiswa)
CREATE TABLE draft_comments (
  id           SERIAL PRIMARY KEY,
  draft_id     INT REFERENCES drafts(id),
  dosen_id     UUID REFERENCES profiles(id),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- forum_posts
CREATE TABLE forum_posts (
  id           SERIAL PRIMARY KEY,
  module_id    INT REFERENCES modules(id),
  user_id      UUID REFERENCES profiles(id),
  parent_id    INT,  -- NULL = post utama, diisi = reply
  content      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Prioritas Pengerjaan (Next Steps)

**Sprint 1 (sekarang):**  
☐ Setup Supabase → ☐ Halaman Login → ☐ Dashboard Mahasiswa (static dulu)

**Sprint 2:**  
☐ Koneksi real data Supabase → ☐ Dashboard Dosen → ☐ Modul + Flipbook reader

**Sprint 3:**  
☐ Kuis + AI adaptif → ☐ Forum → ☐ Asistensi Draf

---

*Terakhir diperbarui: 2026-06-09 · v0.5 — dashboard-mhs & dashboard-dos redesign + dummy data*
