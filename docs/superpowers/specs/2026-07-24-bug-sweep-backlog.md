# Bug Sweep Backlog — 2026-07-24

Hasil bug-sweep menyeluruh (5 agent fanout, read-only) atas kerjaan sesi 2026-07-23/24
(React rewrite + diagnostic-adaptive spec + full-width sweep + PDF upload + dll).

**Update sore ini**: semua kritis/tinggi/medium dikerjain (2 langsung, sisanya lewat 5 agent
fanout paralel), plus sebagian besar rendah. Test suite 222/222 pass, typecheck bersih di
setiap batch. Lihat commit `1cb20fa` (kritis+tinggi) dan `2ae24a0` (medium+rendah) di
branch `claude/audit-demo-fields`, sudah di-merge ke `main`.

## 🔴 Kritis — ✅ SELESAI

1. **Loop redirect tak terhingga pasca tes diagnostik** — ✅ Fixed.
   `AuthContext.tsx` dapet `refreshProfile()`; `Diagnostik.tsx` panggil abis `saveJalur()`
   sukses, sebelum navigate ke dashboard.

2. **CRUD soal diagnostik nelan error Supabase, toast palsu "berhasil"** — ✅ Fixed.
   `diagnostic.ts`'s create/update/delete sekarang rethrow error kalau Supabase configured,
   gak fallback silent ke localStorage lagi (localStorage cuma dipake kalau beneran demo mode).

## 🟠 Tinggi — ✅ SELESAI

3. **Role guard bisa dilewatin pas login** — ✅ Fixed.
   `Login.tsx` sekarang bedain `PGRST116` (no rows, aman bootstrap) vs error asli (sign-out +
   pesan error, gak upsert role dari toggle client).

## 🟡 Medium — ✅ SELESAI (semua 16 item)

4–18 semua fixed lewat fan-out agent (lihat commit `2ae24a0` message buat detail per-file):
Ebook.tsx NaN handling, Manajemen create-modul field drop, upload-PDF no-op saat create,
bulk action rollback+toast akurat, uploadModulPdf orphan cleanup, saveModulOrder
allSettled+rollback, Layout.tsx sidebar containing-block fix + ErrorBoundary, Profil tap
targets, /changelog ProtectedRoute, tombol aksi Manajemen 44px, query-key diagnostic
disatuin.

## ⚪ Rendah — sebagian besar selesai, 2 di-defer

20. Diagnostik "15 pertanyaan" flash — **skip**, self-resolving, angka fallback = angka seed asli.
21. AuthContext try/catch defensif — ✅ Fixed.
22. AuthContext cek isSupabaseConfigured — **dicoba, di-revert**. Short-circuit bikin 2 test
    di `AuthContext.test.tsx` gagal (test itu sengaja pasang `isSupabaseConfigured: false`
    sambil tetap mock sesi asli buat nguji fail-closed behavior — bukan berarti "gak
    configured beneran"). Bukan bug nyata, cuma potensi optimisasi kecil; gak worth resiko.
23. `text-xs` di bawah 13px — ✅ Fixed (AuthShell/ResetPassword/Login, pola `text-[13px]`).
24. `createModul` self-guard config — ✅ Fixed.
25. `uploadModulPdf` demo-mode blob orphan — belum disentuh (masih gak ke-reach lewat UI shipped).
26. `forum.ts` Date.now() id collision — ✅ Fixed, ganti `crypto.randomUUID()`.
27. Forum.tsx/Draf.tsx tap target <44px — ✅ Fixed.
28. Modal gak ada animasi keluar (app-wide) — **skip**, butuh infra animasi baru (delayed
    unmount/library) buat SEMUA modal di app, bukan fix 1 file. Perlu keputusan desain
    terpisah, di luar scope bug-sweep ini.
29. Pengaturan.tsx `<a>` vs `<Link>` — ✅ Fixed.
30. ModuleCard tap target — ✅ Fixed.
31. **(baru ketemu pas eksekusi)** Modul.tsx jalur-cepat layout reflow saat deep-link
    langsung ke `/modul/:id` sebelum `profile` resolve — **dicoba, di-revert**. Fix (gating
    render di belakang `authLoading`) bentrok sama `Modul.test.tsx` yang pakai
    `renderToStaticMarkup` (gak pernah jalanin `useEffect`, jadi `loading` selamanya `true`
    di situ, bikin 1 test gagal). Edge-case murni kosmetik (cuma kena refresh/deep-link
    langsung, bukan navigasi normal dari dashboard) — gak worth ubah pola test demi ini.

## Item yang sengaja di-defer (butuh keputusan/infra terpisah, bukan mechanical fix)

- **#8 Register.tsx dosen gate** — ditambah client-side invite-code deterrent
  (`VITE_DOSEN_INVITE_CODE`), TAPI ini bukan security beneran (bisa dilewatin lewat devtools).
  Enforcement asli butuh Supabase RLS/trigger server-side — perlu didiskusikan kalau mau
  beneran ditutup.
- **#28 modal exit animation app-wide** — lihat rendah #28 di atas.
- **#22 AuthContext isSupabaseConfigured** dan **#31 Modul.tsx reflow** — reverted, lihat
  penjelasan masing-masing di atas.
