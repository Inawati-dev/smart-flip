import { supabase, isSupabaseConfigured } from './supabase'

export type DraftStatus = 'submitted' | 'reviewed' | 'revision'
export type DraftCommentRole = 'mahasiswa' | 'dosen'

export interface DraftComment {
  id: string
  authorName: string
  authorRole: DraftCommentRole
  text: string
  createdAt: string
}

export interface Draft {
  id: string
  moduleId: number
  moduleName: string
  authorName: string
  title: string
  version: number
  content: string
  status: DraftStatus
  submittedAt: string
  comments: DraftComment[]
}

const DRAFT_KEY = 'sfp_drafts'

function readLocalDrafts(): Draft[] {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Draft[]) : []
  } catch {
    return []
  }
}

function writeLocalDrafts(drafts: Draft[]): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))
  } catch {
    // ignore quota/serialization errors, matches legacy/data-layer.js lsSet behavior
  }
}

// ── Pure presentation helpers — ported verbatim from legacy/draf.html ──

export const STATUS_LABEL: Record<DraftStatus, string> = {
  submitted: 'Menunggu Review',
  reviewed: 'Sudah Direview',
  revision: 'Perlu Revisi',
}

// Badge colors ported verbatim from legacy/draf.html's .st-submitted/.st-reviewed/.st-revision.
export const STATUS_BADGE: Record<DraftStatus, { bg: string; color: string }> = {
  submitted: { bg: '#FAE8A0', color: '#705010' },
  reviewed: { bg: '#C0DD97', color: '#27500A' },
  revision: { bg: '#FDDAD9', color: '#B03020' },
}

// Ported verbatim from legacy/draf.html's formatDate() — distinct from
// forum.ts's timeAgo() in its "N hari lalu" bucket before falling back to a
// full date string.
export function formatDraftDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(m / 60)
    const days = Math.floor(h / 24)
    if (diff < 60000) return 'baru saja'
    if (m < 60) return m + ' menit lalu'
    if (h < 24) return h + ' jam lalu'
    if (days < 7) return days + ' hari lalu'
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

// ── Data access — dual mode: Supabase when configured, else localStorage ──
// (same key ('sfp_drafts') and shape as legacy/data-layer.js; demo-mode seed
// data is intentionally not ported — matches forum.ts's precedent of
// returning an empty/raw fallback rather than re-seeding canned content.)
//
// NOTE: the Supabase queries below mirror legacy/data-layer.js's getDrafts /
// submitDraft / addComment / updateDraftStatus verbatim (columns like
// `content`, `status` on `drafts` and `author_role` on `draft_comments`),
// which is broader than what's declared in database/schema.sql today. That
// mismatch already exists for forum.ts (e.g. its `likes` column / RPC), so
// this follows the same established precedent rather than inventing a new one.

export async function fetchDrafts(isDosen: boolean, moduleId: number | null = null): Promise<Draft[]> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      let query = supabase
        .from('drafts')
        .select('*, profiles(full_name), modules(title)')
        .order('submitted_at', { ascending: false })
      if (!isDosen) query = query.eq('user_id', uid)
      if (moduleId) query = query.eq('module_id', moduleId)
      const { data, error } = await query
      if (error) throw error
      const drafts = data || []
      const ids = drafts.map((d) => d.id)
      const { data: comments } = ids.length
        ? await supabase
            .from('draft_comments')
            .select('*, profiles(full_name)')
            .in('draft_id', ids)
            .order('created_at')
        : { data: [] as Record<string, unknown>[] }

      return drafts.map((d) => ({
        id: String(d.id),
        moduleId: d.module_id as number,
        moduleName: (d.modules?.title as string) || '',
        authorName: (d.profiles?.full_name as string) || 'Mahasiswa',
        title: d.title as string,
        version: (d.version as number) || 1,
        content: (d.content as string) || '',
        status: (d.status as DraftStatus) || 'submitted',
        submittedAt: d.submitted_at as string,
        comments: (comments || [])
          .filter((c) => c.draft_id === d.id)
          .map((c) => ({
            id: String(c.id),
            authorName:
              (c.profiles?.full_name as string) || (c.author_role === 'dosen' ? 'Dosen' : 'Mahasiswa'),
            authorRole: (c.author_role as DraftCommentRole) || 'mahasiswa',
            text: c.comment as string,
            createdAt: c.created_at as string,
          })),
      }))
    } catch (e) {
      console.warn('[draf] fetchDrafts → Supabase gagal, fallback localStorage:', e)
    }
  }

  const all = readLocalDrafts()
  return moduleId ? all.filter((d) => d.moduleId === moduleId) : all
}

export async function submitDraft({
  moduleId,
  moduleName,
  authorName,
  title,
  content,
}: {
  moduleId: number
  moduleName: string
  authorName?: string
  title: string
  content: string
}): Promise<Draft> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { data, error } = await supabase
          .from('drafts')
          .insert({ user_id: uid, module_id: moduleId, title, content, version: 1, status: 'submitted' })
          .select()
          .single()
        if (error) throw error
        return {
          id: String(data.id),
          moduleId,
          moduleName,
          authorName: authorName || 'Mahasiswa',
          title,
          version: 1,
          content,
          status: 'submitted',
          submittedAt: data.submitted_at as string,
          comments: [],
        }
      }
    } catch (e) {
      console.warn('[draf] submitDraft → Supabase gagal, fallback localStorage:', e)
    }
  }

  const all = readLocalDrafts()
  const draft: Draft = {
    id: 'draft_' + Date.now(),
    moduleId,
    moduleName,
    authorName: authorName || 'Mahasiswa',
    title,
    version: 1,
    content,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    comments: [],
  }
  all.unshift(draft)
  writeLocalDrafts(all)
  return draft
}

export async function addDraftComment(
  draftId: string,
  {
    text,
    authorName,
    authorRole,
  }: { text: string; authorName?: string; authorRole: DraftCommentRole },
): Promise<DraftComment | null> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { data, error } = await supabase
          .from('draft_comments')
          .insert({ draft_id: draftId, author_id: uid, author_role: authorRole, comment: text })
          .select()
          .single()
        if (error) throw error
        return {
          id: String(data.id),
          authorName: authorName || (authorRole === 'dosen' ? 'Dosen' : 'Mahasiswa'),
          authorRole,
          text,
          createdAt: data.created_at as string,
        }
      }
    } catch (e) {
      console.warn('[draf] addDraftComment → Supabase gagal, fallback localStorage:', e)
    }
  }

  const all = readLocalDrafts()
  const idx = all.findIndex((d) => d.id === draftId)
  if (idx === -1) return null
  const comment: DraftComment = {
    id: 'cmt_' + Date.now(),
    authorName: authorName || (authorRole === 'dosen' ? 'Dosen' : 'Mahasiswa'),
    authorRole,
    text,
    createdAt: new Date().toISOString(),
  }
  all[idx].comments.push(comment)
  writeLocalDrafts(all)
  return comment
}

export async function updateDraftStatus(draftId: string, status: DraftStatus): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('drafts').update({ status }).eq('id', draftId)
      if (error) throw error
      return
    } catch (e) {
      console.warn('[draf] updateDraftStatus → Supabase gagal, fallback localStorage:', e)
    }
  }
  const all = readLocalDrafts()
  const idx = all.findIndex((d) => d.id === draftId)
  if (idx === -1) return
  all[idx].status = status
  writeLocalDrafts(all)
}
