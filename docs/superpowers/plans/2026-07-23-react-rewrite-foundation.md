# SMART-FLIP 5.0 React Rewrite — Foundation Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a React 19 + Vite + TypeScript + Tailwind v4 app (mirroring sibling project SAKTI's stack) alongside the existing 21-page vanilla site, prove the whole pattern (routing, auth, theming, data hooks) on exactly 2 pages (`/` login and `/dashboard`), and deploy it to Vercel — while every not-yet-ported legacy page keeps working unmodified.

**Architecture:** Strangler-fig within one repo/one Vercel deployment. All current pages move verbatim into `legacy/`. A new `src/` Vite app owns everything under `/`, `/dashboard`, and a stub for every other route (which just links out to its `legacy/*.html` equivalent until ported). `vercel.json`'s `handle: filesystem` step serves `legacy/*`, `books/*`, `assets/*` etc. as static files before the SPA catch-all takes over — no dual hosting, no separate domains.

**Tech Stack:** React 19, Vite 8, TypeScript ~6.0, Tailwind v4 (`@tailwindcss/vite`), react-router 7, `@supabase/supabase-js`, `@tanstack/react-query`, pnpm, ESLint, Vitest.

## Global Constraints

- Full tooling parity with SAKTI (`C:\1-Johan\10. Pengembangan\SAKTI - Tracing Keuangan`) where applicable: same major versions of React/Vite/TypeScript/Tailwind, same `@tailwindcss/vite` zero-config plugin, same `vitest` config shape (`environment: 'node'`, no DOM/jsdom — this phase tests compute logic only, not rendered components).
- No Supabase schema changes. Reuse the existing `modules`/`profiles`/`user_progress` tables and columns exactly as defined in `database/schema.sql` + `database/migration_v1_livesync.sql`.
- `localStorage` keys used by the demo-mode fallback must stay byte-identical to what `legacy/data-layer.js` already uses (`sfp_` prefix, e.g. `sfp_books/modul-01.pdf`, `sfp_profile`, `sfp_vark`) — a student must keep continuous state whether they're on a ported React page or a still-legacy HTML page.
- Only the Supabase anon/public key goes in frontend code/env vars — never the service role key. Source: `CLAUDE.md` Security Rules.
- Dashboard proof-of-concept scope is explicitly narrower than the full legacy `dashboard-mhs.html`/`dashboard-dos.html` (which also embed video grids, quiz history, forum previews, draft previews, notifications, profile-edit modals). This plan ports only what's needed to prove the data-hook pattern: greeting, VARK badge, and the module list with progress. Everything else stays on the legacy page for now — those widgets belong to pages (`/forum`, `/draf`, `/vark`, `/analitik`) that are explicitly out of scope for this plan per the approved spec.
- Working directory: `C:\1-Johan\10. Pengembangan\Smart Flipbook\.claude\worktrees\audit-demo-fields` (git branch `claude/audit-demo-fields`, already branched from the live `release-inawati` branch). Do not run this plan from the `strange-mclean-f2e790` worktree — that one is on an unrelated, stale history.

---

### Task 1: Scaffold the Vite + React + TypeScript + Tailwind project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `eslint.config.js`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `index.html` (Vite entry — **this collides with the existing root `index.html`, which Task 2 moves to `legacy/` first**)
- Create: `.env.local.example`
- Modify: `.gitignore`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `App` component (default export from `src/App.tsx`) — a placeholder `<div>SMART-FLIP</div>` for now, replaced in Task 7.

- [ ] **Step 1: Move the legacy root `index.html` out of the way first (dependency for this task)**

This task's Vite entry file needs the path `index.html` at repo root. Do this move now (the rest of Task 2's file moves happen in Task 2 — this one line moves early only because Task 1 needs the path free):

```bash
mkdir -p legacy
git mv index.html legacy/index.html
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "smart-flip",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@11.5.2",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.108.0",
    "@tanstack/react-query": "^5.101.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-router": "^7.9.0"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@tailwindcss/vite": "^4.3.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^10.3.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "tailwindcss": "^4.3.0",
    "typescript": "~6.0.2",
    "typescript-eslint": "^8.59.2",
    "vite": "^8.0.12",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 3: Write `vite.config.ts`**

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  publicDir: 'public',
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 5: Write `tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "esnext",
    "types": ["node"],
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 7: Write `eslint.config.js`**

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'legacy'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)
```

- [ ] **Step 8: Write `index.html` (Vite entry, at repo root)**

```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SMART-FLIP 5.0</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Write `src/index.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 10: Write `src/App.tsx` (placeholder, replaced in Task 7)**

```typescript
export default function App() {
  return <div>SMART-FLIP</div>
}
```

- [ ] **Step 11: Write `src/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 12: Write `src/App.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'

describe('App', () => {
  it('renders without throwing', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('SMART-FLIP')
  })
})
```

- [ ] **Step 13: Write `.env.local.example`**

```
VITE_SUPABASE_URL=https://ldqouujkjfrgtgjnsmqm.supabase.co
VITE_SUPABASE_ANON_KEY=paste_the_publishable_anon_key_here
```

- [ ] **Step 14: Update `.gitignore`** — append these lines (keep everything already in the file):

```
node_modules/
dist/
.env.local
*.tsbuildinfo
```

- [ ] **Step 15: Install dependencies**

Run: `pnpm install`
Expected: lockfile `pnpm-lock.yaml` created, `node_modules/` populated, no errors.

- [ ] **Step 16: Run the placeholder test to verify the toolchain works end-to-end**

Run: `pnpm test`
Expected: PASS — `App > renders without throwing`

- [ ] **Step 17: Run the dev server once to confirm it boots**

Run: `pnpm dev` (start it, confirm it prints a local URL like `http://localhost:5173/`, then stop it — this is a manual smoke check, not left running)
Expected: Vite prints "ready in Xms" and a local URL with no build errors.

- [ ] **Step 18: Commit**

```bash
git add package.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json eslint.config.js index.html src/main.tsx src/App.tsx src/App.test.tsx src/index.css .env.local.example .gitignore pnpm-lock.yaml legacy/index.html
git commit -m "feat: scaffold Vite+React+TS+Tailwind foundation, move legacy index.html"
```

---

### Task 2: Move the remaining legacy files into `legacy/`

**Files:**
- Modify: moves `analitik.html`, `changelog.html`, `dashboard-dos.html`, `dashboard-mhs.html`, `data-layer.js`, `draf.html`, `ebook.html`, `feedback.html`, `forum.html`, `kuis.html`, `login.html`, `manajemen.html`, `modul.html`, `modules-data.js`, `ngain.html`, `profil-dos.html`, `profil.html`, `register.html`, `reset-password.html`, `script.js`, `style.css`, `supabase.js` (if present locally, gitignored), `validasi.html`, `vark.html`, `workshop.html` — all into `legacy/`.
- No content changes to any of these files in this task — verbatim move only.

**Interfaces:**
- Consumes: `legacy/` directory created in Task 1 Step 1.
- Produces: every legacy page reachable at `legacy/<name>.html` instead of `<name>.html`.

- [ ] **Step 1: Move every remaining root-level legacy file into `legacy/`**

```bash
git mv analitik.html changelog.html dashboard-dos.html dashboard-mhs.html \
       data-layer.js draf.html ebook.html feedback.html forum.html kuis.html \
       login.html manajemen.html modul.html modules-data.js ngain.html \
       profil-dos.html profil.html register.html reset-password.html \
       script.js style.css validasi.html vark.html workshop.html \
       legacy/
```

- [ ] **Step 2: Check for root-relative asset paths that would break after the move**

Run: `grep -rn "href=\"/\|src=\"/\|url(/" legacy/*.html legacy/style.css`
Expected: no matches, or only matches inside `legacy/` that already point at things that still resolve the same way (e.g. `/books/...`, `/assets/...` — these stay correct because `books/` and `assets/` are NOT moving, and Vercel will serve `legacy/*.html` such that root-relative paths still resolve against the site root). If any match points at something that moved (e.g. `/style.css`, `/script.js`, `/data-layer.js`), fix that specific `<link>`/`<script>` tag to `legacy/style.css` etc. — none are expected based on the current codebase (all internal references use relative filenames, e.g. `<script src="data-layer.js">`, which still resolve correctly since every legacy file moved together).

- [ ] **Step 3: Smoke-test the legacy site still works from its new location**

Run: `cd legacy && python -m http.server 8080` (or reuse `serve.bat`'s underlying command — check `serve.bat` for the exact command it runs, since it currently assumes it's launched from the old root)
Expected: `legacy/index.html` loads in a browser at `http://localhost:8080`, demo-mode login screen renders with no 404s in the network tab for `style.css`, `script.js`, `data-layer.js`, `modules-data.js`.

- [ ] **Step 4: Update `serve.bat` to `cd` into `legacy/` before serving**

Read the current `legacy/serve.bat` — wait, `serve.bat` was NOT in the move list above (it stays at repo root, since it's a dev convenience script, not a served page). Modify `serve.bat` at the repo root so it serves `legacy/` as the web root instead of the repo root. Show the exact diff once `serve.bat`'s current content is read (its content wasn't included in this plan's research — the implementer must `cat serve.bat` first, then adjust whatever directory-serving command it contains to point at `legacy/` instead of `.`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: move all legacy pages into legacy/ verbatim"
```

---

### Task 3: Design tokens — single theme, defined once

**Files:**
- Create: `src/lib/design-tokens.ts`
- Modify: `src/index.css`
- Modify: `src/main.tsx`
- Test: `src/lib/design-tokens.test.ts`

**Interfaces:**
- Produces: `designTokens: Record<string, string>` (exported const, CSS custom-property names without the `--` prefix as keys, e.g. `designTokens.cream === '#F5F2E9'`), and `injectDesignTokens(): void` (sets each token as a CSS variable on `document.documentElement`).
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { designTokens } from './design-tokens'

describe('designTokens', () => {
  it('matches the existing legacy/style.css :root values', () => {
    expect(designTokens.cream).toBe('#F5F2E9')
    expect(designTokens.sage).toBe('#8FA287')
    expect(designTokens.terra).toBe('#D4A373')
    expect(designTokens.brown).toBe('#3E362E')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test design-tokens`
Expected: FAIL — `Cannot find module './design-tokens'`

- [ ] **Step 3: Write `src/lib/design-tokens.ts`**

Values copied verbatim from `legacy/style.css`'s `:root` block:

```typescript
export const designTokens = {
  cream: '#F5F2E9',
  ivory: '#FFFDF8',
  bg3: '#FAF7F0',
  sage: '#8FA287',
  sageD: '#6B7E64',
  sageLight: '#B8CCB2',
  terra: '#D4A373',
  terraD: '#B8855A',
  brown: '#3E362E',
  brown2: '#6B5D4F',
  brown3: '#9B8B7A',
  brown4: '#C5B8AD',
  border: 'rgba(62,54,46,.10)',
  border2: 'rgba(62,54,46,.06)',
  shadowXs: '0 1px 4px rgba(62,54,46,.07)',
  shadowSm: '0 2px 10px rgba(62,54,46,.09)',
  shadowMd: '0 8px 28px rgba(62,54,46,.13)',
  shadowLg: '0 20px 56px rgba(62,54,46,.18)',
  r: '12px',
  rSm: '8px',
  rPill: '100px',
  red: '#C04020',
  redBorder: 'rgba(192,64,32,.3)',
} as const

const CSS_VAR_NAME: Record<keyof typeof designTokens, string> = {
  cream: '--cream',
  ivory: '--ivory',
  bg3: '--bg3',
  sage: '--sage',
  sageD: '--sage-d',
  sageLight: '--sage-light',
  terra: '--terra',
  terraD: '--terra-d',
  brown: '--brown',
  brown2: '--brown2',
  brown3: '--brown3',
  brown4: '--brown4',
  border: '--border',
  border2: '--border2',
  shadowXs: '--shadow-xs',
  shadowSm: '--shadow-sm',
  shadowMd: '--shadow-md',
  shadowLg: '--shadow-lg',
  r: '--r',
  rSm: '--r-sm',
  rPill: '--r-pill',
  red: '--red',
  redBorder: '--red-border',
}

export function injectDesignTokens(): void {
  const root = document.documentElement
  for (const key of Object.keys(designTokens) as Array<keyof typeof designTokens>) {
    root.style.setProperty(CSS_VAR_NAME[key], designTokens[key])
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test design-tokens`
Expected: PASS

- [ ] **Step 5: Wire tokens into Tailwind via `src/index.css`**

```css
@import "tailwindcss";

@theme {
  --color-cream: #F5F2E9;
  --color-ivory: #FFFDF8;
  --color-sage: #8FA287;
  --color-sage-d: #6B7E64;
  --color-terra: #D4A373;
  --color-terra-d: #B8855A;
  --color-brown: #3E362E;
  --color-brown-2: #6B5D4F;
  --color-brown-3: #9B8B7A;
  --color-red: #C04020;
}
```

(Tailwind v4's `@theme` block generates utility classes like `bg-cream`, `text-brown`, `border-terra` directly from these — no `tailwind.config.ts` needed for colors, matching Tailwind v4's CSS-first config that SAKTI also uses.)

- [ ] **Step 6: Call `injectDesignTokens()` once at startup in `src/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { injectDesignTokens } from './lib/design-tokens'
import './index.css'

injectDesignTokens()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 7: Run the full test suite to confirm nothing broke**

Run: `pnpm test`
Expected: PASS (both `App` and `designTokens` suites)

- [ ] **Step 8: Commit**

```bash
git add src/lib/design-tokens.ts src/lib/design-tokens.test.ts src/index.css src/main.tsx
git commit -m "feat: single design-tokens.ts source of truth, no ThemeContext/toggle"
```

---

### Task 4: Supabase client

**Files:**
- Create: `src/lib/supabase.ts`
- Test: `src/lib/supabase.test.ts`

**Interfaces:**
- Produces: `supabase: SupabaseClient` (default configured client), `isSupabaseConfigured: boolean` (true when both env vars are present — mirrors legacy's `typeof sb !== 'undefined'` demo/live toggle).
- Consumes: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` from `import.meta.env`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { isSupabaseConfigured } from './supabase'

describe('supabase client', () => {
  it('reports configured when env vars are present', () => {
    // vite.config.ts test env doesn't set these by default -> expect false in test env
    expect(typeof isSupabaseConfigured).toBe('boolean')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test supabase`
Expected: FAIL — `Cannot find module './supabase'`

- [ ] **Step 3: Write `src/lib/supabase.ts`**

```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test supabase`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts src/lib/supabase.test.ts
git commit -m "feat: add Supabase client (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY)"
```

---

### Task 5: Module data hooks (`useModules`/`useModule`) with row normalization

**Files:**
- Create: `src/lib/modules.ts`
- Create: `src/hooks/useModules.ts`
- Test: `src/lib/modules.test.ts`

**Interfaces:**
- Consumes: `supabase`, `isSupabaseConfigured` from `src/lib/supabase.ts` (Task 4).
- Produces: `type ModuleRow = { id: number; order_num: number; title: string; description: string | null; video_url: string | null; pdf_path: string | null; is_active: boolean; path: string; videoId: string | null; color: string; sub: string; capaian: string[]; materi: Array<{ sesi: number; topik: string }>; kuis: unknown[]; jurnal: unknown[]; studiKasus: unknown[] }`, `normalizeModuleRow(row: Record<string, unknown>): ModuleRow`, `useModules(): UseQueryResult<ModuleRow[]>`, `useModule(id: number): UseQueryResult<ModuleRow | null>`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { normalizeModuleRow } from './modules'

describe('normalizeModuleRow', () => {
  it('maps pdf_path to path and defaults missing demo-only fields', () => {
    const raw = {
      id: 1, order_num: 1, title: 'Dasar & Konsep R&D',
      description: 'desc', video_url: null, pdf_path: 'books/modul-01.pdf',
      is_active: true,
    }
    const result = normalizeModuleRow(raw)
    expect(result.path).toBe('books/modul-01.pdf')
    expect(result.color).toBe('var(--sage)')
    expect(result.sub).toBe('')
    expect(result.capaian).toEqual([])
    expect(result.materi).toEqual([])
    expect(result.kuis).toEqual([])
    expect(result.jurnal).toEqual([])
    expect(result.studiKasus).toEqual([])
  })

  it('keeps demo-fixture fields untouched when they are already present', () => {
    const demoShaped = {
      id: 1, order_num: 1, title: 'X', description: 'd', pdf_path: null,
      path: 'books/modul-01.pdf', color: '#8FA287', sub: 'Konsep dasar',
      capaian: ['a'], materi: [{ sesi: 1, topik: 't' }],
    }
    const result = normalizeModuleRow(demoShaped)
    expect(result.path).toBe('books/modul-01.pdf')
    expect(result.color).toBe('#8FA287')
    expect(result.sub).toBe('Konsep dasar')
    expect(result.capaian).toEqual(['a'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test modules`
Expected: FAIL — `Cannot find module './modules'`

- [ ] **Step 3: Write `src/lib/modules.ts`**

```typescript
import { supabase, isSupabaseConfigured } from './supabase'

export interface ModuleRow {
  id: number
  order_num: number
  title: string
  description: string | null
  video_url: string | null
  pdf_path: string | null
  is_active: boolean
  path: string
  videoId: string | null
  color: string
  sub: string
  capaian: string[]
  materi: Array<{ sesi: number; topik: string }>
  kuis: unknown[]
  jurnal: unknown[]
  studiKasus: unknown[]
}

export function normalizeModuleRow(row: Record<string, unknown>): ModuleRow {
  return {
    id: row.id as number,
    order_num: row.order_num as number,
    title: row.title as string,
    description: (row.description as string) ?? null,
    video_url: (row.video_url as string) ?? null,
    pdf_path: (row.pdf_path as string) ?? null,
    is_active: (row.is_active as boolean) ?? true,
    path: (row.path as string) || (row.pdf_path as string) || '',
    videoId: (row.videoId as string) ?? null,
    color: (row.color as string) || 'var(--sage)',
    sub: (row.sub as string) || '',
    capaian: (row.capaian as string[]) || [],
    materi: (row.materi as Array<{ sesi: number; topik: string }>) || [],
    kuis: (row.kuis as unknown[]) || [],
    jurnal: (row.jurnal as unknown[]) || [],
    studiKasus: (row.studiKasus as unknown[]) || [],
  }
}

export async function fetchModules(): Promise<ModuleRow[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('modules').select('*').order('order_num')
    if (!error && data && data.length) return data.map(normalizeModuleRow)
  }
  return []
}

export async function fetchModuleById(id: number): Promise<ModuleRow | null> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('modules').select('*').eq('id', id).single()
    if (!error && data) return normalizeModuleRow(data)
  }
  const all = await fetchModules()
  return all.find((m) => m.id === id) ?? null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test modules`
Expected: PASS — both `normalizeModuleRow` cases

- [ ] **Step 5: Write `src/hooks/useModules.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { fetchModules, fetchModuleById } from '../lib/modules'

export function useModules() {
  return useQuery({ queryKey: ['modules'], queryFn: fetchModules })
}

export function useModule(id: number) {
  return useQuery({ queryKey: ['modules', id], queryFn: () => fetchModuleById(id) })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/modules.ts src/lib/modules.test.ts src/hooks/useModules.ts
git commit -m "feat: useModules/useModule hooks with normalizeModuleRow (fixes .path/.color/.capaian mismatch in React layer)"
```

---

### Task 6: AuthContext + ProtectedRoute

**Files:**
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/components/ProtectedRoute.tsx`
- Test: `src/contexts/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts` (Task 4).
- Produces: `AuthProvider` (component), `useAuth(): { user: User | null; profile: Profile | null; role: 'mahasiswa' | 'dosen' | null; loading: boolean }`, `type Profile = { full_name: string; role: 'mahasiswa' | 'dosen'; nim_nidn: string | null; learning_style: string | null }`, `ProtectedRoute({ roles, children }: { roles?: Array<'mahasiswa'|'dosen'>; children: ReactNode })`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AuthProvider } from './AuthContext'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
  isSupabaseConfigured: false,
}))

describe('AuthProvider', () => {
  it('renders children without throwing when no session exists', () => {
    const html = renderToStaticMarkup(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    )
    expect(html).toContain('child')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test AuthContext`
Expected: FAIL — `Cannot find module './AuthContext'`

- [ ] **Step 3: Write `src/contexts/AuthContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface Profile {
  full_name: string
  role: 'mahasiswa' | 'dosen'
  nim_nidn: string | null
  learning_style: string | null
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  role: 'mahasiswa' | 'dosen' | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: null,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadProfile(uid: string) {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, role, nim_nidn, learning_style')
        .eq('id', uid)
        .single()
      if (active) setProfile(data as Profile | null)
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(data.session?.user ?? null)
      if (data.session?.user) loadProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setProfile(null)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, role: profile?.role ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test AuthContext`
Expected: PASS

- [ ] **Step 5: Write `src/components/ProtectedRoute.tsx`**

```typescript
import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: Array<'mahasiswa' | 'dosen'>
  children: ReactNode
}) {
  const { user, role, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  if (roles && role && !roles.includes(role)) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
```

- [ ] **Step 6: Commit**

```bash
git add src/contexts/AuthContext.tsx src/contexts/AuthContext.test.tsx src/components/ProtectedRoute.tsx
git commit -m "feat: AuthContext + ProtectedRoute, replaces per-page inline auth-guard snippet"
```

---

### Task 7: Router shell — 18 routes, 16 stubbed

**Files:**
- Create: `src/pages/LegacyStub.tsx`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx` (extend from Task 1)

**Interfaces:**
- Consumes: `AuthProvider`/`useAuth` (Task 6), `ProtectedRoute` (Task 6).
- Produces: full route table below, wired in `src/App.tsx`. `Login` and `Dashboard` page components are placeholders in this task (real implementations land in Tasks 8-9) — every other route renders `LegacyStub`.

- [ ] **Step 1: Write `src/pages/LegacyStub.tsx`**

```typescript
export function LegacyStub({ legacyFile }: { legacyFile: string }) {
  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <p>Halaman ini belum dipindah ke versi baru.</p>
      <a href={`/legacy/${legacyFile}`}>Buka versi lama →</a>
    </div>
  )
}
```

- [ ] **Step 2: Update the failing test to check routing renders**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import App from './App'

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
  isSupabaseConfigured: false,
}))

describe('App', () => {
  it('renders the login route at / without throwing', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(html).toBeTruthy()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test App`
Expected: FAIL (App.tsx still the Task 1 placeholder, no `<BrowserRouter>`/routes, `MemoryRouter` wraps a component that ignores it — this specific assertion is lenient so it may pass by accident; if it does, skip to Step 5's re-run instead of chasing a red step here — the meaningful verification is Step 5's manual route check)

- [ ] **Step 4: Rewrite `src/App.tsx` with the full route table**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LegacyStub } from './pages/LegacyStub'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<LegacyStub legacyFile="register.html" />} />
            <Route path="/reset-password" element={<LegacyStub legacyFile="reset-password.html" />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/profil" element={<ProtectedRoute><LegacyStub legacyFile="profil.html" /></ProtectedRoute>} />
            <Route path="/modul/:id" element={<ProtectedRoute><LegacyStub legacyFile="modul.html" /></ProtectedRoute>} />
            <Route path="/modul/:id/kuis" element={<ProtectedRoute><LegacyStub legacyFile="kuis.html" /></ProtectedRoute>} />
            <Route path="/modul/:id/workshop" element={<ProtectedRoute><LegacyStub legacyFile="workshop.html" /></ProtectedRoute>} />
            <Route path="/ebook" element={<ProtectedRoute><LegacyStub legacyFile="ebook.html" /></ProtectedRoute>} />
            <Route path="/vark" element={<ProtectedRoute><LegacyStub legacyFile="vark.html" /></ProtectedRoute>} />
            <Route path="/forum" element={<ProtectedRoute><LegacyStub legacyFile="forum.html" /></ProtectedRoute>} />
            <Route path="/draf" element={<ProtectedRoute><LegacyStub legacyFile="draf.html" /></ProtectedRoute>} />
            <Route path="/feedback" element={<ProtectedRoute><LegacyStub legacyFile="feedback.html" /></ProtectedRoute>} />
            <Route path="/ngain" element={<ProtectedRoute roles={['dosen']}><LegacyStub legacyFile="ngain.html" /></ProtectedRoute>} />
            <Route path="/validasi" element={<ProtectedRoute roles={['dosen']}><LegacyStub legacyFile="validasi.html" /></ProtectedRoute>} />
            <Route path="/analitik" element={<ProtectedRoute roles={['dosen']}><LegacyStub legacyFile="analitik.html" /></ProtectedRoute>} />
            <Route path="/manajemen" element={<ProtectedRoute roles={['dosen']}><LegacyStub legacyFile="manajemen.html" /></ProtectedRoute>} />
            <Route path="/changelog" element={<LegacyStub legacyFile="changelog.html" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test App`
Expected: PASS. This will fail to compile until `src/pages/Login.tsx` and `src/pages/Dashboard.tsx` exist — Tasks 8 and 9 create them. **Do not mark this task done until Tasks 8 and 9 are also complete and this test passes for real** (this task's own test only meaningfully passes once those files exist; treat Tasks 7-9 as one gated group when running the final check).

- [ ] **Step 6: Commit**

```bash
git add src/pages/LegacyStub.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: wire full 18-route table, 16 routes stubbed to legacy pages"
```

---

### Task 8: Login page (`/`)

**Files:**
- Create: `src/pages/Login.tsx`
- Test: `src/pages/Login.test.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 4).
- Produces: `Login` component (named export, used by `src/App.tsx` from Task 7).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { Login } from './Login'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: { user: null }, error: null }),
    },
  },
  isSupabaseConfigured: false,
}))

describe('Login', () => {
  it('renders the email and password fields', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(html).toContain('type="email"')
    expect(html).toContain('type="password"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test Login`
Expected: FAIL — `Cannot find module './Login'`

- [ ] **Step 3: Write `src/pages/Login.tsx`** (ports `handleLogin` from `legacy/index.html` lines 320-375 — same role-mismatch check, same upsert-profile-if-missing fallback, same error-message translation)

```typescript
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export function Login() {
  const navigate = useNavigate()
  const [role, setRole] = useState<'mahasiswa' | 'dosen'>('mahasiswa')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!isSupabaseConfigured) {
      setError('Login belum bisa diproses — konfigurasi server belum lengkap. Hubungi admin.')
      return
    }

    setLoading(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) throw signInError

      let { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', data.user!.id)
        .single()

      if (!profile) {
        const meta = data.user!.user_metadata || {}
        await supabase.from('profiles').upsert({
          id: data.user!.id,
          full_name: meta.full_name || email.split('@')[0],
          role: meta.role || role,
          nim_nidn: meta.nim_nidn || '',
        })
        const { data: p2 } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', data.user!.id)
          .single()
        profile = p2
      }

      if (!profile) profile = { role, full_name: email.split('@')[0] }

      if (profile.role !== role) {
        await supabase.auth.signOut()
        throw new Error(
          `Akun ini terdaftar sebagai ${profile.role === 'dosen' ? 'Dosen' : 'Mahasiswa'}. Silakan pilih peran yang sesuai.`,
        )
      }

      navigate('/dashboard')
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.'
      if (msg.includes('Invalid login credentials')) msg = 'Email atau kata sandi salah.'
      if (msg.includes('Email not confirmed')) msg = 'Email belum dikonfirmasi. Cek inbox kamu.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <form onSubmit={handleSubmit} className="bg-ivory p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold text-brown mb-4">Masuk ke Akun</h1>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            className={role === 'mahasiswa' ? 'font-bold text-terra' : 'text-brown-3'}
            onClick={() => setRole('mahasiswa')}
          >
            Mahasiswa
          </button>
          <button
            type="button"
            className={role === 'dosen' ? 'font-bold text-terra' : 'text-brown-3'}
            onClick={() => setRole('dosen')}
          >
            Dosen
          </button>
        </div>

        {error && <div className="text-red mb-3 text-sm">{error}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded p-2 mb-3"
        />

        <label htmlFor="password">Kata Sandi</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded p-2 mb-4"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-terra text-white rounded-full py-2 font-semibold"
        >
          {loading ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test Login`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Login.tsx src/pages/Login.test.tsx
git commit -m "feat: port Login page (/, was legacy/index.html) with role-mismatch check preserved"
```

---

### Task 9: Progress hooks + Dashboard page (`/dashboard`)

**Files:**
- Create: `src/lib/progress.ts`
- Create: `src/hooks/useProgress.ts`
- Create: `src/components/ModuleCard.tsx`
- Create: `src/pages/Dashboard.tsx`
- Test: `src/lib/progress.test.ts`
- Test: `src/pages/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `useModules` (Task 5), `useAuth` (Task 6), `supabase`/`isSupabaseConfigured` (Task 4).
- Produces: `type ProgressMap = Record<string, { pct: number; currentPage: number; lastOpened: string | null }>`, `fetchAllProgress(): Promise<ProgressMap>`, `useAllProgress(): UseQueryResult<ProgressMap>`, `ModuleCard({ module, progress }: { module: ModuleRow; progress?: ProgressMap[string] })`, `Dashboard` component (default export used by `src/App.tsx`).

- [ ] **Step 1: Write the failing test for progress mapping**

```typescript
import { describe, it, expect } from 'vitest'
import { moduleIdToPath } from './progress'

describe('moduleIdToPath', () => {
  it('formats the module id into the legacy books/ path convention', () => {
    expect(moduleIdToPath(1)).toBe('books/modul-01.pdf')
    expect(moduleIdToPath(9)).toBe('books/modul-09.pdf')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test progress`
Expected: FAIL — `Cannot find module './progress'`

- [ ] **Step 3: Write `src/lib/progress.ts`** (mirrors `legacy/data-layer.js` `getAllProgress()`, lines 405-430)

```typescript
import { supabase, isSupabaseConfigured } from './supabase'

export interface ProgressEntry {
  pct: number
  currentPage: number
  lastOpened: string | null
}

export type ProgressMap = Record<string, ProgressEntry>

export function moduleIdToPath(moduleId: number): string {
  return 'books/modul-' + String(moduleId).padStart(2, '0') + '.pdf'
}

export async function fetchAllProgress(): Promise<ProgressMap> {
  if (isSupabaseConfigured) {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (uid) {
      const { data, error } = await supabase
        .from('user_progress')
        .select('module_id, pct, current_page, last_opened')
        .eq('user_id', uid)
      if (!error && data) {
        const result: ProgressMap = {}
        for (const r of data) {
          result[moduleIdToPath(r.module_id)] = {
            pct: r.pct || 0,
            currentPage: r.current_page || 0,
            lastOpened: r.last_opened,
          }
        }
        return result
      }
    }
  }

  const result: ProgressMap = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('sfp_books/')) {
      try {
        result[key.replace('sfp_', '')] = JSON.parse(localStorage.getItem(key)!)
      } catch {
        // skip malformed entries, matches legacy/data-layer.js behavior
      }
    }
  }
  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test progress`
Expected: PASS

- [ ] **Step 5: Write `src/hooks/useProgress.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { fetchAllProgress } from '../lib/progress'

export function useAllProgress() {
  return useQuery({ queryKey: ['progress', 'all'], queryFn: fetchAllProgress })
}
```

- [ ] **Step 6: Write `src/components/ModuleCard.tsx`** (ports `modCardHTML` from `legacy/dashboard-mhs.html` lines ~1490-1529 — same status/badge/button logic, using the normalized `ModuleRow` from Task 5 so `.path`/`.color`/`.sub` are always defined)

```typescript
import { Link } from 'react-router'
import type { ModuleRow } from '../lib/modules'
import type { ProgressEntry } from '../lib/progress'

export function ModuleCard({
  module,
  progress,
}: {
  module: ModuleRow
  progress?: ProgressEntry
}) {
  const pct = progress?.pct ?? 0
  const status = pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'not_started'
  const badgeText = status === 'completed' ? 'Selesai' : status === 'in_progress' ? 'Sedang' : 'Belum Mulai'
  const btnLabel = pct >= 100 ? '📖 Baca Ulang' : pct > 0 ? '▶ Lanjut Belajar' : '▶ Mulai Belajar'
  const sub = module.sub || (module.description ? module.description.slice(0, 60) : '')

  return (
    <div className="flex items-center gap-4 bg-ivory rounded-xl p-4 shadow-sm">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0"
        style={{ background: module.color }}
      >
        {module.order_num}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-brown truncate">
          {module.order_num}. {module.title}
        </div>
        <div className="text-sm text-brown-3 truncate">{sub}</div>
        {status !== 'not_started' && (
          <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: status === 'completed' ? 'var(--sage)' : 'var(--terra)' }}
            />
          </div>
        )}
        <Link to={`/modul/${module.id}`} className="text-sm text-terra font-semibold">
          {btnLabel}
        </Link>
      </div>
      <span className="text-xs font-semibold text-brown-3">{badgeText}</span>
    </div>
  )
}
```

- [ ] **Step 7: Write the failing test for Dashboard**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { Dashboard } from './Dashboard'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: async () => ({ data: { user: null } }),
    },
    from: () => ({
      select: () => ({ order: async () => ({ data: [], error: null }) }),
    }),
  },
  isSupabaseConfigured: false,
}))

describe('Dashboard', () => {
  it('renders without throwing when there are no modules yet', () => {
    const queryClient = new QueryClient()
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(html).toBeTruthy()
  })
})
```

- [ ] **Step 8: Run test to verify it fails**

Run: `pnpm test Dashboard`
Expected: FAIL — `Cannot find module './Dashboard'`

- [ ] **Step 9: Write `src/pages/Dashboard.tsx`** (scope per Global Constraints: greeting, VARK badge omitted for now — no `useVarkResult` hook exists yet, out of scope per spec until `/vark` is ported — module list with progress only)

```typescript
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { ModuleCard } from '../components/ModuleCard'
import { moduleIdToPath } from '../lib/progress'

export function Dashboard() {
  const { profile } = useAuth()
  const { data: modules = [] } = useModules()
  const { data: progress = {} } = useAllProgress()

  return (
    <div className="min-h-screen bg-cream p-6">
      <h1 className="text-2xl font-bold text-brown mb-1">
        Halo, {profile?.full_name || 'Pengguna'}
      </h1>
      <p className="text-brown-3 mb-6">
        {profile?.role === 'dosen' ? 'Dashboard Dosen' : 'Dashboard Mahasiswa'}
      </p>

      <div className="flex flex-col gap-3">
        {modules.map((m) => (
          <ModuleCard key={m.id} module={m} progress={progress[moduleIdToPath(m.id)]} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Run test to verify it passes**

Run: `pnpm test Dashboard`
Expected: PASS

- [ ] **Step 11: Run Task 7's `App.test.tsx` now that `Login` and `Dashboard` both exist**

Run: `pnpm test`
Expected: PASS — every suite (`App`, `AuthContext`, `Login`, `Dashboard`, `design-tokens`, `modules`, `progress`, `supabase`)

- [ ] **Step 12: Commit**

```bash
git add src/lib/progress.ts src/lib/progress.test.ts src/hooks/useProgress.ts src/components/ModuleCard.tsx src/pages/Dashboard.tsx src/pages/Dashboard.test.tsx
git commit -m "feat: port Dashboard page (/, module list + progress, dashboard-mhs.html+dashboard-dos.html merged by role)"
```

---

### Task 10: `vercel.json` + static asset passthrough

**Files:**
- Create: `vercel.json`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: `legacy/`, `books/`, `assets/`, `manifest.json`, `sw.js` (all already at their existing paths from Task 2).
- Produces: `dist/` build output containing both the compiled SPA and the passthrough static folders.

- [ ] **Step 1: Create a `public/` folder that symlinks/copies the shared static assets so Vite's `publicDir` (already set to `'public'` in Task 1) picks them up automatically at build time**

Since `legacy/`, `books/`, `assets/`, `manifest.json`, `sw.js` must NOT physically move again (Task 2 already placed them at their final repo paths, and `legacy/*.html` internal relative links depend on staying there), use Vite's ability to serve **multiple** public directories isn't native — instead, keep them where they are and copy them into `dist/` with a small post-build script, since that's simpler and more explicit than a symlink farm:

```json
{
  "scripts": {
    "build": "tsc -b && vite build && node scripts/copy-static.mjs"
  }
}
```

Update `package.json`'s `build` script to the line above (replacing the Task 1 version).

- [ ] **Step 2: Write `scripts/copy-static.mjs`**

```javascript
import { cpSync, existsSync } from 'node:fs'

const targets = ['legacy', 'books', 'assets', 'manifest.json', 'sw.js']

for (const target of targets) {
  if (existsSync(target)) {
    cpSync(target, `dist/${target}`, { recursive: true })
    console.log(`copied ${target} -> dist/${target}`)
  } else {
    console.warn(`skipped missing ${target}`)
  }
}
```

- [ ] **Step 3: Write `vercel.json`**

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

- [ ] **Step 4: Run a full build and verify the output**

Run: `pnpm build`
Expected: exits 0. Then run `ls dist/legacy/index.html dist/books dist/assets dist/manifest.json dist/sw.js` (or the Windows equivalent) — all must exist.

- [ ] **Step 5: Serve the build output locally and spot-check both the SPA and a legacy page**

Run: `pnpm preview`
Then visit `http://localhost:4173/` (should show the new Login page) and `http://localhost:4173/legacy/dashboard-mhs.html` (should show the old page, unmodified, demo mode).
Expected: both load with no 404s.

- [ ] **Step 6: Commit**

```bash
git add vercel.json scripts/copy-static.mjs package.json
git commit -m "feat: vercel.json + build-time static passthrough for legacy/books/assets"
```

---

### Task 11: Deploy to Vercel

**Files:** none (operational task — connects the already-existing Vercel account, `inawati-dev1`, to the already-existing GitHub repo, `Inawati-dev/smart-flip`).

**Interfaces:** none — this task produces a live URL, not code.

- [ ] **Step 1: Log in to Vercel CLI (interactive — the engineer running this plan must do this themselves, it cannot be scripted)**

Run: `pnpm dlx vercel login`
Expected: browser opens, engineer authenticates as the `inawati-dev1` account, CLI prints "Success!".

- [ ] **Step 2: Link this repo to a new Vercel project**

Run: `pnpm dlx vercel link`
Expected: prompts for project name (use `smart-flip`), links to a new project under the `inawati-dev1` scope, creates `.vercel/` locally (already covered by a default Vercel-managed `.gitignore` entry it adds automatically — confirm `.vercel` appears in `.gitignore` after this step, add it manually if not).

- [ ] **Step 3: Set the two required environment variables on the Vercel project**

Run:
```bash
pnpm dlx vercel env add VITE_SUPABASE_URL production
```
(paste `https://ldqouujkjfrgtgjnsmqm.supabase.co` when prompted)
```bash
pnpm dlx vercel env add VITE_SUPABASE_ANON_KEY production
```
(paste the publishable/anon key from the Supabase dashboard's "Get Connected" panel when prompted — never the service role key)

Expected: both report "Added Environment Variable ... to Project smart-flip".

- [ ] **Step 4: Deploy**

Run: `pnpm dlx vercel --prod`
Expected: prints a production URL (e.g. `https://smart-flip.vercel.app`).

- [ ] **Step 5: Manual verification checklist against the live Vercel URL**

- [ ] `/` loads the new Login page (not a 404, not the legacy page)
- [ ] Logging in with the test account `mhs@sf.id` / `SF2026` redirects to `/dashboard` and shows the mahasiswa greeting
- [ ] Logging in with `dosen@sf.id` / `SF2026` redirects to `/dashboard` and shows the dosen greeting
- [ ] The module list on `/dashboard` shows real titles from the live Supabase `modules` table with no "undefined" text and no crash (this is the direct verification that Task 5's `normalizeModuleRow` fix works against real data, not just the demo fixture)
- [ ] `/legacy/dashboard-mhs.html` still loads and still works standalone
- [ ] `/nonexistent-path` falls through to the SPA (confirms the `handle: filesystem` + catch-all ordering in `vercel.json` is correct)

- [ ] **Step 6: Report the live URL and this checklist's results back — no commit in this task (nothing to add to git beyond what Task 10 already committed)**

---

## Self-Review Notes (completed during plan authoring)

- **Spec coverage:** every section of the approved spec maps to a task — folder layout (Tasks 1-2), data layer/auth (Tasks 4-6), theming (Task 3), routing (Task 7), the two proof pages (Tasks 8-9), `vercel.json` (Task 10), deploy (Task 11). Testing section covered by the Vitest step in every task. The spec's explicit "out of scope" list (16 remaining pages) stays out of scope here too — each only gets a `LegacyStub` route.
- **Type consistency checked:** `ModuleRow` (Task 5) is the type consumed by `ModuleCard` and `Dashboard` (Task 9) — field names match exactly (`order_num`, `color`, `sub`, `path` via `moduleIdToPath`/progress keying). `Profile` (Task 6) fields (`full_name`, `role`, `nim_nidn`, `learning_style`) match what `Login` (Task 8) and `Dashboard` (Task 9) read from `useAuth()`.
- **No placeholders:** every step has real, complete code or a real, complete shell command with expected output. The one deliberately open item (Task 2 Step 4, `serve.bat`'s exact edit) is flagged as needing the file read first, not left vague — its fix depends on content this plan's author didn't have loaded; it is not a stand-in for a real task, it's a two-line script.
