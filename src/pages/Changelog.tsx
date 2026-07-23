import type { ReactNode } from 'react'
import { Layout } from '../components/Layout'

type ChangeType = 'feat' | 'fix' | 'imp' | 'sec' | 'doc' | 'refac'

interface ChangeItem {
  type: ChangeType
  content: ReactNode
}

interface VersionEntry {
  version: string
  badge: 'plain' | 'major' | 'minor' | 'patch' | 'current'
  /** Extra text appended to the badge label, e.g. the "✓" in legacy v0.9.3 */
  badgeSuffix?: string
  title: string
  date: string
  changes: ChangeItem[]
  desc?: ReactNode
}

interface RoadmapItem {
  version: string
  title: string
  items: ReactNode
  status: 'done' | 'current' | 'planned'
}

const TAG_LABEL: Record<ChangeType, string> = {
  feat: 'FEAT',
  fix: 'FIX',
  imp: 'IMP',
  refac: 'REFAC',
  sec: 'SEC',
  doc: 'DOC',
}

// Tag pill background/text — mirrors legacy/changelog.html .tag-* classes
const TAG_CLASSES: Record<ChangeType, string> = {
  feat: 'bg-[#e8f2e8] text-[#4a7a4a]',
  fix: 'bg-[#fae8e8] text-[#9a3c3c]',
  imp: 'bg-[#fdf2e4] text-[#7a5020]',
  sec: 'bg-[#ede8fa] text-[#5040a0]',
  doc: 'bg-[#f0ede8] text-brown-2',
  refac: 'bg-[#e8f0ea] text-[#406040]',
}

// Bullet dot color before each item — mirrors legacy .change-list li.<type>::before
const DOT_CLASSES: Record<ChangeType, string> = {
  feat: 'bg-sage-d',
  fix: 'bg-[#c5726b]',
  imp: 'bg-terra',
  sec: 'bg-[#8b7cd4]',
  doc: 'bg-brown-3',
  refac: 'bg-sage',
}

const BADGE_CLASSES: Record<VersionEntry['badge'], string> = {
  plain: 'text-brown',
  major: 'bg-terra text-white',
  minor: 'bg-sage text-white',
  patch: 'bg-ivory text-brown-2 border border-[color:var(--border)]',
  current: 'bg-terra-d text-white shadow-[0_0_0_3px_rgba(212,163,115,.25)]',
}

const c = (children: ReactNode) => <code className="bg-[#00000008] rounded px-1 text-[0.9em]">{children}</code>

const versions: VersionEntry[] = [
  {
    version: 'v1.0.0',
    badge: 'current',
    title: 'React Rewrite — React 19 + Vite + TypeScript + Tailwind v4',
    date: '23 Jul 2026',
    changes: [
      { type: 'feat', content: <>Rewrite penuh 18 halaman dari vanilla HTML/JS ke React 19 + Vite + TypeScript + Tailwind v4 ({c('@theme')} CSS-first, tanpa {c('tailwind.config.ts')}), mengikuti stack SAKTI</> },
      { type: 'feat', content: <>Strangler-fig migration: {c('legacy/*.html')} dipertahankan sebagai fallback statis, semua navigasi live sudah 100% React Router — nol dead-end ke halaman lama</> },
      { type: 'feat', content: <>Data layer dual-mode di setiap modul ({c('src/lib/*.ts')}): query Supabase kalau {c('isSupabaseConfigured')}, fallback localStorage dengan key {c('sfp_*')} identik legacy</> },
      { type: 'imp', content: <><strong>AuthShell</strong> — Login, Register &amp; Reset Password dikembalikan ke layout dua panel bermerek (panel kiri gelap: logo, tagline, info fakultas) sesuai desain asli, sempat disederhanakan jadi single-card saat porting awal</> },
      { type: 'feat', content: <>Login: alur &quot;Lupa kata sandi?&quot; via {c('supabase.auth.resetPasswordForEmail')} inline (bukan native prompt) — kirim link reset ke email</> },
      { type: 'fix', content: <>Font Playfair Display &amp; DM Sans akhirnya termuat — {c('<link>')} Google Fonts sempat tidak pernah ditambahkan ke {c('index.html')} sehingga 13 file yang mereferensikannya diam-diam fallback ke font sistem</> },
      { type: 'fix', content: <>Isolasi env test dari kredensial Supabase asli — {c('.env.test.local')} kosong supaya {c('pnpm test')} tidak ikut kepakai kredensial dev lokal</> },
      { type: 'fix', content: <>Migrasi skema {c('profiles')}: tambah kolom {c('jabatan')} &amp; {c('fakultas')} — satu-satunya gap ditemukan dari audit skema penuh 15 halaman baru vs Supabase live</> },
      { type: 'fix', content: <>{c('ProtectedRoute')} fail-open saat fetch profil gagal — role {c('null')} bisa lolos role-gating; diperbaiki jadi fail-closed</> },
      { type: 'imp', content: <>Login end-to-end diverifikasi dengan Supabase asli (bukan demo mode) — sign-in, fetch profile, redirect dashboard berjalan</> },
      { type: 'doc', content: <>Rencana ke depan: sidebar + flyout navigasi ala SAKTI (ganti topbar), deploy Vercel</> },
    ],
    desc: 'Migrasi arsitektur — aplikasi lama tetap hidup di legacy/ sebagai jaring pengaman, tapi seluruh pengalaman pengguna sekarang React.',
  },
  {
    version: 'v0.9.6',
    badge: 'plain',
    title: 'Bug Sweep, CSS Animations & Profil Dosen',
    date: '18 Jun 2026',
    changes: [
      { type: 'feat', content: <><strong>profil-dos.html</strong> — Halaman profil khusus dosen: Data Diri (NIDN, jabatan fungsional, prodi, fakultas), Statistik Mengajar (4 stat cards), Aktivitas Kelas Terkini, Pengaturan (toggles + logout)</> },
      { type: 'feat', content: <>CSS animations library di style.css: {c('pageIn')}, {c('fadeUp')} (stagger), {c('toastIn')}, {c('modalIn')}, {c('shimmer')}, {c('progressFill')} — semua GPU-composited (transform/opacity)</> },
      { type: 'imp', content: <>Card hover lift: {c('translateY(-3px)')} + shadow; button active: {c('scale(0.97)')}; nav item underline slide via {c('::after')}</> },
      { type: 'imp', content: <>{c('@media (prefers-reduced-motion: reduce)')} — semua animasi dimatikan (accessibility compliance)</> },
      { type: 'fix', content: <><strong>isDemo pattern</strong> diterapkan ke semua 15 halaman protected: {c("const isDemo = localStorage.getItem('sfp_demo')==='1' || typeof sb==='undefined'")}</> },
      { type: 'fix', content: <>profil.html raw JS muncul di body — {c('</script>')} tag terpotong oleh injeksi sebelumnya; file dipulihkan + re-injected bersih</> },
      { type: 'fix', content: <>Bug sweep 16 fixes: null checks, broken event listeners, missing auth guards di 8 halaman</> },
      { type: 'fix', content: <>dashboard-dos.html — link profil mengarah ke {c('profil-dos.html')} di 4 titik navigasi (topbar, dropdown, mobile drawer, quick-card)</> },
      { type: 'refac', content: <>CLAUDE.md: Sprint Roadmap diperbarui; v0.9.4–v0.9.6 tercatat lengkap</> },
    ],
  },
  {
    version: 'v0.9.5',
    badge: 'plain',
    title: 'Mobile Support Rules & Logout Modal',
    date: '18 Jun 2026',
    changes: [
      { type: 'imp', content: <>CLAUDE.md: Mobile Support Rules ditambahkan — WAJIB setiap fitur support mobile 360–768px, input 16px (iOS anti-zoom), tap target 44×44px, modal 90vw/90vh</> },
      { type: 'feat', content: <>Logout confirmation modal di semua 15 halaman protected: &quot;Yakin ingin keluar?&quot; dengan tombol Batal + Keluar</> },
      { type: 'feat', content: <>Login toast feedback: visual feedback sebelum redirect ke dashboard</> },
      { type: 'imp', content: <>Semua modal/dialog: {c('max-width:90vw; max-height:90vh; overflow-y:auto')} — responsive mobile</> },
      { type: 'fix', content: <>Mobile audit: form, button, nav, grid di 375px dan 768px — semua halaman</> },
    ],
  },
  {
    version: 'v0.9.4',
    badge: 'plain',
    title: 'Onboarding, Loading Skeleton, VARK Visual & PWA',
    date: '18 Jun 2026',
    changes: [
      { type: 'feat', content: <>Onboarding modal mahasiswa 3-step: Welcome, Cara Belajar, VARK Adaptive — flag {c('sfp_onboarded_v1')} di localStorage; bisa dipanggil ulang dari profil via {c('showOnboardingGuide()')}</> },
      { type: 'feat', content: <>Onboarding modal dosen 2-step: Welcome, Panduan Mulai — flag {c('sfp_onboarded_dos_v1')} di localStorage</> },
      { type: 'feat', content: <>VARK summary visual di profil.html: dominant style card, rekomendasi konten per gaya belajar, bar chart per-warna, tips belajar 3 poin per tipe (V/A/R/K)</> },
      { type: 'feat', content: <>Export laporan belajar PDF dari profil.html ({c('window.print')} + {c('@media print')} CSS)</> },
      { type: 'feat', content: <>PWA: {c('manifest.json')} + {c('sw.js')} (cache-first strategy), icon 192px + 512px; manifest link + {c('theme-color')} di 6 halaman utama; SW registration di index.html &amp; profil.html</> },
      { type: 'feat', content: <>Notifikasi: unread dot, 6 dummy notifs (modul/kuis/forum/draf/progres/sistem), empty state</> },
      { type: 'imp', content: <>Loading skeleton shimmer di dashboard-mhs.html: stat cards + modul list (mencegah layout shift)</> },
      { type: 'imp', content: <>Toast error ramah: &quot;Koneksi bermasalah. Data ditampilkan dari cache lokal.&quot; (fallback offline)</> },
      { type: 'fix', content: <>&quot;Modul undefined&quot; di subtitle Lanjut Belajar — fallback {c('m.no || m.id')}</> },
      { type: 'fix', content: <>Global {c('unhandledrejection')} error handler di dashboard-mhs.html, modul.html, kuis.html</> },
    ],
    desc: 'Sprint 9 — onboarding flow, UX polish (skeleton + toast), VARK visual summary, ekspor PDF, dan PWA support.',
  },
  {
    version: 'v0.9.3',
    badge: 'minor',
    badgeSuffix: ' ✓',
    title: 'Validasi Ahli, Analitik Kelas & Profil Pengguna',
    date: '18 Jun 2026',
    changes: [
      { type: 'feat', content: <><strong>validasi.html</strong> — Instrumen Validasi Ahli: form 16 indikator (8 aspek media + 8 aspek materi), hitung rata-rata otomatis, kategori kelayakan (Sangat Layak/Layak/Cukup/Kurang), cetak hasil</> },
      { type: 'feat', content: <><strong>analitik.html</strong> — Dasbor Analitik Kelas: tabel progress 10 mahasiswa, grafik distribusi modul &amp; skor kuis, kepraktisan per aspek, flag mahasiswa tidak aktif, export CSV</> },
      { type: 'feat', content: <><strong>profil.html</strong> — Profil Pengguna: edit data diri, hasil gaya belajar VARK, statistik belajar pribadi, riwayat kuis, reset data demo</> },
      { type: 'fix', content: <>Integrasi navigasi: link ke profil.html di semua halaman mahasiswa; link ke analitik.html &amp; validasi.html di halaman dosen</> },
      { type: 'imp', content: <>DataLayer: +6 methods baru (saveValidasi, getValidasi, saveProfil, getProfil)</> },
    ],
    desc: 'Sprint 8 — validasi ahli instrumen, dasbor analitik kelas dosen, dan halaman profil pengguna.',
  },
  {
    version: 'v0.9.2',
    badge: 'minor',
    title: 'Feedback, N-Gain, Workshop & Jurnal/Studi Kasus',
    date: '17 Jun 2026',
    changes: [
      { type: 'feat', content: <><strong>feedback.html</strong> — Form kepraktisan pengguna: rating bintang 1–5 per 4 aspek (konten, kemudahan, keterbacaan, kebermanfaatan), riwayat per modul</> },
      { type: 'feat', content: <><strong>ngain.html</strong> — N-Gain Calculator SDL: input pre/post-test, hitung N-Gain otomatis, kategori Tinggi/Sedang/Rendah, grafik distribusi, export CSV</> },
      { type: 'feat', content: <><strong>workshop.html</strong> — Panduan sesi tatap muka 9 modul: tab Tujuan/Aktivitas/Checklist/Lembar Kerja, print-friendly</> },
      { type: 'feat', content: <><strong>modul.html</strong> — Section Jurnal &amp; Studi Kasus: 3 referensi jurnal + 2 studi kasus per modul (27 jurnal, 18 kasus total)</> },
      { type: 'feat', content: <><strong>modules-data.js</strong> — Tambah field {c('jurnal[]')} dan {c('studiKasus[]')} untuk 9 modul</> },
      { type: 'imp', content: <>9 dummy PDF modul (8 halaman/modul): cover, capaian, peta konsep, 4 sesi materi, latihan &amp; ringkasan</> },
      { type: 'imp', content: <>Seed data demo diperkaya: progress 3 modul, riwayat kuis, 7 forum posts, 4 drafts, 6 notifikasi, VARK pre-seeded</> },
      { type: 'fix', content: <>Bug sweep v0.9.1: 36 fixes (auth, data, mobile UI, CSS tokens, escHtml, changelog sync)</> },
      { type: 'fix', content: <>Folder cleanup: assets/, books/ modul-NN.pdf, .gitignore diperbarui</> },
      { type: 'imp', content: <>DataLayer: tambah {c('saveFeedback()')} dan {c('getFeedback()')}</> },
    ],
    desc: 'Sprint 7 — Studi Kasus & Jurnal, form kepraktisan, N-Gain Calculator SDL, dan panduan workshop tatap muka.',
  },
  {
    version: 'v0.9.1',
    badge: 'minor',
    title: 'Bug Sweep — Fanout Orchestration (Sweep 1–4)',
    date: '16 Jun 2026',
    changes: [
      { type: 'fix', content: <>Auth guard konsistensi di semua halaman protected — null guard, role mismatch redirect</> },
      { type: 'fix', content: <>DataLayer method calls — null checks, fallback values, error handling</> },
      { type: 'fix', content: <>UI &amp; Mobile — tap targets, font sizes, overflow issues di semua halaman</> },
      { type: 'fix', content: <>style.css: {c('var(--terra-dark)')} → {c('var(--terra-d)')} (4 occurrences)</> },
      { type: 'fix', content: <>changelog.html: tambah entri v0.8, v0.8.1, v0.9, v0.9.1 yang hilang</> },
      { type: 'imp', content: <>CLAUDE.md: update Sprint Roadmap + Key Files list</> },
    ],
    desc: 'Orchestrated bug sweep (4 fanout agents): Auth & Security, Data & Logic, UI & Mobile, Integration & Cross-file.',
  },
  {
    version: 'v0.9',
    badge: 'minor',
    title: 'DataLayer + VARK + Forum + Draf + Notifikasi + Donut Chart',
    date: '14 Jun 2026',
    changes: [
      { type: 'feat', content: <>data-layer.js: abstraksi data layer (localStorage → Supabase toggle via USE_SUPABASE flag)</> },
      { type: 'feat', content: <>vark.html: asesmen gaya belajar VARK (12 pertanyaan, simpan ke DataLayer)</> },
      { type: 'feat', content: <>forum.html: forum peer-review per modul (post + reply + like, avatar warna per nama)</> },
      { type: 'feat', content: <>draf.html: portal asistensi draf — mahasiswa upload, dosen review &amp; komentar</> },
      { type: 'feat', content: <>Notifikasi bell icon di semua dashboard (in-app, markRead, markAllRead)</> },
      { type: 'feat', content: <>Donut chart progress modul di dashboard-mhs &amp; dos (SVG animasi)</> },
      { type: 'feat', content: <>Checklist metakognitif self-reflection per modul (5 item, simpan ke DataLayer)</> },
      { type: 'feat', content: <>Sequential content lock: video → PDF → kuis (unlock bertahap per modul)</> },
      { type: 'imp', content: <>modul.html: embed video YouTube, time-on-task tracking, VARK-adaptive content reorder</> },
      { type: 'imp', content: <>kuis.html: umpan balik kuis adaptif per rentang skor + navigasi modul berikutnya</> },
      { type: 'refac', content: <>Semua halaman: ganti hardcode langsung ke DataLayer.* calls</> },
    ],
    desc: 'Sprint 4 & 5 — adaptive learning engine, social features (forum + draf), dan donut chart SDL tracking.',
  },
  {
    version: 'v0.8.1',
    badge: 'patch',
    title: 'Reset Password + Login Konsolidasi + Fix Distribusi Kuis',
    date: '12 Jun 2026',
    changes: [
      { type: 'feat', content: <>reset-password.html: halaman reset password via Supabase email link (3 state: form → loading → success)</> },
      { type: 'imp', content: <>Konsolidasi login.html → redirect stub ke index.html (hapus duplikasi form login)</> },
      { type: 'fix', content: <>modules-data.js: fix distribusi jawaban kuis — A:11, B:11, C:11, D:12 (sebelumnya tidak merata)</> },
    ],
  },
  {
    version: 'v0.8',
    badge: 'minor',
    title: 'Auth Guard + Lanjut Belajar + Mobile UI Fix + Bug Sweep',
    date: '11 Jun 2026',
    changes: [
      { type: 'feat', content: <>Auth guard di semua halaman protected (redirect ke index.html jika tidak ada sesi)</> },
      { type: 'feat', content: <>Tombol &quot;Lanjut Belajar&quot; di dashboard-mhs — lanjut ke modul terakhir dikerjakan</> },
      { type: 'imp', content: <>Mobile responsive: index.html, register.html, modul.html, kuis.html, dashboard (360px–768px)</> },
      { type: 'fix', content: <>Bug sweep (10 bugs): null guard spineEl, HTML escaping kuis XSS, CSS var --terra-dark, race condition bgRunning, dan lainnya</> },
      { type: 'fix', content: <>style.css: tambah {c('-webkit-backdrop-filter')} untuk Safari compatibility</> },
    ],
    desc: 'Sprint 3 — auth, mobile, dan bug sweep menyeluruh.',
  },
  {
    version: 'v0.7',
    badge: 'minor',
    title: 'Modul Detail + Kuis Formatif + Progress Tracking',
    date: '09 Jun 2026',
    changes: [
      { type: 'feat', content: <>modules-data.js: 9 modul RPS + 45 soal kuis dummy pilihan ganda</> },
      { type: 'feat', content: <>modul.html: halaman detail modul — cover PDF, capaian, materi sesi, progress, riwayat kuis</> },
      { type: 'feat', content: <>kuis.html: kuis formatif 5 soal/modul — satu per satu, feedback langsung, pembahasan soal</> },
      { type: 'feat', content: <>Skor kuis: verdict adaptif — Sangat Baik (≥80%) / Lulus (≥60%) / Perlu Mengulang (&lt;60%)</> },
      { type: 'feat', content: <>localStorage progress baca: halaman terakhir, persentase, tanggal terakhir buka</> },
      { type: 'feat', content: <>localStorage riwayat kuis: simpan max 10 percobaan, tampil di modul.html</> },
      { type: 'imp', content: <>dashboard-mhs: tombol ▶ Mulai/Lanjut/Baca Ulang mengarah ke modul.html?id=X</> },
      { type: 'imp', content: <>ebook.html: URL param ?book= untuk auto-open modul tertentu dari link eksternal</> },
    ],
  },
  {
    version: 'v0.5.2',
    badge: 'minor',
    title: 'Ebook Overhaul + Demo Login + Sidebar Links',
    date: '09 Jun 2026',
    changes: [
      { type: 'feat', content: <>Ebook: katalog buku pindah ke panel kiri; flipbook reader ke kanan</> },
      { type: 'feat', content: <>Ebook: cover buku dari halaman pertama PDF (render via pdf.js, async per kartu)</> },
      { type: 'feat', content: <>Ebook: tombol ← Dashboard auth-aware — redirect ke dashboard-mhs/dos jika login, atau index.html jika demo</> },
      { type: 'feat', content: <>Ebook topbar: ganti tombol v0.4 → link 📋 Changelog + ✅ Checklist</> },
      { type: 'feat', content: <>Dashboard Mahasiswa &amp; Dosen: link Changelog &amp; Checklist di sidebar footer</> },
      { type: 'imp', content: <>Login (index.html + login.html): tombol Demo Mahasiswa &amp; Demo Dosen selalu tampil di semua environment</> },
      { type: 'fix', content: <>index.html: error &quot;sb is not defined&quot; — DEMO_MODE guard pada semua panggilan sb.*</> },
      { type: 'fix', content: <>register.html: error &quot;sb is not defined&quot; — fallback demo mode dengan redirect ke login</> },
    ],
    desc: 'Sprint 2 patch — perbaikan UX login demo, overhaul ebook reader, dan navigasi changelog/checklist di semua halaman.',
  },
  {
    version: 'v0.5',
    badge: 'minor',
    title: 'Dashboard Redesign — Mahasiswa & Dosen',
    date: '09 Jun 2026',
    changes: [
      { type: 'feat', content: <>Dashboard Mahasiswa — sidebar lengkap: Dashboard, Modul, Video, Kuis, Forum, Draf Saya, Progress, Pengaturan (semua dengan ikon SVG)</> },
      { type: 'feat', content: <>Dashboard Mahasiswa — welcome banner dengan nama + streak belajar; stat cards animasi (modul selesai, rata-rata kuis, waktu belajar)</> },
      { type: 'feat', content: <>Dashboard Mahasiswa — modul aktif dengan progress bar per modul (Selesai / Sedang / Terkunci), warna adaptif</> },
      { type: 'feat', content: <>Dashboard Mahasiswa — halaman Video (6 video per modul), Kuis (riwayat + skor berwarna), Forum diskusi, Draf Saya, Progress visual, Pengaturan profil</> },
      { type: 'feat', content: <>Dashboard Dosen — sidebar: Dashboard, Mahasiswa, Modul, Analitik, Forum, Validasi, Pengaturan</> },
      { type: 'feat', content: <>Dashboard Dosen — class header MK Metpen &amp; Pengembangan Kelas A (32 mahasiswa); stat cards (68% progres, 24 draf, 5 perlu asistensi)</> },
      { type: 'feat', content: <>Dashboard Dosen — bar chart distribusi skor kuis dengan tooltip hover (6 rentang: 40–100)</> },
      { type: 'feat', content: <>Dashboard Dosen — tabel 32 mahasiswa dummy dengan search real-time + export CSV</> },
      { type: 'feat', content: <>Dashboard Dosen — halaman Analitik (chart distribusi skor + penyelesaian per modul), Forum, Validasi ahli (media &amp; materi dengan skor bar)</> },
      { type: 'imp', content: <>Avatar dropdown di kedua dashboard: Edit Profil + Logout (menggantikan klik langsung logout)</> },
      { type: 'imp', content: <>Role badge di topbar (Mahasiswa / Dosen) untuk identifikasi cepat</> },
      { type: 'imp', content: <>Dummy data lengkap — seluruh UI bisa dilihat tanpa koneksi database (fallback otomatis)</> },
      { type: 'refac', content: <>Auth guard dipertahankan — fallback ke dummy jika offline/localhost, redirect ke login jika production &amp; tidak ada sesi</> },
    ],
    desc: 'Sprint 2 — fokus UI/UX dashboard sebagai fondasi sebelum integrasi data Supabase live dan modul konten.',
  },
  {
    version: 'v0.4',
    badge: 'minor',
    title: 'Split-Layout + Auth + Dashboard',
    date: '09 Jun 2026',
    changes: [
      { type: 'feat', content: <>Split-layout baru: flip pane (kiri) + catalog pane (kanan) dengan CSS Grid 1fr 320px</> },
      { type: 'feat', content: <>Autentikasi pengguna via Supabase Auth — login, register, forgot password</> },
      { type: 'feat', content: <>Dashboard Mahasiswa: stat cards, daftar modul adaptif, progress bar, riwayat kuis</> },
      { type: 'feat', content: <>Dashboard Dosen: monitor progress semua mahasiswa, highlight perlu bantuan, export CSV</> },
      { type: 'feat', content: <>Database Supabase PostgreSQL: 8 tabel (profiles, modules, user_progress, quiz_questions, quiz_attempts, drafts, draft_comments, forum_posts)</> },
      { type: 'feat', content: <>Adaptive learning: modul terkunci otomatis sampai modul sebelumnya selesai</> },
      { type: 'feat', content: <>Mobile overlay: flip pane masuk dari kiri, tombol ← Katalog untuk kembali</> },
      { type: 'feat', content: <>Tombol &quot;Buka Penuh&quot; (expanded mode) untuk membaca tanpa gangguan</> },
      { type: 'feat', content: <>Halaman changelog ini (changelog.html)</> },
      { type: 'imp', content: <>Catalog pane selalu terlihat di desktop — tidak perlu beralih view</> },
      { type: 'imp', content: <>Auto-load buku pertama di desktop setelah katalog dimuat</> },
      { type: 'refac', content: <>DOM IDs baru: flipPane, catPane, flLoader, stage, toolbar (konsisten dengan split layout)</> },
      { type: 'refac', content: <>IndexedDB cache diperbarui ke FlipbookCache2 (hindari konflik cache lama)</> },
      { type: 'fix', content: <>supabase.js: variabel client diganti dari {c('db')} ke {c('sb')} (konsisten dengan semua halaman)</> },
      { type: 'sec', content: <>supabase.js masuk .gitignore — credential tidak ter-commit ke repo publik</> },
      { type: 'doc', content: <>CHECKLIST.md: 10 fase pengembangan dari setup hingga HKI/diseminasi</> },
    ],
  },
  {
    version: 'v0.3',
    badge: 'minor',
    title: 'GitHub Actions + IndexedDB Cache',
    date: '07 Jun 2026',
    changes: [
      { type: 'feat', content: <>GitHub Actions workflow ({c('scan-books.yml')}): auto-scan folder books/ setiap push, perbarui config.json otomatis</> },
      { type: 'feat', content: <>IndexedDB cache (FlipbookCache) — buku langsung terbuka di kunjungan kedua tanpa render ulang</> },
      { type: 'feat', content: <>Cache invalidation: deteksi perubahan PDF via Content-Length header</> },
      { type: 'feat', content: <>Lazy rendering: tampilkan buku setelah 6 halaman pertama selesai, render sisa di background</> },
      { type: 'imp', content: <>Background progress chip di toolbar: tampilkan status render halaman sisa</> },
      { type: 'fix', content: <>GitHub Actions: tambah {c('git pull --rebase')} sebelum push untuk cegah konflik remote</> },
    ],
  },
  {
    version: 'v0.2',
    badge: 'patch',
    title: 'Zoom System + 3D Flip',
    date: '05 Jun 2026',
    changes: [
      { type: 'feat', content: <>Animasi flip halaman 3D dengan CSS {c('rotateY()')} dan {c('transform-style: preserve-3d')}</> },
      { type: 'feat', content: <>Zoom system lengkap: scroll wheel zoom-to-cursor, pinch-to-zoom (mobile), tombol +/−, drag-to-pan</> },
      { type: 'feat', content: <>Double-click: zoom 2× / reset ke 100%</> },
      { type: 'feat', content: <>Keyboard shortcuts: ← → navigasi halaman, +/− zoom, 0 reset zoom, F toggle fullscreen</> },
      { type: 'feat', content: <>Thumbnail strip: klik ⊞ untuk lihat semua halaman, klik thumbnail untuk lompat</> },
      { type: 'imp', content: <>Toolbar lengkap: First/Prev/Next/Last, page counter, zoom controls, expand</> },
      { type: 'imp', content: <>Zoom hint muncul otomatis saat pertama kali buka buku</> },
    ],
  },
  {
    version: 'v0.1',
    badge: 'patch',
    title: 'MVP — PDF Flipbook Reader',
    date: '01 Jun 2026',
    changes: [
      { type: 'feat', content: <>Render PDF ke canvas menggunakan pdf.js v3.11.174 (CDN)</> },
      { type: 'feat', content: <>Tampilan dua halaman (spread) — baca seperti buku fisik</> },
      { type: 'feat', content: <>Catalog view: grid buku dari config.json, klik untuk buka</> },
      { type: 'feat', content: <>Design warm earth-tone: Playfair Display + DM Sans, palet cream/sage/terra</> },
      { type: 'feat', content: <>Repo GitHub: github.com/Inawati-dev/smart-flip (sebelumnya: Flipbook)</> },
      { type: 'feat', content: <>Local dev server: serve.bat (python -m http.server 8080)</> },
      { type: 'doc', content: <>README awal, scan_books.py untuk generate config.json manual</> },
    ],
    desc: 'Versi pertama — fungsionalitas dasar membaca PDF sebagai flipbook dengan katalog sederhana.',
  },
]

const roadmap: RoadmapItem[] = [
  {
    version: 'v0.5',
    title: 'Dashboard Redesign',
    status: 'done',
    items: <>
      · Sidebar lengkap mahasiswa &amp; dosen<br />
      · Bar chart distribusi skor kuis<br />
      · 32 mahasiswa dummy + export CSV<br />
      · Halaman Video, Forum, Draf, Validasi
    </>,
  },
  {
    version: 'v0.5.2',
    title: 'Ebook Overhaul + Demo Fix',
    status: 'done',
    items: <>
      · Katalog kiri, cover PDF<br />
      · Demo login semua env<br />
      · Changelog &amp; Checklist sidebar<br />
      · Fix sb is not defined
    </>,
  },
  {
    version: 'v0.6',
    title: 'Modul + Progress Tracking',
    status: 'done',
    items: <>
      · modul.html detail lengkap<br />
      · localStorage progress baca<br />
      · URL param ?book= auto-open<br />
      · Tombol Lanjut Belajar
    </>,
  },
  {
    version: 'v0.7',
    title: 'Kuis Formatif + Riwayat',
    status: 'done',
    items: <>
      · kuis.html per modul (45 soal dummy)<br />
      · Skor tersimpan localStorage<br />
      · Umpan balik instan + pembahasan<br />
      · Adaptive verdict ≥80/60/&lt;60
    </>,
  },
  {
    version: 'v0.8',
    title: 'Auth Guard + Mobile + Bug Sweep',
    status: 'done',
    items: <>
      · Auth guard semua halaman protected<br />
      · Tombol Lanjut Belajar<br />
      · Mobile responsive 360px–768px<br />
      · Bug sweep 10 bugs fixed
    </>,
  },
  {
    version: 'v0.8.1',
    title: 'Reset Password + Konsolidasi',
    status: 'done',
    items: <>
      · reset-password.html<br />
      · Konsolidasi login.html → stub<br />
      · Fix distribusi jawaban kuis
    </>,
  },
  {
    version: 'v0.9',
    title: 'DataLayer + VARK + Forum + SDL',
    status: 'done',
    items: <>
      · data-layer.js abstraksi data<br />
      · vark.html asesmen gaya belajar<br />
      · forum.html + draf.html<br />
      · Donut chart + notifikasi
    </>,
  },
  {
    version: 'v0.9.1',
    title: 'Orchestrated Bug Sweep',
    status: 'done',
    items: <>
      · 4 fanout agents (Auth, Data, UI, Integration)<br />
      · CSS token fixes<br />
      · Documentation sync
    </>,
  },
  {
    version: 'v0.9.2',
    title: 'Feedback, N-Gain & Workshop',
    status: 'done',
    items: <>
      · feedback.html kepraktisan pengguna<br />
      · ngain.html N-Gain Calculator SDL<br />
      · workshop.html panduan tatap muka<br />
      · modul.html Jurnal &amp; Studi Kasus
    </>,
  },
  {
    version: 'v0.9.3',
    title: 'Validasi Ahli, Analitik & Profil',
    status: 'done',
    items: <>
      · validasi.html instrumen ahli (16 indikator)<br />
      · analitik.html dasbor kelas dosen<br />
      · profil.html profil &amp; statistik belajar<br />
      · DataLayer +6 methods baru
    </>,
  },
  {
    version: 'v0.9.4',
    title: 'Onboarding, Skeleton & PWA',
    status: 'done',
    items: <>
      · Onboarding modal MHS (3-step) + DOS (2-step)<br />
      · Loading skeleton shimmer dashboard<br />
      · VARK summary visual + tips per tipe<br />
      · Export laporan PDF + PWA manifest + SW
    </>,
  },
  {
    version: 'v1.0.0',
    title: 'React Rewrite + Supabase Live',
    status: 'current',
    items: <>
      · 18 halaman React + Vite + TS + Tailwind v4<br />
      · Strangler-fig — legacy/ tetap ada, nol dead-end<br />
      · Skema Supabase live diverifikasi &amp; login diuji end-to-end<br />
      · AuthShell dua-panel dikembalikan
    </>,
  },
  {
    version: 'v1.0.1',
    title: 'Vercel Live + Sidebar/Flyout',
    status: 'planned',
    items: <>
      · Deploy production ke Vercel<br />
      · Layout: topbar → sidebar + flyout ala SAKTI<br />
      · Cek 1-per-1 seluruh halaman di production
    </>,
  },
  {
    version: 'v1.1',
    title: 'Rilis Penelitian',
    status: 'planned',
    items: <>
      · Uji lapangan (kelas penuh)<br />
      · Analisis N-Gain SDL data real<br />
      · HKI + artikel SINTA 3
    </>,
  },
]

const ROADMAP_STATUS_LABEL: Record<RoadmapItem['status'], string> = {
  done: '✓ Selesai',
  current: 'Sekarang ✦',
  planned: 'Sprint 10 →',
}

const ROADMAP_STATUS_CLASSES: Record<RoadmapItem['status'], string> = {
  done: 'bg-[#e8f2e8] text-[#4a7a4a]',
  current: 'bg-[#fdf2e4] text-[#7a5020]',
  planned: 'bg-bg3 text-brown-3 border border-[color:var(--border)]',
}

function VersionBlock({ entry }: { entry: VersionEntry }) {
  return (
    <div className="mb-9 border border-[color:var(--border)] rounded-xl bg-ivory overflow-hidden shadow-sm">
      <div className="flex items-center gap-3.5 px-5 py-4 bg-bg3 border-b border-[color:var(--border)] flex-wrap">
        <span className={`text-[13px] font-bold tracking-wide px-3 py-1 rounded-full font-mono flex-shrink-0 ${BADGE_CLASSES[entry.badge]}`}>
          {entry.version}
          {entry.badge === 'current' ? ' ✦' : entry.badgeSuffix ?? ''}
        </span>
        <span className="text-base font-bold text-brown flex-1">{entry.title}</span>
        <span className="text-xs text-brown-3 whitespace-nowrap">{entry.date}</span>
      </div>
      <div className="px-[22px] py-[18px]">
        <ul className="flex flex-col gap-2">
          {entry.changes.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${DOT_CLASSES[item.type]}`} />
              <span className={`inline-block text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${TAG_CLASSES[item.type]}`}>
                {TAG_LABEL[item.type]}
              </span>
              <span>{item.content}</span>
            </li>
          ))}
        </ul>
        {entry.desc && (
          <p className="text-[13px] text-brown-3 mt-3 pt-3 border-t border-[color:var(--border2)] italic">
            {entry.desc}
          </p>
        )}
      </div>
    </div>
  )
}

function RoadmapCard({ item }: { item: RoadmapItem }) {
  return (
    <div className="bg-ivory border border-[color:var(--border)] rounded-xl p-4">
      <div className="text-[11px] font-bold text-terra tracking-wide uppercase mb-1.5">{item.version}</div>
      <div className="text-sm font-semibold text-brown mb-2">{item.title}</div>
      <div className="text-xs text-brown-3 leading-loose">{item.items}</div>
      <span className={`inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${ROADMAP_STATUS_CLASSES[item.status]}`}>
        {ROADMAP_STATUS_LABEL[item.status]}
      </span>
    </div>
  )
}

export default function Changelog() {
  return (
    <Layout>
      <div className="max-w-[760px] mx-auto p-6 pb-20">
        <div className="mb-12">
          <h1 className="font-['Playfair_Display',serif] text-[32px] sm:text-[36px] font-bold text-brown leading-tight">
            Changelog 📋
          </h1>
          <p className="text-brown-3 mt-2 text-sm">
            Riwayat perubahan Perpustakaan Digital · SMART-FLIP 5.0 ·{' '}
            <a
              href="https://github.com/Inawati-dev/smart-flip"
              target="_blank"
              rel="noreferrer"
              className="text-terra-d no-underline"
            >
              github.com/Inawati-dev/smart-flip
            </a>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {(Object.keys(TAG_LABEL) as ChangeType[]).map((type) => (
            <div
              key={type}
              className="flex items-center gap-1.5 text-xs text-brown-2 px-2.5 py-1 rounded-full bg-ivory border border-[color:var(--border)]"
            >
              <span className={`text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded ${TAG_CLASSES[type]}`}>
                {TAG_LABEL[type]}
              </span>
              {type === 'feat' && 'Fitur baru'}
              {type === 'fix' && 'Perbaikan bug'}
              {type === 'imp' && 'Peningkatan'}
              {type === 'refac' && 'Refaktor kode'}
              {type === 'sec' && 'Keamanan'}
              {type === 'doc' && 'Dokumentasi'}
            </div>
          ))}
        </div>

        {versions.map((entry) => (
          <VersionBlock key={entry.version} entry={entry} />
        ))}

        <div className="mt-12">
          <h2 className="font-['Playfair_Display',serif] text-[22px] font-bold text-brown mb-5">
            Rencana ke Depan 🗺️
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {roadmap.map((item) => (
              <RoadmapCard key={item.version} item={item} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
