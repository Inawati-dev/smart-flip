import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../hooks/useModules'
import { useForumPosts } from '../hooks/useForum'
import { addPost, addReply, likePost, timeAgo, initials, avatarColor } from '../lib/forum'
import { Layout } from '../components/Layout'
import { IconChat, IconThumbsUp } from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const

export function Forum() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: modules = [] } = useModules()

  const [moduleFilter, setModuleFilter] = useState<number | null>(null)
  const { data: posts = [], isLoading } = useForumPosts(moduleFilter)

  const [newPostModuleId, setNewPostModuleId] = useState<number | null>(null)
  const [newPostContent, setNewPostContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({})
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [sendingReply, setSendingReply] = useState<Record<string, boolean>>({})
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<string | null>(null)

  const activeModuleId = newPostModuleId ?? modules[0]?.id ?? null
  const authorName = profile?.full_name || 'Mahasiswa'
  const authorRole = profile?.role || 'mahasiswa'

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }

  async function refetchPosts() {
    await queryClient.invalidateQueries({ queryKey: ['forum', 'posts'] })
  }

  async function handleSubmitPost() {
    const content = newPostContent.trim()
    if (content.length < 10) {
      showToast('Tulisan minimal 10 karakter.')
      return
    }
    if (!activeModuleId) return
    setPosting(true)
    try {
      await addPost({ moduleId: activeModuleId, content, authorName, authorRole })
      setNewPostContent('')
      setModuleFilter(null)
      await refetchPosts()
      showToast('Postingan berhasil dikirim!')
    } catch {
      showToast('Gagal mengirim. Coba lagi.')
    } finally {
      setPosting(false)
    }
  }

  async function handleSendReply(postId: string) {
    const content = (replyDrafts[postId] || '').trim()
    if (content.length < 3) return
    setSendingReply((s) => ({ ...s, [postId]: true }))
    try {
      await addReply(postId, content, authorName, authorRole)
      setReplyDrafts((d) => ({ ...d, [postId]: '' }))
      await refetchPosts()
      setOpenReplies((o) => ({ ...o, [postId]: true }))
      showToast('Balasan terkirim!')
    } catch {
      // ported from legacy/forum.html: reply failures only console.warn, no user-facing error
    } finally {
      setSendingReply((s) => ({ ...s, [postId]: false }))
    }
  }

  async function handleLike(postId: string) {
    try {
      await likePost(postId)
      setLikedPosts((l) => ({ ...l, [postId]: true }))
      await refetchPosts()
    } catch {
      // ported from legacy/forum.html: like failures only console.warn
    }
  }

  return (
    <Layout>
      <div className="page-fadein max-w-[700px] mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-bold text-brown mb-1">Forum Diskusi</h1>
        <p className="text-brown-3 mb-4">{posts.length} diskusi</p>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
          <button
            onClick={() => setModuleFilter(null)}
            className={`px-3.5 py-1.5 rounded-full text-sm border whitespace-nowrap flex-shrink-0 ${
              moduleFilter === null ? 'bg-terra text-white border-terra' : 'bg-ivory text-brown-2'
            }`}
            style={moduleFilter === null ? undefined : BORDER}
          >
            Semua
          </button>
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => setModuleFilter(m.id)}
              className={`px-3.5 py-1.5 rounded-full text-sm border whitespace-nowrap flex-shrink-0 ${
                moduleFilter === m.id ? 'bg-terra text-white border-terra' : 'bg-ivory text-brown-2'
              }`}
              style={moduleFilter === m.id ? undefined : BORDER}
            >
              M{m.id}
            </button>
          ))}
        </div>

        {/* New post card */}
        <div className="bg-ivory rounded-2xl border p-4 mb-3.5" style={BORDER}>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: avatarColor(authorName) }}
            >
              {initials(authorName)}
            </div>
            <select
              value={activeModuleId ?? ''}
              onChange={(e) => setNewPostModuleId(Number(e.target.value))}
              className="flex-1 min-w-0 h-9 px-2.5 rounded-lg text-sm text-brown border outline-none cursor-pointer"
              style={{ ...BORDER, background: 'var(--bg3)' }}
            >
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  Modul {m.id}: {m.title.slice(0, 46)}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            maxLength={500}
            placeholder="Tulis pertanyaan, insight, atau pengalaman belajarmu..."
            className="w-full min-h-[86px] p-2.5 rounded-lg text-sm text-brown border resize-y outline-none leading-relaxed"
            style={{ ...BORDER, background: 'var(--bg3)' }}
          />
          <div className="flex items-center justify-between mt-2.5">
            <span className={`text-xs ${newPostContent.length > 450 ? 'text-red' : 'text-brown-3'}`}>
              {newPostContent.length} / 500
            </span>
            <button
              onClick={handleSubmitPost}
              disabled={posting}
              className="h-9 px-5 rounded-lg bg-terra text-white text-sm font-semibold disabled:opacity-50"
            >
              {posting ? '...' : 'Kirim'}
            </button>
          </div>
        </div>

        {/* Post list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-brown-3 text-sm gap-2">Memuat diskusi...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10 px-5 text-brown-3">
            <span className="flex justify-center mb-2.5">
              <IconChat size={32} />
            </span>
            <p className="text-sm leading-relaxed">
              Belum ada diskusi di sini.
              <br />
              Jadilah yang pertama memulai!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((p) => {
              const mod = modules.find((m) => m.id === p.moduleId)
              const modLabel = mod
                ? `Modul ${p.moduleId}: ${mod.title.split(' ').slice(0, 4).join(' ')}`
                : `Modul ${p.moduleId}`
              const isOpen = !!openReplies[p.id]
              const liked = !!likedPosts[p.id]

              return (
                <div key={p.id} className="bg-ivory rounded-xl border p-4" style={BORDER}>
                  <div className="flex items-start gap-2.5 mb-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: avatarColor(p.authorName) }}
                    >
                      {initials(p.authorName)}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-sm min-w-0">
                      <strong className="text-brown font-semibold">{p.authorName}</strong>
                      {p.authorRole === 'dosen' && (
                        <span
                          className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(143,162,135,.18)', color: 'var(--sage-d)' }}
                        >
                          Dosen
                        </span>
                      )}
                      <span
                        className="text-[11px] bg-cream border rounded-full px-2 py-0.5 font-semibold text-brown-2"
                        style={BORDER}
                      >
                        {modLabel}
                      </span>
                      <span className="text-xs text-brown-3">{timeAgo(p.createdAt)}</span>
                    </div>
                  </div>

                  <div className="text-sm leading-relaxed text-brown-2 mb-3 whitespace-pre-wrap break-words">
                    {p.content}
                  </div>

                  <div className="flex items-center gap-2 pt-2.5 border-t" style={BORDER}>
                    <button
                      onClick={() => handleLike(p.id)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 h-[30px] text-sm ${
                        liked ? 'font-semibold' : 'text-brown-3'
                      }`}
                      style={
                        liked
                          ? { background: 'rgba(212,163,115,.14)', borderColor: 'var(--terra)', color: 'var(--terra-d)' }
                          : BORDER
                      }
                    >
                      <IconThumbsUp size={14} /> {p.likes}
                    </button>
                    <button
                      onClick={() => setOpenReplies((o) => ({ ...o, [p.id]: !o[p.id] }))}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 h-[30px] text-sm ${
                        isOpen ? '' : 'text-brown-3'
                      }`}
                      style={
                        isOpen
                          ? { background: 'rgba(143,162,135,.14)', borderColor: 'var(--sage-d)', color: 'var(--sage-d)' }
                          : BORDER
                      }
                    >
                      <IconChat size={14} /> Balas{p.replies.length ? ` (${p.replies.length})` : ''}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t" style={BORDER}>
                      {p.replies.map((r) => (
                        <div key={r.id} className="flex gap-2.5 py-2.5 border-b last:border-b-0" style={BORDER}>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-px"
                            style={{ background: avatarColor(r.authorName) }}
                          >
                            {initials(r.authorName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-0.5 text-xs">
                              <strong className="text-brown font-semibold">{r.authorName}</strong>
                              {r.authorRole === 'dosen' && (
                                <span
                                  className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{ background: 'rgba(143,162,135,.18)', color: 'var(--sage-d)' }}
                                >
                                  Dosen
                                </span>
                              )}
                              <span className="text-brown-3">{timeAgo(r.createdAt)}</span>
                            </div>
                            <div className="text-sm leading-relaxed text-brown-2 whitespace-pre-wrap break-words">
                              {r.content}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <input
                          value={replyDrafts[p.id] || ''}
                          onChange={(e) => setReplyDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendReply(p.id)
                          }}
                          maxLength={300}
                          placeholder="Tulis balasan..."
                          className="flex-1 min-w-[140px] h-[38px] px-3 rounded-lg text-sm text-brown border outline-none"
                          style={{ ...BORDER, background: 'var(--bg3)' }}
                        />
                        <button
                          onClick={() => handleSendReply(p.id)}
                          disabled={!!sendingReply[p.id]}
                          className="h-[38px] px-3.5 rounded-lg text-sm font-semibold whitespace-nowrap disabled:opacity-50"
                          style={{ background: 'var(--brown)', color: 'var(--terra)' }}
                        >
                          Kirim
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl text-sm font-semibold z-[999]"
          style={{ background: 'var(--brown)', color: 'var(--terra)', boxShadow: '0 4px 20px rgba(0,0,0,.2)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}

export default Forum
