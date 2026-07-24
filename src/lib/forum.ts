import { supabase, isSupabaseConfigured } from './supabase'

export type ForumRole = 'mahasiswa' | 'dosen'

export interface ForumReply {
  id: string
  authorName: string
  authorRole: ForumRole
  content: string
  createdAt: string
}

export interface ForumPost {
  id: string
  moduleId: number
  authorName: string
  authorRole: ForumRole
  content: string
  createdAt: string
  likes: number
  replies: ForumReply[]
}

const FORUM_KEY = 'sfp_forum'

function readLocalPosts(): ForumPost[] {
  try {
    const raw = localStorage.getItem(FORUM_KEY)
    return raw ? (JSON.parse(raw) as ForumPost[]) : []
  } catch {
    return []
  }
}

function writeLocalPosts(posts: ForumPost[]): void {
  try {
    localStorage.setItem(FORUM_KEY, JSON.stringify(posts))
  } catch {
    // ignore quota/serialization errors, matches legacy/data-layer.js lsSet behavior
  }
}

// ── Pure presentation helpers — ported verbatim from legacy/forum.html ──

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']

export function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(m / 60)
    if (diff < 60000) return 'baru saja'
    if (m < 60) return m + ' menit lalu'
    if (h < 24) return h + ' jam lalu'
    const dt = new Date(iso)
    return dt.getDate() + ' ' + MONTHS_ID[dt.getMonth()] + ' ' + dt.getFullYear()
  } catch {
    return ''
  }
}

const AVATAR_COLORS = ['#5A7353', '#D4A373', '#4A7EA0', '#8FA287', '#B8855A', '#6B5D4F', '#3D6B58', '#7A5A8C']

export function avatarColor(name: string): string {
  let h = 0
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function initials(name: string | undefined): string {
  return (
    (name || '?')
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0] || '')
      .join('')
      .toUpperCase() || '?'
  )
}

// ── Data access — dual mode: Supabase when configured, else localStorage ──
// (same key ('sfp_forum') and shape as legacy/data-layer.js; demo-mode seed
// data is intentionally not ported — matches fetchModules()'s precedent of
// returning an empty/raw fallback rather than re-seeding canned content.)

export async function fetchPosts(moduleId: number | null = null): Promise<ForumPost[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from('forum_posts')
        .select('*, profiles(full_name, role)')
        .is('parent_id', null)
        .order('created_at', { ascending: false })
      if (moduleId) query = query.eq('module_id', moduleId)
      const { data, error } = await query
      if (error) throw error
      const posts = data || []
      const { data: replies } = await supabase
        .from('forum_posts')
        .select('*, profiles(full_name, role)')
        .not('parent_id', 'is', null)
      return posts.map((p) => ({
        id: p.id as string,
        moduleId: p.module_id as number,
        authorName: (p.profiles?.full_name as string) || 'Pengguna',
        authorRole: ((p.profiles?.role as ForumRole) || 'mahasiswa') as ForumRole,
        content: p.content as string,
        createdAt: p.created_at as string,
        likes: (p.likes as number) || 0,
        replies: (replies || [])
          .filter((r) => r.parent_id === p.id)
          .map((r) => ({
            id: r.id as string,
            authorName: (r.profiles?.full_name as string) || 'Pengguna',
            authorRole: ((r.profiles?.role as ForumRole) || 'mahasiswa') as ForumRole,
            content: r.content as string,
            createdAt: r.created_at as string,
          })),
      }))
    } catch (e) {
      console.warn('[forum] fetchPosts → Supabase gagal, fallback localStorage:', e)
    }
  }

  const all = readLocalPosts()
  return moduleId ? all.filter((p) => p.moduleId === moduleId) : all
}

export async function addPost({
  moduleId,
  content,
  authorName = 'Mahasiswa',
  authorRole = 'mahasiswa',
}: {
  moduleId: number
  content: string
  authorName?: string
  authorRole?: ForumRole
}): Promise<ForumPost> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { data, error } = await supabase
          .from('forum_posts')
          .insert({ module_id: moduleId, user_id: uid, content: content.trim() })
          .select()
          .single()
        if (error) throw error
        return {
          id: data.id as string,
          moduleId,
          authorName,
          authorRole,
          content: data.content as string,
          createdAt: data.created_at as string,
          likes: 0,
          replies: [],
        }
      }
    } catch (e) {
      console.warn('[forum] addPost → Supabase gagal, fallback localStorage:', e)
    }
  }

  const all = readLocalPosts()
  const post: ForumPost = {
    id: 'post_' + Date.now(),
    moduleId,
    authorName,
    authorRole,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    likes: 0,
    replies: [],
  }
  all.unshift(post)
  writeLocalPosts(all)
  return post
}

export async function addReply(
  postId: string,
  content: string,
  authorName = 'Mahasiswa',
  authorRole: ForumRole = 'mahasiswa',
): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { data: parent } = await supabase
          .from('forum_posts')
          .select('module_id')
          .eq('id', postId)
          .single()
        await supabase.from('forum_posts').insert({
          module_id: parent?.module_id,
          user_id: uid,
          parent_id: postId,
          content: content.trim(),
        })
        return
      }
    } catch (e) {
      console.warn('[forum] addReply → Supabase gagal, fallback localStorage:', e)
    }
  }

  const all = readLocalPosts()
  const post = all.find((p) => p.id === postId)
  if (!post) return
  post.replies = post.replies || []
  post.replies.push({
    id: 'rep_' + Date.now(),
    authorName,
    authorRole,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  })
  writeLocalPosts(all)
}

export async function likePost(postId: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase.rpc('increment_forum_likes', { p_post_id: postId })
      return
    } catch (e) {
      console.warn('[forum] likePost → Supabase gagal, fallback localStorage:', e)
    }
  }
  const all = readLocalPosts()
  const post = all.find((p) => p.id === postId)
  if (post) {
    post.likes = (post.likes || 0) + 1
    writeLocalPosts(all)
  }
}
