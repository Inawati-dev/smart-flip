# SMART-FLIP 5.0 — React Rewrite Design

Status: approved by user 2026-07-23, pending spec self-review + user file review.

## Context

SMART-FLIP 5.0 is a live, UM-grant-funded (Non-APBN UM) flipbook/e-modul platform: 21 static
vanilla HTML/JS pages + a shared `data-layer.js` (localStorage demo mode / Supabase live mode
toggle) + Supabase (Postgres + Auth), deployed as a static site (GitHub Pages, repo
`Inawati-dev/smart-flip`, live branch `release-inawati` = `inawati/main`).

Pain points that triggered this rewrite:
- Dark mode / theme-toggle logic was duplicated by copy-paste across ~20 HTML files (removed
  entirely this session — see git history — but the underlying problem, "editing shared UI
  logic means touching every page," remains for anything else shared: nav, auth guard, design
  tokens).
- `DataLayer.getModules()`/`getModuleById()` return raw Supabase rows that don't match the
  shape the UI expects (demo fixture objects have `path`/`color`/`capaian`/`materi`/`kuis`/
  `videoId`/`jurnal`/`studiKasus`; the real `modules` table only has `id, order_num, title,
  description, video_url, pdf_path, is_active, created_at`). This caused a live bug (undefined
  text, fixed in commit `984b537`) and a worse latent one (`modul.capaian.map()` /
  `modul.materi.map()` crash the whole page render for real Supabase-backed rows — fixed this
  session with a `normalizeModuleRow()` helper in `data-layer.js`), plus a `.path` mismatch
  (`pdf_path` vs `path`) that breaks PDF loading, the "Baca" link, and progress-bar keying on
  real data — also fixed this session via the same normalizer.
- Every protected page repeats an inline auth-guard snippet and its own copy of shared CSS.

Sibling project **SAKTI - Tracing Keuangan** (`C:\1-Johan\10. Pengembangan\SAKTI - Tracing
Keuangan`) solves the same class of problem with React 19 + Vite + TypeScript + Tailwind v4 +
`@supabase/supabase-js` + `@tanstack/react-query` + pnpm, deployed on Vercel, theming unified
via one `ThemeContext` + `design-tokens.ts` + `themes.ts`. User asked to mirror this stack.

## Constraints

- SMART-FLIP is actively used for the grant's own methodology: naskah final target 1-2 bulan,
  uji coba terbatas (min. 10 mahasiswa, ≥5 branching scenarios/bab) menyusul, artikel SINTA +
  pendaftaran HKI target 2-3 bulan out (see `revisi/Progres Laporan Modul ke_1.docx.pdf`).
  The rewrite must not block or regress those deliverables.
- Supabase backend/schema is out of scope — only the frontend consumption layer changes.
- Existing demo/localStorage fallback behavior (keys prefixed `sfp_...`) must keep working
  identically, since legacy and React pages will coexist during the migration and must not
  silently diverge on the same student's local state.

## Decisions (from brainstorming Q&A)

| Question | Decision |
|---|---|
| Deploy target | Vercel (mirrors SAKTI), new Vercel project connected to existing `Inawati-dev/smart-flip` GitHub repo |
| Tooling parity | Full parity with SAKTI: React 19, Vite, TypeScript, Tailwind v4, `@supabase/supabase-js`, `@tanstack/react-query`, pnpm, ESLint, Vitest |
| Live-site rollout | Incremental cutover: same Vercel deployment serves both new React routes and not-yet-ported legacy static pages from day one; each ported page replaces its legacy file |
| Migration order | Foundation first (routing shell, `AuthContext`, theming, data hooks) proven on 2 pages, then remaining pages ported one at a time following the same pattern |

## Architecture

Single repo (`Inawati-dev/smart-flip`), single Vercel project. Target layout:

```
smart-flip/
├── src/                    ← new React app (Vite entry)
│   ├── main.tsx, App.tsx
│   ├── pages/              ← one file per route
│   ├── components/
│   ├── contexts/           ← AuthContext (ThemeContext intentionally omitted, see Theming)
│   ├── lib/                ← supabase.ts, design-tokens.ts
│   └── hooks/              ← React Query hooks, replace data-layer.js methods 1:1
├── legacy/                 ← all 21 current HTML pages + script.js/style.css/data-layer.js/
│                              modules-data.js, moved here verbatim, untouched otherwise
├── assets/  books/  database/  docs/  tests/   ← unchanged location, shared by both legacy and React
├── config.json  manifest.json  sw.js  scan_books.py  serve.bat   ← unchanged location
└── vercel.json             ← new
```

As each page is ported: its file is deleted from `legacy/`, a route + component appear under
`src/pages/`, and any legacy page's nav links pointing to it are updated to the new path.

`vercel.json` (mirrors SAKTI's, no extra rules needed — Vercel's `handle: filesystem` step
already serves real static files, including everything under `legacy/`, `books/`, `assets/`,
before falling through to the SPA catch-all):

```json
{
  "version": 2,
  "buildCommand": "pnpm run build",
  "installCommand": "pnpm install",
  "outputDirectory": "dist",
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

Implementation detail (not a design blocker): `legacy/`, `books/`, `assets/`, `manifest.json`,
`sw.js` need to end up inside Vite's `dist/` build output (via `publicDir` config or an
equivalent copy step) so `handle: filesystem` can find them.

## Data layer & auth

- `src/lib/supabase.ts` — single Supabase client, credentials from
  `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (Vercel env vars), replacing
  the gitignored `supabase.js` file pattern. Still anon/public key only in the frontend, per
  existing project security rule.
- `AuthContext` — wraps Supabase session + `onAuthStateChange`, exposes
  `user` / `profile` / `role` / `loading`. Replaces the per-page inline auth-guard snippet with
  one `<ProtectedRoute>` used by the router.
- One React Query hook per current `DataLayer` method (`useModules`, `useModule(id)`,
  `useProgress(path)`, `useQuizAttempts(id)`, `useProfile`, `useVarkResult`, etc.). Each hook
  keeps the exact same dual-mode behavior as today (Supabase when live, localStorage fallback
  in demo mode) so behavior doesn't change, just where the logic lives and that React Query now
  caches/invalidates it.
- **localStorage keys stay byte-identical** (`sfp_...` prefix) so a student moving between a
  ported React page and a still-legacy HTML page during the transition keeps continuous
  progress/quiz/VARK state — this is the concrete mechanism that makes incremental cutover safe.
- The `normalizeModuleRow()` mapping added to `data-layer.js` this session (pdf_path→path,
  defaults for capaian/materi/kuis/jurnal/studiKasus/color/sub) is ported into `useModules` /
  `useModule` as the single normalization point — no per-component field guards needed.

## Theming

SAKTI's `ThemeContext` supports cycling between multiple named themes (including several dark
variants). SMART-FLIP explicitly removed dark mode this session (user request) and has exactly
one visual theme (the existing `--cream/--ivory/--sage/--terra/--brown/--border` token set from
CLAUDE.md). Decision: **no `ThemeContext`, no runtime theme switching.** `src/lib/design-tokens.ts`
defines the existing token set once, imported into Tailwind config (`theme.extend.colors`) and
injected as CSS variables once in `main.tsx`. This directly fixes the actual complaint ("editing
theme touches every page") without rebuilding a toggle feature that was just intentionally
deleted. Revisit only if a future request explicitly asks for multiple themes again.

## Routing

`react-router`. Route table:

| Legacy page(s) | New route | Notes |
|---|---|---|
| index.html | `/` | login |
| register.html | `/register` | |
| reset-password.html | `/reset-password` | |
| dashboard-mhs.html + dashboard-dos.html | `/dashboard` | one route, renders by `profile.role` |
| profil.html + profil-dos.html | `/profil` | one route, renders by `profile.role` |
| modul.html | `/modul/:id` | |
| kuis.html | `/modul/:id/kuis` | |
| workshop.html | `/modul/:id/workshop` | |
| ebook.html | `/ebook` | keeps `?book=` query param |
| vark.html | `/vark` | |
| forum.html | `/forum` | |
| draf.html | `/draf` | |
| feedback.html | `/feedback` | |
| ngain.html | `/ngain` | dosen-only |
| validasi.html | `/validasi` | dosen-only |
| analitik.html | `/analitik` | dosen-only |
| manajemen.html | `/manajemen` | dosen-only |
| changelog.html | `/changelog` | |

`<ProtectedRoute roles={[...]}>` wraps role-gated routes, redirects to `/dashboard` on mismatch.

Implementation-time check (not a design blocker): the `notifications` table may store links in
the old `modul.html?id=3` shape; needs an old→new redirect map so existing stored notifications
don't 404 once `modul.html` is gone.

## Migration plan (this phase's scope)

1. Scaffold `src/` (Vite + React 19 + TS + Tailwind v4 + react-router + `@supabase/supabase-js`
   + `@tanstack/react-query` + Vitest + ESLint, mirroring SAKTI's config choices).
2. Move all 21 current pages + `script.js`/`style.css`/`data-layer.js`/`modules-data.js` into
   `legacy/` verbatim (fix any root-relative asset paths broken by the move).
3. Build the foundation: `supabase.ts`, `AuthContext`, `design-tokens.ts`, `App.tsx` with the
   other 16 routes stubbed (placeholder pointing at the still-live legacy page), leaving only
   the two proof pages (`/` and `/dashboard`) fully wired.
4. Port `/` (login) and `/dashboard` end-to-end — chosen because `/dashboard` is the page that
   most exercises the new data hooks (module cards, progress bars, the `.path`/`.color`/
   `.capaian` normalization) and validates the whole pattern before it's repeated 17 more times.
5. Deploy to a new Vercel project connected to the existing GitHub repo, verify login + dashboard
   against real Supabase, confirm legacy pages under `/legacy/*.html` still work, before
   continuing to port the remaining 15 routed pages one at a time in follow-up work (each one
   is its own small, independently-reviewable change once the foundation pattern is proven).

## Testing

`release-inawati` already has `tests/data-layer.compute.test.js` (Vitest, pure compute-function
tests, no DOM). Continue that pattern: port/expand it under `src/lib/__tests__/`, covering quiz
scoring, N-Gain calculation, VARK dominant-style derivation, progress percentage, and
`normalizeModuleRow`. Skip full UI/snapshot testing during the foundation phase — matches SAKTI's
testing scope and keeps the foundation phase fast.

## Out of scope for this design

- Any Supabase schema/backend change.
- Adding new product features beyond what the 21 legacy pages already do.
- Porting the remaining 15 non-foundation pages (`/modul/:id`, `/kuis`, `/vark`, `/forum`,
  `/draf`, `/feedback`, `/ngain`, `/validasi`, `/analitik`, `/manajemen`, `/profil`,
  `/changelog`, `/workshop`, `/ebook`, `/register`, `/reset-password`) — each is a follow-up
  implementation step once the foundation (steps 1-5 above) is merged and verified live.
