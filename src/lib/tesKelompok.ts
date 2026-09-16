import { supabase, isSupabaseConfigured } from './supabase'
import { generateCode } from './testSessions'

// Tes kelompok (antrean #65 opsi A, keputusan Johan 16 Sep 2026).
// Menggantikan "Diagnostik" di bank soal. Dosen membuat sesi berisi N
// kelompok; tiap kelompok punya kode 6 huruf (generateCode() yang sama
// dengan tes khusus). Mahasiswa memasukkan kode, masuk kelompok (maksimal
// group_size orang), lalu tiap anggota mengerjakan soal kind='kelompok'
// sendiri. Skor per orang dan rata-rata kelompok. Skema dan RPC: migration_v22.
// Mahasiswa tidak punya policy baca langsung ke tabel ini; semua lewat RPC.

export interface GroupSession {
  id: string
  name: string
  dosen_id: string
  group_size: number
  shuffle: boolean
  is_open: boolean
  created_at: string
}

export interface GroupTeam {
  id: string
  session_id: string
  number: number
  code: string
}

export interface GroupSessionWithTeams extends GroupSession {
  teams: GroupTeam[]
}

export interface VerifiedGroup {
  session_id: string
  name: string
  shuffle: boolean
  team_id: string
  team_number: number
  member_count: number
  group_size: number
  already_member: boolean
  already_done: boolean
}

export interface TeamMember {
  user_id: string
  full_name: string
  score: number | null
  attempted_at: string | null
}

export interface GroupResultRow {
  team_number: number
  code: string
  user_id: string | null
  full_name: string | null
  score: number | null
  attempted_at: string | null
}

export const UKURAN_KELOMPOK_BAWAAN = 5

/** Rata-rata skor anggota yang sudah mengerjakan, dibulatkan. Null bila belum ada. */
export function rataKelompok(rows: Array<{ score: number | null }>): number | null {
  const s = rows.map((r) => r.score).filter((x): x is number => x != null)
  if (s.length === 0) return null
  return Math.round(s.reduce((a, b) => a + b, 0) / s.length)
}

/** Kelompokkan baris hasil per nomor kelompok, urut nomor. */
export function kelompokkanHasil(rows: GroupResultRow[]): Array<{ number: number; code: string; anggota: GroupResultRow[]; rata: number | null }> {
  const map = new Map<number, { number: number; code: string; anggota: GroupResultRow[] }>()
  for (const r of rows) {
    const g = map.get(r.team_number) ?? { number: r.team_number, code: r.code, anggota: [] }
    if (r.user_id) g.anggota.push(r)
    map.set(r.team_number, g)
  }
  return [...map.values()]
    .sort((a, b) => a.number - b.number)
    .map((g) => ({ ...g, rata: rataKelompok(g.anggota) }))
}

function isMissingSchema(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null | undefined
  if (!err) return false
  if (err.code === '42P01' || err.code === '42883') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('does not exist') || msg.includes('could not find')
}

let warned = false
function warnOnce(context: string, e: unknown): void {
  if (warned) return
  warned = true
  console.warn(`[tesKelompok] ${context}: migration_v22 belum jalan?`, e)
}

// ── Dosen ──

export async function fetchGroupSessions(): Promise<GroupSessionWithTeams[]> {
  if (!isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase
      .from('group_sessions')
      .select('*, group_teams(id, session_id, number, code)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => {
      const row = r as GroupSession & { group_teams?: GroupTeam[] }
      const teams = [...(row.group_teams ?? [])].sort((a, b) => a.number - b.number)
      const { group_teams: _drop, ...rest } = row
      void _drop
      return { ...rest, teams }
    })
  } catch (e) {
    if (isMissingSchema(e)) warnOnce('fetchGroupSessions', e)
    else console.warn('[tesKelompok] fetchGroupSessions gagal:', e)
    return []
  }
}

/**
 * Buat sesi plus N kelompok berkode. Kode dibuat di klien; UNIQUE (code) di
 * DB penjaganya, tabrakan 23505 memicu satu kali coba ulang per kelompok.
 */
export async function createGroupSession(input: {
  name: string
  groupCount: number
  groupSize: number
  shuffle: boolean
  dosenId: string
}): Promise<GroupSessionWithTeams> {
  if (!isSupabaseConfigured) throw new Error('Membuat tes kelompok butuh koneksi Supabase, tidak tersedia di mode demo.')
  const { data: sess, error } = await supabase
    .from('group_sessions')
    .insert({
      name: input.name,
      dosen_id: input.dosenId,
      group_size: input.groupSize,
      shuffle: input.shuffle,
      is_open: true,
    })
    .select('*')
    .single()
  if (error) throw error
  const session = sess as GroupSession
  const teams: GroupTeam[] = []
  for (let n = 1; n <= input.groupCount; n++) {
    let inserted: GroupTeam | null = null
    for (let attempt = 0; attempt < 2 && !inserted; attempt++) {
      const { data: t, error: tErr } = await supabase
        .from('group_teams')
        .insert({ session_id: session.id, number: n, code: generateCode() })
        .select('id, session_id, number, code')
        .single()
      if (!tErr) inserted = t as GroupTeam
      else if (tErr.code !== '23505' || attempt === 1) {
        await supabase.from('group_sessions').delete().eq('id', session.id)
        throw tErr
      }
    }
    if (inserted) teams.push(inserted)
  }
  return { ...session, teams }
}

export async function setGroupSessionOpen(id: string, isOpen: boolean): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Butuh koneksi Supabase.')
  const { error } = await supabase.from('group_sessions').update({ is_open: isOpen }).eq('id', id)
  if (error) throw error
}

export async function deleteGroupSession(id: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Butuh koneksi Supabase.')
  const { error } = await supabase.from('group_sessions').delete().eq('id', id)
  if (error) throw error
}

export async function fetchGroupResults(sessionId: string): Promise<GroupResultRow[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.rpc('group_session_results', { p_session: sessionId })
  if (error) {
    if (isMissingSchema(error)) warnOnce('fetchGroupResults', error)
    else console.warn('[tesKelompok] fetchGroupResults gagal:', error)
    return []
  }
  return (data as GroupResultRow[]) ?? []
}

// ── Mahasiswa ──

/** Null bila kode salah atau sesi ditutup. */
export async function verifyGroupCode(code: string): Promise<VerifiedGroup | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.rpc('verify_group_code', { p_code: code.trim().toUpperCase() })
  if (error) {
    if (isMissingSchema(error)) warnOnce('verifyGroupCode', error)
    throw error
  }
  const rows = (data as VerifiedGroup[]) ?? []
  return rows[0] ?? null
}

/** Masuk kelompok. Melempar Error berpesan Indonesia dari RPC (penuh, sudah di kelompok lain, ditutup). */
export async function joinGroup(code: string): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('Tes kelompok butuh koneksi Supabase, tidak tersedia di mode demo.')
  const { data, error } = await supabase.rpc('join_group', { p_code: code.trim().toUpperCase() })
  if (error) throw new Error(error.message.replace(/^.*?: /, ''))
  return data as string
}

export async function fetchTeamView(teamId: string): Promise<TeamMember[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.rpc('group_team_view', { p_team: teamId })
  if (error) {
    console.warn('[tesKelompok] fetchTeamView gagal:', error)
    return []
  }
  return (data as TeamMember[]) ?? []
}

export async function submitGroupAttempt(teamId: string, score: number, answers: unknown): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Butuh koneksi Supabase.')
  const { error } = await supabase.rpc('submit_group_attempt', { p_team: teamId, p_score: score, p_answers: answers })
  if (error) throw new Error(error.message.replace(/^.*?: /, ''))
}
