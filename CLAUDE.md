# SMART-FLIP 5.0 — Project Guide for Claude

## Overview
Perpustakaan Digital / Flipbook Reader untuk penelitian dana internal UM 2026.
Live: https://jiakbar.github.io/smart-flipbook
Stack: GitHub Pages (frontend) + Supabase (PostgreSQL + Auth)

## Key Files
```
index.html          — Login / halaman utama
register.html       — Registrasi mahasiswa/dosen
reset-password.html — Reset password via Supabase email link
dashboard-mhs.html  — Dashboard mahasiswa
dashboard-dos.html  — Dashboard dosen
ebook.html          — Flipbook reader (catalog overlay + PDF viewer)
modul.html          — Detail modul (cover PDF, progress, riwayat kuis)
kuis.html           — Kuis formatif per modul
forum.html          — Forum peer-review per modul
draf.html           — Portal asistensi draf (mahasiswa upload, dosen review)
vark.html           — Asesmen gaya belajar VARK (12 pertanyaan)
changelog.html      — Riwayat versi
checklist.html      — Checklist pengembangan
script.js           — Flipbook engine (lazy PDF render, Map cache)
style.css           — Global styles
modules-data.js     — 9 modul + 45 soal kuis dummy
data-layer.js       — Data abstraction layer (localStorage → Supabase toggle)
config.json         — Daftar PDF di folder books/
supabase.js         — Supabase credentials (JANGAN DI-COMMIT — gitignored)
serve.bat           — Local dev server
```

## Security Rules (WAJIB)
- `supabase.js` TIDAK PERNAH di-commit — selalu pakai `git add -- ":(exclude)supabase.js"`
- Hanya anon/public Supabase key yang boleh ada di frontend
- JANGAN jalankan git dari Linux sandbox — selalu dari Windows Terminal

## Git Workflow
```bash
# Dari Windows Terminal (bukan bash/shell Claude):
cd "C:\1-Johan\10. Pengembangan\smart-flipbook"
git add -- ":(exclude)supabase.js"
git commit -m "vX.X — deskripsi singkat"
git pull --rebase && git push
```

## Auth Pattern (Supabase)
Semua halaman protected (kecuali index.html dan register.html) harus punya:
```javascript
(async () => {
  if (typeof sb === 'undefined') return; // demo mode — skip auth
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.replace('index.html'); return; }
  // load user data...
})();
```

Logout pattern (semua halaman):
```javascript
async function doLogout() {
  try { if (typeof sb !== 'undefined') await sb.auth.signOut(); } catch(e) {}
  window.location.href = 'index.html';
}
```

## Mobile Support Rules
- Semua halaman harus responsive di lebar 360px–768px
- Gunakan CSS media query `@media(max-width:640px)` atau `@media(max-width:768px)`
- Sidebar dashboard: collapse/hide di mobile, ganti dengan bottom nav atau hamburger
- Font size minimum 13px di mobile
- Tap targets minimum 44×44px
- Avoid `overflow:hidden` di body untuk mobile scroll

## Design Tokens (CSS Variables)
```css
--cream:#F5F2E9   /* background utama */
--ivory:#FFFDF8   /* card background */
--sage:#8FA287    /* accent hijau (selesai) */
--terra:#D4A373   /* accent coklat-oranye (utama) */
--terra-d:#B8855A /* terra dark */
--brown:#3E362E   /* teks utama */
--brown2:#6B5D4F  /* teks sekunder */
--brown3:#9B8B7A  /* teks muted */
--border:rgba(62,54,46,.10)
```

## Agent Spawn Workflow (STANDAR)
**Setiap task implementasi besar WAJIB menggunakan Agent Spawn:**

### Implementasi fitur baru
```
Agent(task="Implementasi [fitur] di [file]", isolation="worktree")
```

### Bug sweep (wajib setelah setiap sprint)
Spawn dedicated agent dengan prompt:
- Scan semua .html, .js, .css untuk bug
- Cek: uncaught promise rejections, missing null checks, broken event listeners
- Cek: hardcoded values yang harusnya dinamis
- Cek: mobile layout issues (overflow, tap target, font size)
- Cek: auth guard konsistensi di semua halaman protected
- Output: daftar bug + severity (critical/medium/low) + file:line

### Mobile UI audit
Spawn dedicated agent untuk:
- Screenshot simulation semua halaman di 375px, 768px
- Cek semua form, button, nav, modal di mobile
- Fix inline — tidak perlu konfirmasi untuk layout fix

## Sprint Roadmap
- v0.7.2 ✓ — script.js rewrite (no IDB, Map cache), ebook overlay catalog
- v0.8 ✓ — Auth guard semua halaman, Lanjut Belajar, mobile UI fix, bug sweep (10 bugs fixed)
- v0.8.1 ✓ — reset-password.html, konsolidasi login pages, fix quiz answer distribution
- v0.9 ✓ — DataLayer, VARK, forum.html, draf.html, notifikasi, donut chart, modul video + seq lock
- v0.9.1 ✓ — Bug sweep orchestrated (4 fanout agents), CSS token fixes, doc sync
- v1.0 → Sprint 6: Supabase live sync, uji lapangan, N-Gain SDL, HKI

## Supabase Tables (8 tabel)
profiles, modules, module_progress, quiz_attempts, forum_posts, draft_submissions, notifications, learning_sessions

## Local Dev
Jalankan `serve.bat` dari Windows Explorer atau terminal, buka http://localhost:8080
