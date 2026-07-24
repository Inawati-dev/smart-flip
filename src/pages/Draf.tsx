import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../hooks/useModules'
import { useDrafts } from '../hooks/useDraf'
import {
  submitDraft,
  addDraftComment,
  updateDraftStatus,
  formatDraftDate,
  STATUS_LABEL,
  STATUS_BADGE,
  type DraftStatus,
} from '../lib/draf'
import { Layout } from '../components/Layout'
import { Select } from '../components/Select'
import { IconDocument, IconChat } from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const
const FILTERS: Array<{ key: 'all' | DraftStatus; label: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'submitted', label: 'Menunggu Review' },
  { key: 'reviewed', label: 'Sudah Direview' },
  { key: 'revision', label: 'Perlu Revisi' },
]

export function Draf() {
  const { profile, role } = useAuth()
  const queryClient = useQueryClient()
  const isDosen = role === 'dosen'

  const { data: modules = [] } = useModules()
  const [filter, setFilter] = useState<'all' | DraftStatus>('all')
  const { data: drafts = [], isLoading } = useDrafts(isDosen)

  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [sendingComment, setSendingComment] = useState<Record<string, boolean>>({})

  const [modalOpen, setModalOpen] = useState(false)
  const [newModuleId, setNewModuleId] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const authorName = profile?.full_name || 'Mahasiswa'

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }

  async function refetchDrafts() {
    await queryClient.invalidateQueries({ queryKey: ['drafts'] })
  }

  function openDraftModal() {
    setNewModuleId(modules[0]?.id ?? null)
    setNewTitle('')
    setNewContent('')
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmitDraft() {
    const title = newTitle.trim()
    const content = newContent.trim()
    if (!title || !content) {
      setFormError('Judul dan konten wajib diisi.')
      return
    }
    if (!newModuleId) return
    const mod = modules.find((m) => m.id === newModuleId)
    setSubmitting(true)
    try {
      await submitDraft({
        moduleId: newModuleId,
        moduleName: mod?.title || `Modul ${newModuleId}`,
        authorName,
        title,
        content,
      })
      setModalOpen(false)
      await refetchDrafts()
      showToast('Draf berhasil dikirim!')
    } catch {
      setFormError('Gagal mengirim draf. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSendComment(draftId: string) {
    const text = (commentDrafts[draftId] || '').trim()
    if (!text) return
    setSendingComment((s) => ({ ...s, [draftId]: true }))
    try {
      await addDraftComment(draftId, { text, authorName, authorRole: isDosen ? 'dosen' : 'mahasiswa' })
      setCommentDrafts((d) => ({ ...d, [draftId]: '' }))
      await refetchDrafts()
      setOpenComments((o) => ({ ...o, [draftId]: true }))
    } catch {
      // ported from legacy/draf.html: comment failures only console.warn, no user-facing error
    } finally {
      setSendingComment((s) => ({ ...s, [draftId]: false }))
    }
  }

  async function handleStatusChange(draftId: string, status: DraftStatus) {
    try {
      await updateDraftStatus(draftId, status)
      await refetchDrafts()
    } catch {
      // ported from legacy/draf.html: status update failures only console.warn
    }
  }

  const filtered = filter === 'all' ? drafts : drafts.filter((d) => d.status === filter)

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <h1 className="font-display text-2xl font-bold text-brown mb-1">
          {isDosen ? 'Asistensi Draf Mahasiswa' : 'Draf Saya'}
        </h1>
        <p className="text-brown-3 mb-4">{drafts.length} draf</p>

        {/* Filter tabs + New Draft button */}
        <div className="flex gap-2 flex-wrap items-center mb-4">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`min-h-11 md:h-8 px-3.5 rounded-full text-xs border whitespace-nowrap ${
                filter === f.key ? 'bg-terra text-white border-terra' : 'text-brown-3'
              }`}
              style={filter === f.key ? undefined : BORDER}
            >
              {f.label}
            </button>
          ))}
          {!isDosen && (
            <button
              onClick={openDraftModal}
              className="ml-auto min-h-11 px-4 rounded-full text-sm font-semibold whitespace-nowrap"
              style={{ background: 'var(--brown)', color: 'var(--terra)' }}
            >
              + Draf Baru
            </button>
          )}
        </div>

        {/* Draft list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-brown-3 text-sm gap-2">Memuat draf...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 px-4 text-brown-3">
            <span className="flex justify-center mb-2.5"><IconDocument size={40} /></span>
            <p className="text-sm leading-relaxed">
              {filter !== 'all'
                ? 'Tidak ada draf dengan status ini.'
                : isDosen
                  ? 'Belum ada draf mahasiswa yang masuk.'
                  : 'Belum ada draf. Klik "+ Draf Baru" untuk mulai.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((d) => {
              const isOpen = !!openComments[d.id]
              const badge = STATUS_BADGE[d.status]
              const preview = d.content.length > 140 ? d.content.slice(0, 140) + '...' : d.content

              return (
                <div key={d.id} className="bg-ivory rounded-2xl border overflow-hidden" style={BORDER}>
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-brown leading-tight">{d.title}</div>
                      <div className="text-xs text-brown-3 mt-1">
                        {d.moduleName} &middot; v{d.version} &middot; {formatDraftDate(d.submittedAt)}
                      </div>
                      {isDosen && <div className="text-xs text-terra font-medium mt-0.5">oleh {d.authorName}</div>}
                    </div>
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {STATUS_LABEL[d.status]}
                    </span>
                  </div>

                  <div
                    className="px-4 pb-3 text-sm text-brown-2 leading-relaxed border-b whitespace-pre-wrap break-words"
                    style={BORDER}
                  >
                    {preview}
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap p-3">
                    <button
                      onClick={() => setOpenComments((o) => ({ ...o, [d.id]: !o[d.id] }))}
                      className="inline-flex items-center gap-1.5 min-h-11 text-xs text-brown-3 px-2 py-1 rounded-md"
                    >
                      <IconChat size={14} /> {d.comments.length} Komentar
                    </button>
                    {isDosen && (
                      <Select
                        value={d.status}
                        onChange={(v) => handleStatusChange(d.id, v as DraftStatus)}
                        className="ml-auto h-9 md:h-[30px] px-2.5 rounded-lg border text-sm md:text-xs text-brown-2 outline-none cursor-pointer"
                        style={{ ...BORDER, background: 'var(--bg3)' }}
                        options={[
                          { value: 'submitted', label: 'Menunggu Review' },
                          { value: 'reviewed', label: 'Sudah Direview' },
                          { value: 'revision', label: 'Perlu Revisi' },
                        ]}
                      />
                    )}
                  </div>

                  {isOpen && (
                    <div className="border-t p-4" style={BORDER}>
                      <div className="flex flex-col gap-2.5 mb-3">
                        {d.comments.length === 0 ? (
                          <div className="text-xs text-brown-3 py-1">Belum ada komentar.</div>
                        ) : (
                          d.comments.map((c) => (
                            <div
                              key={c.id}
                              className="flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border-l-[3px]"
                              style={{
                                background: c.authorRole === 'dosen' ? '#FEF9F4' : '#F4F7F3',
                                borderLeftColor: c.authorRole === 'dosen' ? 'var(--terra)' : 'var(--sage)',
                              }}
                            >
                              <div className="flex items-center flex-wrap gap-2">
                                <strong className="text-sm text-brown font-semibold">{c.authorName}</strong>
                                {c.authorRole === 'dosen' && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-terra text-white">
                                    Dosen
                                  </span>
                                )}
                                <span className="text-xs text-brown-3">{formatDraftDate(c.createdAt)}</span>
                              </div>
                              <p className="text-sm text-brown-2 leading-relaxed whitespace-pre-wrap break-words">
                                {c.text}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex gap-2 items-end">
                        <textarea
                          value={commentDrafts[d.id] || ''}
                          onChange={(e) => setCommentDrafts((c) => ({ ...c, [d.id]: e.target.value }))}
                          rows={2}
                          placeholder="Tulis komentar..."
                          className="flex-1 min-h-[54px] p-2.5 rounded-lg border text-sm text-brown resize-y outline-none"
                          style={{ ...BORDER, background: 'var(--bg3)' }}
                        />
                        <button
                          onClick={() => handleSendComment(d.id)}
                          disabled={!!sendingComment[d.id]}
                          className="min-h-11 px-3.5 rounded-lg text-sm font-semibold whitespace-nowrap disabled:opacity-50"
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

      {/* New Draft modal (mahasiswa only) */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.45)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 w-full max-w-[480px] max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: '0 16px 48px rgba(44,36,32,.2)', animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="font-display text-lg font-semibold text-brown mb-4">Kirim Draf Baru</h3>

            <label className="block text-xs font-semibold text-brown-2 mb-3">
              Modul
              <Select
                value={String(newModuleId ?? '')}
                onChange={(v) => setNewModuleId(Number(v))}
                className="block w-full mt-1 h-11 md:h-10 rounded-lg border px-3 text-sm text-brown"
                style={{ ...BORDER, background: 'var(--bg3)' }}
                options={modules.map((m) => ({ value: String(m.id), label: `${m.id}. ${m.title}` }))}
              />
            </label>

            <label className="block text-xs font-semibold text-brown-2 mb-3">
              Judul
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={120}
                placeholder="Judul draf..."
                className="block w-full mt-1 h-11 md:h-10 rounded-lg border px-3 text-sm text-brown"
                style={{ ...BORDER, background: 'var(--bg3)' }}
              />
            </label>

            <label className="block text-xs font-semibold text-brown-2 mb-3">
              Konten / Ringkasan
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={5}
                placeholder="Tulis konten draf atau ringkasan..."
                className="block w-full mt-1 rounded-lg border px-3 py-2.5 text-sm text-brown resize-y min-h-[90px]"
                style={{ ...BORDER, background: 'var(--bg3)' }}
              />
            </label>

            {formError && <p className="text-xs text-red mb-3">{formError}</p>}

            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 min-h-11 rounded-lg border text-sm text-brown-2"
                style={BORDER}
              >
                Batal
              </button>
              <button
                onClick={handleSubmitDraft}
                disabled={submitting}
                className="flex-[2] min-h-11 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--brown)', color: 'var(--terra)' }}
              >
                {submitting ? 'Mengirim...' : 'Kirim Draf'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 px-5 py-2.5 rounded-xl text-sm font-semibold z-[999]"
          style={{ background: 'var(--brown)', color: 'var(--terra)', boxShadow: '0 4px 20px rgba(0,0,0,.2)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}

export default Draf
