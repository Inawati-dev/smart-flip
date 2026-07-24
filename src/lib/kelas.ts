import { supabase, isSupabaseConfigured } from './supabase'

// Mirrors manajemen.ts / forum.ts's dual-mode (Supabase when configured,
// else localStorage) pattern. Backs src/pages/Kelas.tsx (dosen-only kelas
// management) and the "Kode Kelas" opt-in field on Register.tsx (which sends
// class_code in signUp's user_metadata — see
// database/migration_v7_kelas.sql's handle_new_user(), NOT this file; the
// actual code→class_id resolution happens server-side in that trigger, this
// file never resolves a code to a class_id on the client).

export interface Kelas {
  id: string
  name: string
  angkatan: number
  code: string
  dosen_id: string
  max_students: number
  created_at: string
}

export interface KelasWithCount extends Kelas {
  studentCount: number
}

const CLASSES_KEY = 'sfp_kelas_demo'

// Excludes visually ambiguous characters (0/O, 1/I/L) so a dosen reading the
// code aloud or a mahasiswa typing it by hand is less likely to mistype it.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota/serialization errors, matches manajemen.ts lsSet behavior
  }
}

function getDemoClasses(): Kelas[] {
  return lsGet<Kelas[]>(CLASSES_KEY) ?? []
}

function setDemoClasses(classes: Kelas[]): void {
  lsSet(CLASSES_KEY, classes)
}

// Random, uppercase, collision-checked-by-the-caller code — dosen never
// types one in manually (CLAUDE.md-adjacent product requirement: consistent,
// no-collision codes). Exported mainly so it's unit-testable on its own.
export function generateClassCode(length = CODE_LENGTH): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

export interface CreateKelasInput {
  name: string
  angkatan: number
  maxStudents: number
  dosenId: string
}

function validateKelasInput(input: CreateKelasInput): string {
  const name = input.name.trim()
  if (!name) throw new Error('Nama kelas wajib diisi.')
  if (!Number.isFinite(input.angkatan) || input.angkatan < 2000 || input.angkatan > 2100) {
    throw new Error('Angkatan tidak valid.')
  }
  if (!Number.isFinite(input.maxStudents) || input.maxStudents < 1) {
    throw new Error('Kapasitas maksimal harus lebih dari 0.')
  }
  return name
}

// Creates a kelas with a freshly generated code. In Supabase mode, retries a
// handful of times on a unique-constraint violation (Postgres error code
// 23505) against `classes.code` — collisions are astronomically unlikely at
// 6 chars from a 32-symbol alphabet (~1 billion combinations) but not
// impossible, and a cheap retry is simpler than a client-side existence
// pre-check that would itself be racy against concurrent dosen.
export async function createKelas(input: CreateKelasInput): Promise<Kelas> {
  const name = validateKelasInput(input)

  if (isSupabaseConfigured) {
    let lastError: unknown = null
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateClassCode()
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name,
          angkatan: input.angkatan,
          max_students: input.maxStudents,
          dosen_id: input.dosenId,
          code,
        })
        .select()
        .single()
      if (!error) return data as Kelas
      lastError = error
      if ((error as { code?: string }).code !== '23505') break
    }
    throw lastError instanceof Error ? lastError : new Error('Gagal membuat kelas.')
  }

  const kelas: Kelas = {
    id: crypto.randomUUID(),
    name,
    angkatan: input.angkatan,
    max_students: input.maxStudents,
    dosen_id: input.dosenId,
    code: generateClassCode(),
    created_at: new Date().toISOString(),
  }
  setDemoClasses([kelas, ...getDemoClasses()])
  return kelas
}

// Fetches every kelas owned by this dosen, each annotated with a live
// mahasiswa count. Supabase has no cheap "group by" through supabase-js
// without a view/RPC, so this does it in two round trips: classes owned by
// this dosen, then a single `class_id IN (...)` query over profiles to tally
// counts client-side — still just 2 queries regardless of class count.
export async function getKelasByDosen(dosenId: string): Promise<KelasWithCount[]> {
  if (isSupabaseConfigured) {
    try {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .eq('dosen_id', dosenId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const list = (classes ?? []) as Kelas[]

      const counts: Record<string, number> = {}
      const ids = list.map((c) => c.id)
      if (ids.length) {
        const { data: profs, error: profErr } = await supabase.from('profiles').select('class_id').in('class_id', ids)
        if (profErr) throw profErr
        for (const p of (profs ?? []) as Array<{ class_id: string | null }>) {
          if (p.class_id) counts[p.class_id] = (counts[p.class_id] ?? 0) + 1
        }
      }

      return list.map((c) => ({ ...c, studentCount: counts[c.id] ?? 0 }))
    } catch (e) {
      console.warn('[kelas] getKelasByDosen → Supabase gagal, fallback localStorage:', e)
    }
  }

  // Demo/localStorage mode: Register.tsx blocks supabase.auth.signUp()
  // entirely when Supabase isn't configured (there's no local multi-account
  // auth to join a kelas against), so no mahasiswa can ever actually join a
  // demo-mode kelas — studentCount is always 0 here. This is an honest
  // limitation of demo mode, not a bug; mirrors manajemen.ts's comment about
  // durasi/catatan never round-tripping through Supabase.
  return getDemoClasses()
    .filter((c) => c.dosen_id === dosenId)
    .map((c) => ({ ...c, studentCount: 0 }))
}

export async function deleteKelas(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) throw error
    return
  }
  setDemoClasses(getDemoClasses().filter((c) => c.id !== id))
}

export interface KelasSummary {
  totalStudents: number
  byAngkatan: Array<{ angkatan: number; total: number }>
}

// Pure aggregation helper over already-fetched classes — no extra query.
// Sorted newest-angkatan-first so the most recent intake surfaces first in
// the summary cards.
export function summarizeKelas(classes: KelasWithCount[]): KelasSummary {
  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0)
  const byAngkatanMap = new Map<number, number>()
  for (const c of classes) {
    byAngkatanMap.set(c.angkatan, (byAngkatanMap.get(c.angkatan) ?? 0) + c.studentCount)
  }
  const byAngkatan = Array.from(byAngkatanMap.entries())
    .map(([angkatan, total]) => ({ angkatan, total }))
    .sort((a, b) => b.angkatan - a.angkatan)
  return { totalStudents, byAngkatan }
}

// ════════════════════════════════════════════
//  Tahap 2 — import CSV mahasiswa + auto-generated password
// ════════════════════════════════════════════
// See supabase/functions/import-mahasiswa/index.ts for the server-side half
// (Deno Edge Function, needs the service_role key -- can't run client-side).
// This file only ever sends parsed+validated rows to that function and
// relays its per-row results back; it never talks to auth.admin.* directly.

export interface ImportRow {
  nama: string
  nim: string
  email: string
}

export interface ImportResult {
  nama: string
  nim: string
  email: string
  status: 'berhasil' | 'kelas_penuh' | 'error'
  password?: string
  error?: string
}

// A row after client-side CSV parsing + validation, before it's (maybe)
// sent to the Edge Function. Kept distinct from ImportRow so the UI can
// render a full preview (including invalid rows, with a reason) without
// conflating it with the wire format the Edge Function actually expects.
export interface ParsedImportRow extends ImportRow {
  line: number
  valid: boolean
  reason?: string
}

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Splits one CSV line respecting double-quoted fields (so e.g. a name like
// "Budi, S.Kom" with an embedded comma isn't split in half). Doesn't handle
// escaped quotes-within-quotes or multi-line quoted fields -- this is the
// "nama,nim,email sederhana" parser the product spec asks for, not a
// general-purpose CSV library.
function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      cells.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur)
  return cells.map((c) => c.trim())
}

// Parses a `nama,nim,email` CSV (header row required and skipped -- its
// exact text doesn't matter, only column ORDER does) into rows tagged
// valid/invalid client-side. Invalid rows are never sent to the Edge
// Function (importMahasiswaCSV below only receives what the caller filters
// to `.valid`), matching the product requirement that bad rows are caught
// before any account-creation attempt, not reported back from the server.
export function parseImportCsv(csvText: string): ParsedImportRow[] {
  const lines = csvText
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const dataLines = lines.slice(1) // first non-empty line = header, skipped

  return dataLines.map((raw, idx) => {
    const cells = splitCsvLine(raw)
    const nama = (cells[0] ?? '').trim()
    const nim = (cells[1] ?? '').trim()
    const email = (cells[2] ?? '').trim().toLowerCase()
    const line = idx + 2 // +1 for the skipped header, +1 for 1-based lines

    let reason: string | undefined
    if (!nama) reason = 'Nama kosong.'
    else if (!nim) reason = 'NIM kosong.'
    else if (!email || !SIMPLE_EMAIL_RE.test(email)) reason = 'Email tidak valid.'

    return { nama, nim, email, line, valid: !reason, reason }
  })
}

// Bulk-imports mahasiswa into a kelas with auto-generated passwords. No
// demo/localStorage mode: this creates REAL Supabase Auth accounts, which
// makes no sense to simulate locally -- same reasoning as Register.tsx
// blocking supabase.auth.signUp() outright when Supabase isn't configured.
export async function importMahasiswaCSV(classId: string, students: ImportRow[]): Promise<ImportResult[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Import mahasiswa memerlukan konfigurasi Supabase — tidak tersedia dalam mode demo.')
  }
  if (students.length === 0) {
    throw new Error('Tidak ada data mahasiswa yang valid untuk diimpor.')
  }

  const { data, error } = await supabase.functions.invoke<{
    results: ImportResult[]
    summary: { total: number; berhasil: number; kelas_penuh: number; error: number }
  }>('import-mahasiswa', { body: { classId, students } })

  if (error) throw error
  if (!data) throw new Error('Tidak ada respons dari server.')
  return data.results
}
