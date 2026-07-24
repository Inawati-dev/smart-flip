// ════════════════════════════════════════════
//  Edge Function: import-mahasiswa (Tahap 2 — kelas/rombongan belajar)
// ════════════════════════════════════════════
// Deno runtime (Supabase Edge Functions), NOT part of the Vite/React app —
// excluded from tsconfig.app.json's "src"-only include and from the root
// eslint config (see eslint.config.js ignores). Do not import this file
// from anywhere in src/.
//
// WHY THIS HAS TO BE A SERVER-SIDE FUNCTION (not client code):
// Creating a Supabase Auth user for someone else (bulk mahasiswa import) is
// only possible via the Admin API (`auth.admin.createUser`), which requires
// the `service_role` key. That key must NEVER reach the browser — anyone
// could pull it out of DevTools and get full, RLS-bypassing access to the
// whole database. So this runs here instead, where the key only ever lives
// in an env var Deno.env.get() reads at request time.
//
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically by the Supabase Edge Function runtime — they do NOT need to
// be set manually via `supabase secrets set`.
//
// Called from the frontend via src/lib/kelas.ts's importMahasiswaCSV(),
// which does `supabase.functions.invoke('import-mahasiswa', { body: {...} })`
// — the supabase-js client automatically attaches the caller's current
// session access token as the Authorization header, which is what the
// caller-identity check below reads.

import { createClient } from 'npm:@supabase/supabase-js@2'

// Standard Supabase Edge Function CORS boilerplate — needed because this is
// invoked directly from the browser (supabase.functions.invoke), not
// server-to-server. Access-Control-Allow-Origin: '*' matches every other
// public Supabase Edge Function template; this function is already
// authorization-gated by the JWT + role/ownership checks below, so a
// permissive CORS origin does not by itself expose anything.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface ImportStudentInput {
  nama?: unknown
  nim?: unknown
  email?: unknown
}

type RowStatus = 'berhasil' | 'kelas_penuh' | 'error'

interface ImportResultRow {
  nama: string
  nim: string
  email: string
  status: RowStatus
  password?: string
  error?: string
}

// Random password generator — crypto.getRandomValues (Deno's built-in Web
// Crypto API), deliberately NOT Math.random(): this produces a real account
// credential, not a UI-only random string, so it needs to be
// cryptographically unpredictable. Guarantees at least one uppercase,
// lowercase, digit, and symbol character, then fills/shuffles the rest so
// the category-guarantee positions aren't always at the front.
function generateSecurePassword(length = 14): string {
  const UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ' // no O/I to match kelas.ts's ambiguous-char convention
  const LOWER = 'abcdefghijkmnpqrstuvwxyz'
  const DIGITS = '23456789'
  const SYMBOLS = '!@#$%^&*-_+='
  const ALL = UPPER + LOWER + DIGITS + SYMBOLS
  const categories = [UPPER, LOWER, DIGITS, SYMBOLS]

  function randomChar(alphabet: string): string {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return alphabet[buf[0] % alphabet.length]
  }

  const chars: string[] = categories.map((cat) => randomChar(cat))
  while (chars.length < length) chars.push(randomChar(ALL))

  // Fisher-Yates shuffle using crypto randomness, so the four guaranteed
  // category chars aren't predictably in positions 0-3.
  for (let i = chars.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const j = buf[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Gunakan POST.' }, 405)
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    // Should never happen on Supabase's own Edge Function runtime (these
    // three are auto-injected) -- guards against a local `supabase functions
    // serve` misconfiguration during manual testing.
    return jsonResponse({ error: 'Konfigurasi server tidak lengkap.' }, 500)
  }

  try {
    // ── 1. Resolve WHO is calling, using their own JWT (anon key + their
    //    Authorization header) -- this client is ONLY used for
    //    auth.getUser(), never for data access. ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Header Authorization tidak ada. Anda harus login.' }, 401)
    }

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const {
      data: { user: caller },
      error: getUserError,
    } = await callerClient.auth.getUser()
    if (getUserError || !caller) {
      return jsonResponse({ error: 'Sesi tidak valid atau sudah kedaluwarsa. Silakan login ulang.' }, 401)
    }

    // ── 2. ONE admin client, service_role key, used for every privileged
    //    operation from here on (role check, ownership check, createUser,
    //    profiles.class_id update). Never logged, never returned. ──
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()
    if (profileErr || !callerProfile || callerProfile.role !== 'dosen') {
      return jsonResponse({ error: 'Hanya dosen yang dapat mengimpor akun mahasiswa.' }, 403)
    }

    // ── 3. Parse + validate the request body ──
    let body: { classId?: unknown; students?: unknown }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Body request bukan JSON yang valid.' }, 400)
    }
    const classId = typeof body.classId === 'string' ? body.classId : ''
    const rawStudents = Array.isArray(body.students) ? (body.students as ImportStudentInput[]) : null
    if (!classId || !rawStudents || rawStudents.length === 0) {
      return jsonResponse({ error: 'Body wajib berisi { classId: string, students: Array }.' }, 400)
    }
    if (rawStudents.length > 500) {
      return jsonResponse({ error: 'Maksimal 500 baris per import. Bagi CSV menjadi beberapa batch.' }, 400)
    }

    // ── 4. Ownership check: classId must be a kelas owned by THIS dosen --
    //    never trust classId from the request body on its own. ──
    const { data: kelas, error: kelasErr } = await adminClient
      .from('classes')
      .select('id, max_students, dosen_id')
      .eq('id', classId)
      .maybeSingle()
    if (kelasErr || !kelas || kelas.dosen_id !== caller.id) {
      return jsonResponse({ error: 'Kelas tidak ditemukan atau bukan milik Anda.' }, 403)
    }
    const maxStudents = kelas.max_students as number

    // ── 5. Process rows ONE AT A TIME (not Promise.all) -- keeps capacity
    //    counting correct (each success changes the count the NEXT row sees)
    //    and keeps per-row error reporting simple. ──
    const results: ImportResultRow[] = []

    for (const raw of rawStudents) {
      const nama = String(raw?.nama ?? '').trim()
      const nim = String(raw?.nim ?? '').trim()
      const email = String(raw?.email ?? '').trim().toLowerCase()

      if (!nama || !nim || !email || !isValidEmail(email)) {
        results.push({ nama, nim, email, status: 'error', error: 'Data tidak lengkap atau email tidak valid.' })
        continue
      }

      // Recompute capacity fresh every iteration.
      const { count, error: countErr } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', classId)
      if (countErr) {
        results.push({ nama, nim, email, status: 'error', error: 'Gagal memeriksa kapasitas kelas.' })
        continue
      }
      if ((count ?? 0) >= maxStudents) {
        results.push({ nama, nim, email, status: 'kelas_penuh' })
        continue
      }

      const password = generateSecurePassword()

      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // admin-provisioned account -- skip email confirmation flow
        user_metadata: {
          full_name: nama,
          role: 'mahasiswa',
          nim_nidn: nim,
        },
      })
      if (createErr || !created?.user) {
        results.push({
          nama,
          nim,
          email,
          status: 'error',
          error: createErr?.message ?? 'Gagal membuat akun (tidak diketahui sebabnya).',
        })
        continue
      }

      // handle_new_user() (migration_v7_kelas.sql) already inserted a
      // profiles row with class_id NULL (no class_code in this metadata
      // path) -- follow up with the class assignment. service_role bypasses
      // the lock_profile_role trigger by design (documented escape hatch).
      const { error: updateErr } = await adminClient
        .from('profiles')
        .update({ class_id: classId, nim_nidn: nim })
        .eq('id', created.user.id)
      if (updateErr) {
        results.push({
          nama,
          nim,
          email,
          status: 'error',
          error: `Akun dibuat tapi gagal ditautkan ke kelas: ${updateErr.message}`,
        })
        continue
      }

      // This is the ONLY point in the system the plaintext password ever
      // exists outside the dosen's own eyes -- Supabase never stores or
      // re-exposes it (only a hash). It is returned once, here, and never
      // logged.
      results.push({ nama, nim, email, status: 'berhasil', password })
    }

    const summary = {
      total: results.length,
      berhasil: results.filter((r) => r.status === 'berhasil').length,
      kelas_penuh: results.filter((r) => r.status === 'kelas_penuh').length,
      error: results.filter((r) => r.status === 'error').length,
    }

    return jsonResponse({ results, summary }, 200)
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga di server.' }, 500)
  }
})
