# Design System — sumber tunggal lintas-proyek

> Diseed dari `04 - Referensi/Referensi UI Standar/index.html` ("Registri.148") di
> proyek AI Skill, 2026-07-25. File ini IDENTIK dengan
> `SAKTI - Tracing Keuangan/.interface-design/system.md` — dua-duanya harus tetap sinkron.
> Kalau ubah salah satu, ubah keduanya + update Registri.148.

## Direction & feel
Fungsional, padat-data, gak dekoratif di halaman kerja. Aksen warna 1 (accent), sisanya netral
(ink/paper/rule). Dekoratif (motion, background canvas, ilustrasi custom) HANYA di halaman
showcase (login/landing/onboarding), NOL di halaman kerja (dashboard/tabel/form entri data).
Detail aturan: lihat `kemampuan-workflow.md` §149 (2 tingkat: primitif inti vs dekoratif).

## Depth strategy & spacing
- Depth: flat + 1 shadow tier buat modal/dropdown-popup (`0 24px 64px rgba(0,0,0,.28)` modal,
  `0 10px 30px rgba(0,0,0,.16)` flyout/dropdown). Kartu biasa: border 1px, TANPA shadow.
- Radius: 8px (button/card standar), 6px (btn-sm/dropdown/tab), 10px (btn-lg/modal-progress
  container), 12px (modal card).
- Spacing base: kelipatan ~4-6px gak grid ketat 4px/8px murni — pola nyata: `9px 16px` (btn),
  `12px 14px`/`8px 14px` (stat-card tier1/tier2), `18px 20px 14px` (modal head).

## Key component patterns (SUMBER: Registri.148, jangan reinvent)

**Button** — pad `9px 16px`, radius `8px`, font `13.5px/600`.
  - `.btn-sm`: pad `5px 11px`, font `12px`, radius `6px`.
  - `.btn-lg`: pad `12px 22px`, font `15px`, radius `10px`.
  - Varian: primary (bg=ink), secondary (bg=paper+border), danger (bg=accent), ghost (transparent).
  - Gaya bernama opsional (kalau proyek butuh identitas kuat): San Rita (radius 0, hijau tua
    #16281d), Mercury (radius 40px pill, ungu #5266eb), Linear (radius 6px, kuning #e4f222),
    Prisma (radius 6px, teal #14b8a6).

**Modal** — card `max-width:380px`, radius `12px`, shadow `0 24px 64px rgba(0,0,0,.28)`, masuk
  animasi `0.2s ease` (opacity+translateY(-10px)+scale(0.97) → normal). Head padding
  `18px 20px 14px`, varian Welcome pakai bg `--good` (hijau), varian biasa pakai `--accent`.
  - **Progress-bar auto-close** (dipakai di Welcome Modal): track height `3px` bg `--rule`,
    fill bg `--good` width 100%→0% durasi **5 detik**, DAN tombol "Mulai Bekerja" buat skip
    manual. INI YANG SERING DRIFT ANTAR PROYEK — pastikan durasi & 2 cara tutup (auto+manual)
    selalu ada bareng, jangan cuma salah satu.

**Dropdown** — trigger pad `9px 12px`, popup shadow `0 10px 30px rgba(0,0,0,.16)`, radius `8px`.
  Varian "bisa dicari" (list panjang, >~15 item): tambah input filter di atas list, popup via
  portal+`position:fixed` (BUKAN absolute, biar gak ke-clip scroll container tabel).

**Stat Card (2-tingkat)** — Tier1 (metrik utama): `flex:1 1 160px`, pad `12px 14px`, label
  10.5px uppercase muted+ikon, value **17px/700**. Tier2 (breakdown): `flex:1 1 130px`, pad
  `8px 14px`, label-kiri/value-kanan sebaris, value **12.5px/600**. Wrapper: `display:flex;
  flexWrap:wrap; gap:1px; background:border-color` (trik hairline — background border-color
  jadi "garis" antar sel, BUKAN border per-item, biar baris ganjil terakhir gak nyisa sel
  kosong keliatan bolong).
  - ⚠️ RIWAYAT: pernah dicoba versi "v2 bordered+center" (kartu terpisah, icon dalam lingkaran)
    — DIREVERT, gak bertahan. Jangan diusulkan ulang tanpa tau ini udah pernah gagal.

**Sidebar/Rail** — collapsed `56-64px` lebar, expanded `200px`, transisi width `0.22s ease`.
  3 pola submenu (pilih SATU per app, jangan campur): A) collapse-only (nav pendek ≤6 item,
  tooltip cukup), B) flyout permanen (submenu muncul di samping via hover/focus-within),
  C) toggle+flyout kombinasi (collapsed=flyout, expanded=submenu jadi nested-list inline).

## Catatan khusus Smart Flipbook
Stack vanilla JS (bukan React) — pola di atas tetap berlaku secara VISUAL/spacing/timing,
implementasinya diterjemahkan ke DOM manipulation manual, bukan JSX. Kalau ada pola SAKTI yang
gak applicable ke vanilla JS (misal state React-only), catat di sini sebagai pengecualian —
JANGAN diam-diam skip tanpa catatan.

## Consistency checks
Sebelum nambah/ubah komponen di atas: cek dulu ke Registri.148 (`04 - Referensi/Referensi UI
Standar/index.html` di proyek AI Skill) — kalau primitif inti (Button/Modal/Dropdown/Table/
StatCard/Sidebar), HARUS sama persis. Kalau dekoratif, cek dulu halaman ini "kerja" atau
"showcase" (lihat §149). Nemu drift antar proyek → laporkan, jangan diam-diam dibiarkan beda.
