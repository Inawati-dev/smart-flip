import type { ReactNode } from 'react'
import { Layout } from '../components/Layout'
import { IconClipboard, IconCompass } from '../components/icons'

// Keep a Changelog 1.1.0 format (kemampuan-workflow.md §135) — categories are
// the section headers themselves now, replacing the old feat/fix/imp/refac/
// sec/doc tag-pill scheme. Old→new mapping used while rewriting every entry
// below: feat→Added, imp/refac/doc→Changed, fix→Fixed, sec→Security.
type KacCategory = 'Added' | 'Changed' | 'Fixed' | 'Removed' | 'Security'

const CATEGORY_ORDER: KacCategory[] = ['Added', 'Changed', 'Fixed', 'Removed', 'Security']

const CATEGORY_LABEL_ID: Record<KacCategory, string> = {
  Added: 'Ditambahkan',
  Changed: 'Diubah',
  Fixed: 'Diperbaiki',
  Removed: 'Dihapus',
  Security: 'Keamanan',
}

const CATEGORY_DOT: Record<KacCategory, string> = {
  Added: 'bg-sage-d',
  Changed: 'bg-terra',
  Fixed: 'bg-[#c5726b]',
  Removed: 'bg-brown-3',
  Security: 'bg-[#8b7cd4]',
}

interface VersionEntry {
  version: string
  date: string
  current?: boolean
  sections: Partial<Record<KacCategory, ReactNode[]>>
  desc?: ReactNode
}

interface RoadmapItem {
  version: string
  title: string
  items: ReactNode
  status: 'done' | 'current' | 'planned'
}

const c = (children: ReactNode) => <code className="bg-[#00000008] rounded px-1 text-[0.9em]">{children}</code>

const versions: VersionEntry[] = [
  {
    version: 'v1.0.0',
    date: '2026-07-23',
    current: true,
    sections: {
      Added: [
        <>Rewrite penuh 18 halaman dari vanilla HTML/JS ke React 19 + Vite + TypeScript + Tailwind v4 ({c('@theme')} CSS-first, tanpa {c('tailwind.config.ts')}), mengikuti stack SAKTI</>,
        <>Strangler-fig migration: {c('legacy/*.html')} dipertahankan sebagai fallback statis, semua navigasi live sudah 100% React Router — nol dead-end ke halaman lama</>,
        <>Data layer dual-mode di setiap modul ({c('src/lib/*.ts')}): query Supabase kalau {c('isSupabaseConfigured')}, fallback localStorage dengan key {c('sfp_*')} identik legacy</>,
        <>Login: alur &quot;Lupa kata sandi?&quot; via {c('supabase.auth.resetPasswordForEmail')} inline (bukan native prompt) — kirim link reset ke email</>,
        <>Tes Diagnostik Awal ({c('/diagnostik')}): 15 soal penempatan sekali di awal, skor &gt;80 → Jalur Cepat, ≤80 → Jalur Mendalam, permanen untuk 1 mata kuliah</>,
        <>Roadmap belajar visual di dashboard mahasiswa: Diagnostik → Bab 1..N → Rangkuman → UAS, status done/current/locked mengikuti progres nyata</>,
        <>Upload PDF modul langsung dari dosen ({c('/manajemen')}) ke Supabase Storage — sebelumnya cuma bisa lewat script dev atau edit DB manual</>,
        <>Tambah modul baru dari {c('/manajemen')} (sebelumnya cuma bisa edit modul yang sudah ada)</>,
        <>Katalog {c('/ebook')}: grid pilihan modul dengan cover asli (render halaman pertama PDF), bukan lagi dead-end &quot;Tidak ada buku yang dipilih&quot;</>,
        <>Admin CRUD soal tes diagnostik di {c('/manajemen')} — dosen bisa tambah/edit/hapus soal, bukan hardcode</>,
        <>Set ikon SVG custom ({c('src/components/icons.tsx')}) menggantikan emoji di seluruh UI</>,
      ],
      Changed: [
        <><strong>AuthShell</strong> — Login, Register &amp; Reset Password memakai layout editorial (wordmark besar + panel form terpisah), diadaptasi dari referensi Refero (bukan single-card generik hasil porting awal)</>,
        <>Login end-to-end diverifikasi dengan Supabase asli (bukan demo mode) — sign-in, fetch profile, redirect dashboard berjalan</>,
        <>Sidebar navigasi: dari topbar jadi kombinasi expanded-label + collapsible icon-rail + hover-flyout (ala SAKTI), preferensi collapse tersimpan per-browser</>,
        <>Tiap ikon nav punya aksen warna sendiri, bukan satu warna monokrom</>,
        <>Animasi transisi antar halaman: gaya iOS push (slide dari kanan + fade, easing khas {c('UINavigationController')})</>,
        <>Toast notifikasi pindah ke pojok kanan bawah di semua halaman (sebelumnya tengah-bawah, sering numpuk dengan modal)</>,
        <>{c('?book=')} di {c('/ebook')} sekarang membawa id modul, bukan URL Supabase Storage mentah — mencegah path storage bocor lewat address bar</>,
        <>Jalur cepat/mendalam jadi toggle densitas konten di halaman modul (bukan konten baru): jalur cepat menonjolkan studi kasus + meringkas materi jadi disclosure</>,
      ],
      Fixed: [
        <>Font Playfair Display &amp; DM Sans akhirnya termuat — {c('<link>')} Google Fonts sempat tidak pernah ditambahkan ke {c('index.html')} sehingga 13 file yang mereferensikannya diam-diam fallback ke font sistem</>,
        <>Isolasi env test dari kredensial Supabase asli — {c('.env.test.local')} kosong supaya {c('pnpm test')} tidak ikut kepakai kredensial dev lokal</>,
        <>Migrasi skema {c('profiles')}: tambah kolom {c('jabatan')} &amp; {c('fakultas')} — satu-satunya gap ditemukan dari audit skema penuh 15 halaman baru vs Supabase live</>,
        <>{c('ProtectedRoute')} fail-open saat fetch profil gagal — role {c('null')} bisa lolos role-gating; diperbaiki jadi fail-closed</>,
        <>Progress belajar gagal sync ke Supabase untuk modul dengan PDF hasil upload — key progres sekarang konsisten pakai id modul, bukan diturunkan dari nama file</>,
        <>Favicon hilang (default ikon browser) — ditambahkan</>,
      ],
    },
    desc: 'Migrasi arsitektur — aplikasi lama tetap hidup di legacy/ sebagai jaring pengaman, tapi seluruh pengalaman pengguna sekarang React.',
  },
  {
    version: 'v0.9.6',
    date: '2026-06-18',
    sections: {
      Added: [
        <><strong>profil-dos.html</strong> — Halaman profil khusus dosen: Data Diri (NIDN, jabatan fungsional, prodi, fakultas), Statistik Mengajar (4 stat cards), Aktivitas Kelas Terkini, Pengaturan (toggles + logout)</>,
        <>CSS animations library di style.css: {c('pageIn')}, {c('fadeUp')} (stagger), {c('toastIn')}, {c('modalIn')}, {c('shimmer')}, {c('progressFill')} — semua GPU-composited (transform/opacity)</>,
      ],
      Changed: [
        <>Card hover lift: {c('translateY(-3px)')} + shadow; button active: {c('scale(0.97)')}; nav item underline slide via {c('::after')}</>,
        <>{c('@media (prefers-reduced-motion: reduce)')} — semua animasi dimatikan (accessibility compliance)</>,
        <>CLAUDE.md: Sprint Roadmap diperbarui; v0.9.4–v0.9.6 tercatat lengkap</>,
      ],
      Fixed: [
        <><strong>isDemo pattern</strong> diterapkan ke semua 15 halaman protected: {c("const isDemo = localStorage.getItem('sfp_demo')==='1' || typeof sb==='undefined'")}</>,
        <>profil.html raw JS muncul di body — {c('</script>')} tag terpotong oleh injeksi sebelumnya; file dipulihkan + re-injected bersih</>,
        <>Bug sweep 16 fixes: null checks, broken event listeners, missing auth guards di 8 halaman</>,
        <>dashboard-dos.html — link profil mengarah ke {c('profil-dos.html')} di 4 titik navigasi (topbar, dropdown, mobile drawer, quick-card)</>,
      ],
    },
  },
  {
    version: 'v0.9.5',
    date: '2026-06-18',
    sections: {
      Added: [
        <>Logout confirmation modal di semua 15 halaman protected: &quot;Yakin ingin keluar?&quot; dengan tombol Batal + Keluar</>,
        <>Login toast feedback: visual feedback sebelum redirect ke dashboard</>,
      ],
      Changed: [
        <>CLAUDE.md: Mobile Support Rules ditambahkan — WAJIB setiap fitur support mobile 360–768px, input 16px (iOS anti-zoom), tap target 44×44px, modal 90vw/90vh</>,
        <>Semua modal/dialog: {c('max-width:90vw; max-height:90vh; overflow-y:auto')} — responsive mobile</>,
      ],
      Fixed: [<>Mobile audit: form, button, nav, grid di 375px dan 768px — semua halaman</>],
    },
  },
  {
    version: 'v0.9.4',
    date: '2026-06-18',
    sections: {
      Added: [
        <>Onboarding modal mahasiswa 3-step: Welcome, Cara Belajar, VARK Adaptive — flag {c('sfp_onboarded_v1')} di localStorage; bisa dipanggil ulang dari profil via {c('showOnboardingGuide()')}</>,
        <>Onboarding modal dosen 2-step: Welcome, Panduan Mulai — flag {c('sfp_onboarded_dos_v1')} di localStorage</>,
        <>VARK summary visual di profil.html: dominant style card, rekomendasi konten per gaya belajar, bar chart per-warna, tips belajar 3 poin per tipe (V/A/R/K)</>,
        <>Export laporan belajar PDF dari profil.html ({c('window.print')} + {c('@media print')} CSS)</>,
        <>PWA: {c('manifest.json')} + {c('sw.js')} (cache-first strategy), icon 192px + 512px; manifest link + {c('theme-color')} di 6 halaman utama; SW registration di index.html &amp; profil.html</>,
        <>Notifikasi: unread dot, 6 dummy notifs (modul/kuis/forum/draf/progres/sistem), empty state</>,
      ],
      Changed: [
        <>Loading skeleton shimmer di dashboard-mhs.html: stat cards + modul list (mencegah layout shift)</>,
        <>Toast error ramah: &quot;Koneksi bermasalah. Data ditampilkan dari cache lokal.&quot; (fallback offline)</>,
      ],
      Fixed: [
        <>&quot;Modul undefined&quot; di subtitle Lanjut Belajar — fallback {c('m.no || m.id')}</>,
        <>Global {c('unhandledrejection')} error handler di dashboard-mhs.html, modul.html, kuis.html</>,
      ],
    },
    desc: 'Sprint 9 — onboarding flow, UX polish (skeleton + toast), VARK visual summary, ekspor PDF, dan PWA support.',
  },
  {
    version: 'v0.9.3',
    date: '2026-06-18',
    sections: {
      Added: [
        <><strong>validasi.html</strong> — Instrumen Validasi Ahli: form 16 indikator (8 aspek media + 8 aspek materi), hitung rata-rata otomatis, kategori kelayakan (Sangat Layak/Layak/Cukup/Kurang), cetak hasil</>,
        <><strong>analitik.html</strong> — Dasbor Analitik Kelas: tabel progress 10 mahasiswa, grafik distribusi modul &amp; skor kuis, kepraktisan per aspek, flag mahasiswa tidak aktif, export CSV</>,
        <><strong>profil.html</strong> — Profil Pengguna: edit data diri, hasil gaya belajar VARK, statistik belajar pribadi, riwayat kuis, reset data demo</>,
      ],
      Changed: [<>DataLayer: +6 methods baru (saveValidasi, getValidasi, saveProfil, getProfil)</>],
      Fixed: [<>Integrasi navigasi: link ke profil.html di semua halaman mahasiswa; link ke analitik.html &amp; validasi.html di halaman dosen</>],
    },
    desc: 'Sprint 8 — validasi ahli instrumen, dasbor analitik kelas dosen, dan halaman profil pengguna.',
  },
  {
    version: 'v0.9.2',
    date: '2026-06-17',
    sections: {
      Added: [
        <><strong>feedback.html</strong> — Form kepraktisan pengguna: rating bintang 1–5 per 4 aspek (konten, kemudahan, keterbacaan, kebermanfaatan), riwayat per modul</>,
        <><strong>ngain.html</strong> — N-Gain Calculator SDL: input pre/post-test, hitung N-Gain otomatis, kategori Tinggi/Sedang/Rendah, grafik distribusi, export CSV</>,
        <><strong>workshop.html</strong> — Panduan sesi tatap muka 9 modul: tab Tujuan/Aktivitas/Checklist/Lembar Kerja, print-friendly</>,
        <><strong>modul.html</strong> — Section Jurnal &amp; Studi Kasus: 3 referensi jurnal + 2 studi kasus per modul (27 jurnal, 18 kasus total)</>,
      ],
      Changed: [
        <>9 dummy PDF modul (8 halaman/modul): cover, capaian, peta konsep, 4 sesi materi, latihan &amp; ringkasan</>,
        <>Seed data demo diperkaya: progress 3 modul, riwayat kuis, 7 forum posts, 4 drafts, 6 notifikasi, VARK pre-seeded</>,
        <>DataLayer: tambah {c('saveFeedback()')} dan {c('getFeedback()')}</>,
      ],
      Fixed: [
        <>Bug sweep v0.9.1: 36 fixes (auth, data, mobile UI, CSS tokens, escHtml, changelog sync)</>,
        <>Folder cleanup: assets/, books/ modul-NN.pdf, .gitignore diperbarui</>,
      ],
    },
    desc: 'Sprint 7 — Studi Kasus & Jurnal, form kepraktisan, N-Gain Calculator SDL, dan panduan workshop tatap muka.',
  },
  {
    version: 'v0.9.1',
    date: '2026-06-16',
    sections: {
      Changed: [<>CLAUDE.md: update Sprint Roadmap + Key Files list</>],
      Fixed: [
        <>Auth guard konsistensi di semua halaman protected — null guard, role mismatch redirect</>,
        <>DataLayer method calls — null checks, fallback values, error handling</>,
        <>UI &amp; Mobile — tap targets, font sizes, overflow issues di semua halaman</>,
        <>style.css: {c('var(--terra-dark)')} → {c('var(--terra-d)')} (4 occurrences)</>,
        <>changelog.html: tambah entri v0.8, v0.8.1, v0.9, v0.9.1 yang hilang</>,
      ],
    },
    desc: 'Orchestrated bug sweep (4 fanout agents): Auth & Security, Data & Logic, UI & Mobile, Integration & Cross-file.',
  },
  {
    version: 'v0.9',
    date: '2026-06-14',
    sections: {
      Added: [
        <>data-layer.js: abstraksi data layer (localStorage → Supabase toggle via USE_SUPABASE flag)</>,
        <>vark.html: asesmen gaya belajar VARK (12 pertanyaan, simpan ke DataLayer)</>,
        <>forum.html: forum peer-review per modul (post + reply + like, avatar warna per nama)</>,
        <>draf.html: portal asistensi draf — mahasiswa upload, dosen review &amp; komentar</>,
        <>Notifikasi bell icon di semua dashboard (in-app, markRead, markAllRead)</>,
        <>Donut chart progress modul di dashboard-mhs &amp; dos (SVG animasi)</>,
        <>Checklist metakognitif self-reflection per modul (5 item, simpan ke DataLayer)</>,
        <>Sequential content lock: video → PDF → kuis (unlock bertahap per modul)</>,
      ],
      Changed: [
        <>modul.html: embed video YouTube, time-on-task tracking, VARK-adaptive content reorder</>,
        <>kuis.html: umpan balik kuis adaptif per rentang skor + navigasi modul berikutnya</>,
        <>Semua halaman: ganti hardcode langsung ke DataLayer.* calls</>,
      ],
    },
    desc: 'Sprint 4 & 5 — adaptive learning engine, social features (forum + draf), dan donut chart SDL tracking.',
  },
  {
    version: 'v0.8.1',
    date: '2026-06-12',
    sections: {
      Added: [<>reset-password.html: halaman reset password via Supabase email link (3 state: form → loading → success)</>],
      Changed: [<>Konsolidasi login.html → redirect stub ke index.html (hapus duplikasi form login)</>],
      Fixed: [<>modules-data.js: fix distribusi jawaban kuis — A:11, B:11, C:11, D:12 (sebelumnya tidak merata)</>],
    },
  },
  {
    version: 'v0.8',
    date: '2026-06-11',
    sections: {
      Added: [
        <>Auth guard di semua halaman protected (redirect ke index.html jika tidak ada sesi)</>,
        <>Tombol &quot;Lanjut Belajar&quot; di dashboard-mhs — lanjut ke modul terakhir dikerjakan</>,
      ],
      Changed: [<>Mobile responsive: index.html, register.html, modul.html, kuis.html, dashboard (360px–768px)</>],
      Fixed: [
        <>Bug sweep (10 bugs): null guard spineEl, HTML escaping kuis XSS, CSS var --terra-dark, race condition bgRunning, dan lainnya</>,
        <>style.css: tambah {c('-webkit-backdrop-filter')} untuk Safari compatibility</>,
      ],
    },
    desc: 'Sprint 3 — auth, mobile, dan bug sweep menyeluruh.',
  },
  {
    version: 'v0.7',
    date: '2026-06-09',
    sections: {
      Added: [
        <>modules-data.js: 9 modul RPS + 45 soal kuis dummy pilihan ganda</>,
        <>modul.html: halaman detail modul — cover PDF, capaian, materi sesi, progress, riwayat kuis</>,
        <>kuis.html: kuis formatif 5 soal/modul — satu per satu, feedback langsung, pembahasan soal</>,
        <>Skor kuis: verdict adaptif — Sangat Baik (≥80%) / Lulus (≥60%) / Perlu Mengulang (&lt;60%)</>,
        <>localStorage progress baca: halaman terakhir, persentase, tanggal terakhir buka</>,
        <>localStorage riwayat kuis: simpan max 10 percobaan, tampil di modul.html</>,
      ],
      Changed: [
        <>dashboard-mhs: tombol ▶ Mulai/Lanjut/Baca Ulang mengarah ke modul.html?id=X</>,
        <>ebook.html: URL param ?book= untuk auto-open modul tertentu dari link eksternal</>,
      ],
    },
  },
  {
    version: 'v0.5.2',
    date: '2026-06-09',
    sections: {
      Added: [
        <>Ebook: katalog buku pindah ke panel kiri; flipbook reader ke kanan</>,
        <>Ebook: cover buku dari halaman pertama PDF (render via pdf.js, async per kartu)</>,
        <>Ebook: tombol ← Dashboard auth-aware — redirect ke dashboard-mhs/dos jika login, atau index.html jika demo</>,
        <>Dashboard Mahasiswa &amp; Dosen: link Changelog &amp; Checklist di sidebar footer</>,
      ],
      Changed: [<>Login (index.html + login.html): tombol Demo Mahasiswa &amp; Demo Dosen selalu tampil di semua environment</>],
      Fixed: [
        <>index.html: error &quot;sb is not defined&quot; — DEMO_MODE guard pada semua panggilan sb.*</>,
        <>register.html: error &quot;sb is not defined&quot; — fallback demo mode dengan redirect ke login</>,
      ],
    },
    desc: 'Sprint 2 patch — perbaikan UX login demo, overhaul ebook reader, dan navigasi changelog/checklist di semua halaman.',
  },
  {
    version: 'v0.5',
    date: '2026-06-09',
    sections: {
      Added: [
        <>Dashboard Mahasiswa — sidebar lengkap: Dashboard, Modul, Video, Kuis, Forum, Draf Saya, Progress, Pengaturan (semua dengan ikon SVG)</>,
        <>Dashboard Mahasiswa — welcome banner dengan nama + streak belajar; stat cards animasi (modul selesai, rata-rata kuis, waktu belajar)</>,
        <>Dashboard Mahasiswa — modul aktif dengan progress bar per modul (Selesai / Sedang / Terkunci), warna adaptif</>,
        <>Dashboard Mahasiswa — halaman Video (6 video per modul), Kuis (riwayat + skor berwarna), Forum diskusi, Draf Saya, Progress visual, Pengaturan profil</>,
        <>Dashboard Dosen — sidebar: Dashboard, Mahasiswa, Modul, Analitik, Forum, Validasi, Pengaturan</>,
        <>Dashboard Dosen — class header MK Metpen &amp; Pengembangan Kelas A (32 mahasiswa); stat cards (68% progres, 24 draf, 5 perlu asistensi)</>,
        <>Dashboard Dosen — bar chart distribusi skor kuis dengan tooltip hover (6 rentang: 40–100)</>,
        <>Dashboard Dosen — tabel 32 mahasiswa dummy dengan search real-time + export CSV</>,
        <>Dashboard Dosen — halaman Analitik (chart distribusi skor + penyelesaian per modul), Forum, Validasi ahli (media &amp; materi dengan skor bar)</>,
      ],
      Changed: [
        <>Avatar dropdown di kedua dashboard: Edit Profil + Logout (menggantikan klik langsung logout)</>,
        <>Role badge di topbar (Mahasiswa / Dosen) untuk identifikasi cepat</>,
        <>Dummy data lengkap — seluruh UI bisa dilihat tanpa koneksi database (fallback otomatis)</>,
        <>Auth guard dipertahankan — fallback ke dummy jika offline/localhost, redirect ke login jika production &amp; tidak ada sesi</>,
      ],
    },
    desc: 'Sprint 2 — fokus UI/UX dashboard sebagai fondasi sebelum integrasi data Supabase live dan modul konten.',
  },
  {
    version: 'v0.4',
    date: '2026-06-09',
    sections: {
      Added: [
        <>Split-layout baru: flip pane (kiri) + catalog pane (kanan) dengan CSS Grid 1fr 320px</>,
        <>Autentikasi pengguna via Supabase Auth — login, register, forgot password</>,
        <>Dashboard Mahasiswa: stat cards, daftar modul adaptif, progress bar, riwayat kuis</>,
        <>Dashboard Dosen: monitor progress semua mahasiswa, highlight perlu bantuan, export CSV</>,
        <>Database Supabase PostgreSQL: 8 tabel (profiles, modules, user_progress, quiz_questions, quiz_attempts, drafts, draft_comments, forum_posts)</>,
        <>Adaptive learning: modul terkunci otomatis sampai modul sebelumnya selesai</>,
        <>Mobile overlay: flip pane masuk dari kiri, tombol ← Katalog untuk kembali</>,
        <>Tombol &quot;Buka Penuh&quot; (expanded mode) untuk membaca tanpa gangguan</>,
        <>Halaman changelog ini (changelog.html)</>,
        <>CHECKLIST.md: 10 fase pengembangan dari setup hingga HKI/diseminasi</>,
      ],
      Changed: [
        <>Catalog pane selalu terlihat di desktop — tidak perlu beralih view</>,
        <>Auto-load buku pertama di desktop setelah katalog dimuat</>,
        <>DOM IDs baru: flipPane, catPane, flLoader, stage, toolbar (konsisten dengan split layout)</>,
        <>IndexedDB cache diperbarui ke FlipbookCache2 (hindari konflik cache lama)</>,
      ],
      Fixed: [<>supabase.js: variabel client diganti dari {c('db')} ke {c('sb')} (konsisten dengan semua halaman)</>],
      Security: [<>supabase.js masuk .gitignore — credential tidak ter-commit ke repo publik</>],
    },
  },
  {
    version: 'v0.3',
    date: '2026-06-07',
    sections: {
      Added: [
        <>GitHub Actions workflow ({c('scan-books.yml')}): auto-scan folder books/ setiap push, perbarui config.json otomatis</>,
        <>IndexedDB cache (FlipbookCache) — buku langsung terbuka di kunjungan kedua tanpa render ulang</>,
        <>Cache invalidation: deteksi perubahan PDF via Content-Length header</>,
        <>Lazy rendering: tampilkan buku setelah 6 halaman pertama selesai, render sisa di background</>,
      ],
      Changed: [<>Background progress chip di toolbar: tampilkan status render halaman sisa</>],
      Fixed: [<>GitHub Actions: tambah {c('git pull --rebase')} sebelum push untuk cegah konflik remote</>],
    },
  },
  {
    version: 'v0.2',
    date: '2026-06-05',
    sections: {
      Added: [
        <>Animasi flip halaman 3D dengan CSS {c('rotateY()')} dan {c('transform-style: preserve-3d')}</>,
        <>Zoom system lengkap: scroll wheel zoom-to-cursor, pinch-to-zoom (mobile), tombol +/−, drag-to-pan</>,
        <>Double-click: zoom 2× / reset ke 100%</>,
        <>Keyboard shortcuts: ← → navigasi halaman, +/− zoom, 0 reset zoom, F toggle fullscreen</>,
        <>Thumbnail strip: klik ⊞ untuk lihat semua halaman, klik thumbnail untuk lompat</>,
      ],
      Changed: [
        <>Toolbar lengkap: First/Prev/Next/Last, page counter, zoom controls, expand</>,
        <>Zoom hint muncul otomatis saat pertama kali buka buku</>,
      ],
    },
  },
  {
    version: 'v0.1',
    date: '2026-06-01',
    sections: {
      Added: [
        <>Render PDF ke canvas menggunakan pdf.js v3.11.174 (CDN)</>,
        <>Tampilan dua halaman (spread) — baca seperti buku fisik</>,
        <>Catalog view: grid buku dari config.json, klik untuk buka</>,
        <>Design warm earth-tone: Playfair Display + DM Sans, palet cream/sage/terra</>,
        <>Local dev server: serve.bat (python -m http.server 8080)</>,
        <>README awal, scan_books.py untuk generate config.json manual</>,
      ],
    },
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
    title: 'React Rewrite + Diagnostik + Supabase Live',
    status: 'done',
    items: <>
      · 18 halaman React + Vite + TS + Tailwind v4<br />
      · Tes diagnostik + roadmap belajar visual<br />
      · Upload PDF &amp; tambah modul dari dosen<br />
      · Skema Supabase live diverifikasi &amp; login diuji end-to-end
    </>,
  },
  {
    version: 'v1.0.1',
    title: 'Vercel Production Branch + QA',
    status: 'current',
    items: <>
      · Set Production Branch di Vercel (auto-deploy tiap push)<br />
      · Cek 1-per-1 seluruh halaman di production<br />
      · Redesain flipbook reader (cover asli, layout lebih lega)
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

// Groups consecutive same-date entries under one date header instead of
// repeating the date on every version card — several versions in `versions`
// already share a release date (v0.9.4/v0.9.5/v0.9.6 all 2026-06-18), which
// is exactly the shape SAKTI's own changelog (sakti-ku.vercel.app/#changelog)
// groups by, per the user's explicit reference request.
function groupByDate(entries: VersionEntry[]): Array<{ date: string; entries: VersionEntry[] }> {
  const groups: Array<{ date: string; entries: VersionEntry[] }> = []
  for (const entry of entries) {
    const last = groups[groups.length - 1]
    if (last && last.date === entry.date) last.entries.push(entry)
    else groups.push({ date: entry.date, entries: [entry] })
  }
  return groups
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
}

function VersionBlock({ entry }: { entry: VersionEntry }) {
  return (
    <div className="border border-[color:var(--border)] rounded-xl bg-ivory overflow-hidden shadow-sm">
      <div className="flex items-center gap-3.5 px-5 py-4 bg-bg3 border-b border-[color:var(--border)] flex-wrap">
        <span
          className={`text-[13px] font-bold tracking-wide px-3 py-1 rounded-full font-mono flex-shrink-0 ${
            entry.current ? 'bg-terra-d text-white shadow-[0_0_0_3px_rgba(212,163,115,.25)]' : 'bg-ivory text-brown-2 border border-[color:var(--border)]'
          }`}
        >
          {entry.version}
          {entry.current ? ' ✦' : ''}
        </span>
      </div>
      <div className="px-[22px] py-[18px] flex flex-col gap-4">
        {CATEGORY_ORDER.filter((cat) => entry.sections[cat]?.length).map((cat) => (
          <div key={cat}>
            <h3 className="text-[11px] font-bold tracking-widest uppercase text-brown-3 mb-2">
              {CATEGORY_LABEL_ID[cat]}
            </h3>
            <ul className="flex flex-col gap-2">
              {entry.sections[cat]!.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
                  <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${CATEGORY_DOT[cat]}`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {entry.desc && (
          <p className="text-[13px] text-brown-3 pt-3 border-t border-[color:var(--border2)] italic">
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
      <div className="p-6 pb-20">
        <div className="mb-12">
          <h1 className="flex items-center gap-2.5 font-display text-[32px] sm:text-[36px] font-bold text-brown leading-tight">
            Changelog <IconClipboard size={28} />
          </h1>
          <p className="text-brown-3 mt-2 text-sm">
            Riwayat perubahan Perpustakaan Digital · SMART-FLIP 5.0 — mengikuti format{' '}
            <a
              href="https://keepachangelog.com/id/1.1.0/"
              target="_blank"
              rel="noreferrer"
              className="text-terra-d no-underline"
            >
              Keep a Changelog 1.1.0
            </a>
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {groupByDate(versions).map((group) => (
            <div key={group.date}>
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-brown-3 mb-3">
                {formatDateHeader(group.date)}
              </h2>
              <div className="flex flex-col gap-4">
                {group.entries.map((entry) => (
                  <VersionBlock key={entry.version} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="flex items-center gap-2 font-display text-[22px] font-bold text-brown mb-5">
            Rencana ke Depan <IconCompass size={20} />
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {roadmap.map((item) => (
              <RoadmapCard key={item.version} item={item} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
