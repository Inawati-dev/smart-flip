# Tes Diagnostik Awal + Jalur Cepat/Mendalam + Peta Belajar Visual — Design

Status: approved by user 2026-07-23, pending spec self-review + user file review.

## Context

The manuscript's adaptive-learning diagram ("ALUR BELAJAR ADAPTIF SMART-FLIP 5.0", naskah BAB II)
describes a flow the platform does not implement yet:

```
Tes Diagnostik Awal
  → Skor Tinggi (>80): Jalur Cepat (ringkasan + studi kasus)
  → Skor Standar (<=80): Jalur Mendalam (materi lengkap bertahap)
  → Bab 1 → Kuis Formatif → (<70 Remedial / 70-80 Lanjut / >80 Pengayaan) → Bab 2..6 (pola sama)
  → Rangkuman Akhir & Refleksi CPMK → Ujian Sumatif (UAS)
```

Confirmed by grepping the codebase: `diagnostik`, `jalur cepat`, `jalur mendalam` do not exist
anywhere. What already exists is only the per-bab quiz-formatif branching (`<70`/`70-80`/`>80`
in `kuis.html`/`modul.html`) — the one-time course-entry diagnostic gate and the resulting
Jalur Cepat/Mendalam content-density toggle are a new, additional layer on top of that.

The video and PDF content per module already exist (or are being produced separately) — this
design is specifically the missing "rumah"/dashboard/routing that ties existing content to the
diagram's flow, plus a visual representation of that journey on the student dashboard.

## Decisions (from brainstorming Q&A)

| Question | Decision |
|---|---|
| Diagnostic scope | One-time, before Bab 1, sets `jalur` for the whole course (not re-taken per bab) |
| Dashboard integration | Visual roadmap widget (node-based, mirrors the diagram), not just invisible routing logic |
| Diagnostic question bank | Doesn't exist yet — author a starter draft (this spec includes one) for the user's team to review/edit; must be admin-editable, not hardcoded |
| Build location/timing | Deferred — build directly in React once the foundation + `/dashboard`/`/modul/:id` pages are ported (see `2026-07-23-react-rewrite-design.md`), not in the vanilla `legacy/` pages |

## Data model

New Supabase table (add to `database/schema.sql` when implemented):

```sql
CREATE TABLE IF NOT EXISTS diagnostic_questions (
  id           SERIAL PRIMARY KEY,
  pertanyaan   TEXT NOT NULL,
  opsi         JSONB NOT NULL,   -- array of 4 option strings
  jawaban      INT NOT NULL,     -- index into opsi, 0-based
  order_num    INT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN jalur TEXT CHECK (jalur IN ('cepat', 'mendalam'));
-- NULL = not yet taken the diagnostic test
```

`diagnostic_questions` is intentionally separate from `quiz_questions` (which is scoped
`module_id`-per-row) — the diagnostic test is not tied to any single module.

## Diagnostic flow

- On first authenticated visit to `/dashboard`, if `profile.jalur IS NULL`, redirect to
  `/diagnostik` instead (a `<ProtectedRoute>`-gated route, added to the route table from the
  infra spec).
- `/diagnostik` renders all `diagnostic_questions`, single-pass (no remedial retry loop — this
  is a placement test, not a formative quiz), computes a 0-100 score, then:
  - score `> 80` → `profile.jalur = 'cepat'`
  - score `<= 80` → `profile.jalur = 'mendalam'`
- Once set, `jalur` is permanent for the course (matches the "1x di awal" decision) — no retake
  UI. (A dosen could reset it manually via direct DB access if ever needed; no in-app reset is
  in scope here — YAGNI unless a real request for it shows up.)
- After submission, redirect to `/dashboard` as normal.

## Content rendering per jalur

`jalur` does not fork the underlying content — it's a display-density toggle on the same
`ModuleDetail` page, evaluated per module using data that already exists:

- **Jalur cepat:** show `description` (already exists on every module row) + the module's
  studi kasus (`jurnal`/`studiKasus`, already normalized by `useModules`/`useModule` from the
  infra spec) up front; collapse `materi[]` into an expandable "lihat detail" disclosure instead
  of rendering it open by default.
- **Jalur mendalam:** current default behavior — `materi[]` rendered open, step-by-step, as it
  is today.

This means no new content has to be authored per jalur — it reuses fields the infra spec's
`normalizeModuleRow` already guarantees are present.

## Roadmap widget (dashboard)

New component `src/components/RoadmapWidget.tsx` on `/dashboard`, rendered above the existing
module list:

- Nodes, left to right or top to bottom: `Diagnostik → Bab 1 → Bab 2 → ... → Bab 6 → Rangkuman & Refleksi → UAS`
  (using whatever module count is live at build time — currently 9 modules, see the open
  question in `revisi/pemetaan-bab-naskah-ke-modul-platform.md` about eventual 6-vs-9 alignment;
  this widget just iterates `useModules()`'s result, so it tracks whatever that resolves to,
  no hardcoded "6").
- Each node state — `done` (green, has 100% progress via `useProgress`), `current` (highlighted,
  first not-yet-completed module), `locked` (greyed, sequential — matches the existing seq-lock
  behavior already in `modul.html`).
- A small badge on the Diagnostik node shows the student's `jalur` once set ("Jalur Cepat" /
  "Jalur Mendalam").
- Purely a read-only visualization — clicking a `done`/`current` node navigates to
  `/modul/:id`; clicking a `locked` node does nothing (same as the existing seq-lock UX).

## Admin edit (dosen)

New section on `/manajemen` (dosen-only route from the infra spec): a simple CRUD list for
`diagnostic_questions` — add/edit/delete question, edit the 4 options and correct-answer index,
reorder via `order_num`. Same interaction pattern as the module editor already planned for that
page — no new UI pattern to invent.

## Starter question bank (draft — for the team to review and edit, not final)

Fifteen questions, lightly spanning all 9 current platform modules plus general R&D readiness.
`jawaban` is 0-indexed into `opsi`.

1. Apa tujuan utama penelitian R&D (Research & Development) dalam pendidikan?
   opsi: ["Mendeskripsikan fenomena secara alamiah", "Menguji hipotesis dengan statistik inferensial", "Menghasilkan produk dan menguji efektivitasnya", "Menganalisis dokumen kurikulum"] — jawaban: 2
2. Ciri utama yang membedakan R&D dari jenis penelitian lain adalah...
   opsi: ["Sampel acak besar", "Menghasilkan produk yang divalidasi dan diujicobakan", "Fokus menguji teori baru", "Selalu kualitatif"] — jawaban: 1
3. ADDIE adalah singkatan dari...
   opsi: ["Analyze, Design, Develop, Implement, Evaluate", "Assess, Design, Deliver, Instruct, Evaluate", "Analyze, Develop, Design, Implement, Extend", "Assess, Develop, Deliver, Implement, Evaluate"] — jawaban: 0
4. Tahap ADDIE yang fokus pada analisis kebutuhan dan kesenjangan adalah...
   opsi: ["Design", "Analyze", "Develop", "Evaluate"] — jawaban: 1
5. Needs assessment dalam pengembangan produk pendidikan dilakukan untuk...
   opsi: ["Menentukan harga produk", "Mengidentifikasi kesenjangan antara kondisi ideal dan aktual", "Menulis laporan akhir", "Memilih dosen pembimbing"] — jawaban: 1
6. Bagian yang wajib ada di Bab Pendahuluan proposal R&D adalah...
   opsi: ["Daftar riwayat hidup peneliti", "Latar belakang, rumusan masalah, dan tujuan pengembangan", "Anggaran biaya penelitian", "Jadwal wisuda"] — jawaban: 1
7. Fungsi storyboard dalam pengembangan produk digital adalah...
   opsi: ["Mencatat anggaran produksi", "Menggambarkan alur dan tampilan produk sebelum dibangun", "Mengganti laporan akhir", "Mengukur kepuasan pengguna"] — jawaban: 1
8. Instrumen validasi ahli digunakan untuk mengukur...
   opsi: ["Kelayakan produk dari sisi materi dan media sebelum uji coba", "Nilai ujian akhir mahasiswa", "Kehadiran mahasiswa", "Anggaran proyek"] — jawaban: 0
9. Skala yang umum dipakai pada lembar validasi ahli adalah...
   opsi: ["Skala Likert", "Skala Celsius", "Skala Richter", "Skala Ordinal biner saja"] — jawaban: 0
10. Teknik analisis yang umum dipakai untuk data validasi ahli kuantitatif adalah...
    opsi: ["Analisis regresi berganda", "Rata-rata skor dan kategori kelayakan", "Analisis jalur (path analysis)", "Uji ANOVA dua arah"] — jawaban: 1
11. Tujuan utama uji coba terbatas sebelum peluncuran penuh sebuah produk adalah...
    opsi: ["Mempercepat kelulusan mahasiswa", "Menemukan masalah dan mengumpulkan masukan sebelum skala penuh", "Menghemat biaya cetak", "Mengganti validasi ahli"] — jawaban: 1
12. Diseminasi hasil penelitian R&D umumnya dilakukan melalui...
    opsi: ["Menyimpan laporan di rak pribadi", "Publikasi artikel ilmiah dan forum akademik", "Menghapus data setelah selesai", "Tidak perlu didiseminasikan"] — jawaban: 1
13. Perbedaan utama penelitian kuantitatif dan kualitatif dari sisi data adalah...
    opsi: ["Kuantitatif pakai angka/statistik, kualitatif pakai deskripsi mendalam", "Kuantitatif selalu lebih valid", "Kualitatif tidak butuh data", "Tidak ada perbedaan"] — jawaban: 0
14. Studi pustaka penting dilakukan sebelum menyusun instrumen penelitian karena...
    opsi: ["Supaya laporan lebih tebal", "Memberi landasan teori dan menghindari duplikasi penelitian", "Wajib menurut kampus tanpa alasan akademik", "Mempercepat pengumpulan data"] — jawaban: 1
15. Yang dimaksud "produk" dalam konteks penelitian R&D pendidikan adalah...
    opsi: ["Hanya barang fisik seperti alat peraga", "Bisa berupa modul, media, model, atau perangkat pembelajaran apa pun yang diuji efektivitasnya", "Selalu berupa aplikasi digital", "Laporan penelitian itu sendiri"] — jawaban: 1

## Sequencing

This feature is queued behind the React rewrite's foundation phase — specifically after
`/dashboard` and `/modul/:id` exist in React (Tasks 7-9 of
`docs/superpowers/plans/2026-07-23-react-rewrite-foundation.md`, currently at Task 2/11). No
vanilla/`legacy/` implementation is planned; building it twice would be wasted work.

## Out of scope

- Retaking the diagnostic test / dosen-facing reset UI.
- Changing the per-bab remedial/lanjut/pengayaan thresholds or mechanism — untouched, reused as-is.
- Resolving the 6-bab-naskah vs 9-modul-platform question — the roadmap widget is written to be
  agnostic to whatever count `useModules()` returns, so it doesn't block on that decision.
- Final content/wording of the 15 starter questions above — explicitly a draft for the user's
  team to edit via the admin CRUD screen once built.
