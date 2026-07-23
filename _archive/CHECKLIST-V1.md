# Smart-Flipbook v1.0 — Checklist Menuju Uji Lapangan & HKI

> Dibuat: 2026-06-24 | Target: v1.0 (Supabase live + uji lapangan + N-Gain real + HKI)
> Cara pakai: centang `[x]` setiap item selesai.

---

## 🔴 Phase 0 — Pra-Launch (kerjakan sebelum semua fase lain)

### CLAUDE.md & Token Efisiensi
- [ ] Arsipkan sprint history v0.7.2–v0.9.6 ke `docs/dev/history.md` (sesuai hemat.md §8)
- [ ] Sisakan hanya v0.9.6 + v1.0 target di CLAUDE.md
- [ ] Tambahkan `docs/dev/` ke `.gitignore`

### Infrastruktur Supabase (Production)
- [ ] Buat project Supabase BARU khusus produksi (pisah dari dev jika ada)
- [ ] Jalankan `database/schema.sql` di Supabase produksi
- [ ] Setup RLS policies semua 8 tabel: profiles, modules, module_progress, quiz_attempts, forum_posts, draft_submissions, notifications, learning_sessions
- [ ] Verifikasi anon key (bukan service key) di `supabase.js`
- [ ] Test koneksi Supabase dari GitHub Pages (CORS, CSP)

### PDF & Assets
- [ ] Upload 9 PDF modul ke Supabase Storage atau CDN (Google Drive public / GitHub Releases)
- [ ] Update `config.json` dengan URL PDF yang bisa diakses publik
- [ ] Verifikasi PDF bisa diload dari `ebook.html` tanpa error CORS

---

## 🟠 Phase 1 — Supabase Live Sync

### DataLayer → Supabase
- [ ] Implementasi `DataLayer.saveProgress` → `module_progress` tabel
- [ ] Implementasi `DataLayer.getProgress` ← `module_progress` tabel
- [ ] Implementasi `DataLayer.saveQuizAttempt` → `quiz_attempts` tabel
- [ ] Implementasi `DataLayer.getQuizHistory` ← `quiz_attempts` tabel
- [ ] Implementasi `DataLayer.saveForumPost` → `forum_posts` tabel
- [ ] Implementasi `DataLayer.getForumPosts` ← `forum_posts` tabel
- [ ] Implementasi `DataLayer.saveDraftSubmission` → `draft_submissions` tabel
- [ ] Implementasi `DataLayer.getNotifications` ← `notifications` tabel
- [ ] Test semua method baru dengan data nyata

### Auth Flow End-to-End
- [ ] Test register mahasiswa → email verifikasi → login
- [ ] Test register dosen → login
- [ ] Test reset-password via Supabase email link
- [ ] Test logout dari semua halaman (modal konfirmasi muncul)
- [ ] Test session expired → redirect ke index.html

### isDemo Pattern
- [ ] Verifikasi semua 20 halaman protected punya auth guard + isDemo fallback
- [ ] Test mode demo (tanpa `supabase.js`) tidak error di konsol
- [ ] Test mode live (dengan `supabase.js`) semua data tersimpan ke Supabase

### Notifikasi & Realtime
- [ ] Setup Supabase Realtime subscription di `notifications` tabel
- [ ] Test notifikasi dosen ke mahasiswa (mis. feedback draf)

---

## 🟡 Phase 2 — Persiapan Uji Lapangan

### Setup Akun
- [ ] Buat akun dosen pengampuh (minimal 1 akun aktif)
- [ ] Buat akun mahasiswa uji coba (sesuai sample size penelitian)
- [ ] Verifikasi dashboard-dos.html berfungsi dengan data nyata
- [ ] Verifikasi dashboard-mhs.html berfungsi dengan data nyata

### Pre-Test & Instrumen
- [ ] Buat soal pre-test SDL (di luar platform atau via kuis.html)
- [ ] Input data pre-test ke `ngain.html` sebelum intervensi dimulai
- [ ] Siapkan lembar validasi ahli (bisa cetak dari `validasi.html`)
- [ ] Pastikan `feedback.html` bisa diisi dan tersimpan

### Mobile Audit Final
- [ ] Simulasi semua halaman di 375px → tidak ada overflow/broken layout
- [ ] Simulasi semua halaman di 768px → tidak ada overflow/broken layout
- [ ] Test PWA install di Android Chrome (manifest + sw.js)
- [ ] Test offline fallback (Service Worker aktif)

### Bug Sweep Final
- [ ] Spawn agent: scan semua .html/.js untuk uncaught Promise rejections
- [ ] Cek semua form submit ada feedback visual (toast/loader)
- [ ] Cek semua tabel punya horizontal scroll wrapper di mobile
- [ ] Verifikasi sequential lock modul berfungsi sesuai urutan

---

## 🟢 Phase 3 — Pengumpulan Data Penelitian

### Selama Uji Lapangan
- [ ] Monitor `analitik.html` — progress mahasiswa, flag tidak aktif
- [ ] Mahasiswa isi VARK assessment (`vark.html`) di awal
- [ ] Mahasiswa selesaikan semua 9 modul (termasuk kuis & refleksi)
- [ ] Dosen upload draf & beri asistensi via `draf.html`
- [ ] Forum aktif minimal 1 diskusi per modul (`forum.html`)
- [ ] Mahasiswa isi `feedback.html` di akhir

### Post-Test & N-Gain
- [ ] Buat soal post-test SDL (paralel dengan pre-test)
- [ ] Input data post-test ke `ngain.html`
- [ ] Hitung N-Gain per mahasiswa → interpretasi Hake (tinggi ≥0.7, sedang 0.3–0.7, rendah <0.3)
- [ ] Export hasil sebagai screenshot / CSV untuk laporan

### Validasi Ahli
- [ ] Validasi ahli media: isi 8 indikator di `validasi.html`
- [ ] Validasi ahli materi: isi 8 indikator di `validasi.html`
- [ ] Cetak / screenshot hasil kelayakan dari `validasi.html`

### Export Data
- [ ] Export CSV analitik kelas dari `analitik.html`
- [ ] Screenshot semua dashboard sebagai dokumentasi
- [ ] Backup data Supabase sebelum analisis

---

## 🔵 Phase 4 — Finalisasi & HKI

### Laporan Penelitian
- [ ] Rekap N-Gain SDL → Bab 4 laporan
- [ ] Rekap kepraktisan (feedback.html) → rata-rata rating per aspek
- [ ] Rekap validasi ahli → persentase kelayakan media & materi
- [ ] Rekap distribusi VARK mahasiswa

### Update Platform
- [ ] Update `changelog.html` dengan v1.0 dan fitur lengkap
- [ ] Update `checklist.html` (checklist dev internal)
- [ ] Pastikan README di repo up-to-date

### HKI (Hak Kekayaan Intelektual)
- [ ] Siapkan screenshot semua halaman utama (min. 10 screenshot representatif)
- [ ] Tulis deskripsi invensi: nama program, fungsi, kebaruan
- [ ] Siapkan source code snippet untuk lampiran (bukan supabase.js)
- [ ] Daftarkan ke DRPM / LP2M Universitas Malang
- [ ] Ikuti alur e-HKI (hki.kemdikbud.go.id atau DJKI)

---

## 📊 Summary Progress

| Phase | Status | Estimasi |
|-------|--------|----------|
| Phase 0 — Pra-Launch | ⬜ Belum | 3–5 hari |
| Phase 1 — Supabase Sync | ⬜ Belum | 1–2 minggu |
| Phase 2 — Persiapan Uji | ⬜ Belum | 3–5 hari |
| Phase 3 — Uji Lapangan | ⬜ Belum | 2–4 minggu (tergantung jadwal) |
| Phase 4 — Finalisasi HKI | ⬜ Belum | 1 minggu |

---

*File ini adalah living document — update setiap phase selesai.*
