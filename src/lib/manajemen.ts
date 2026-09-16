import { supabase, isSupabaseConfigured } from './supabase'

// Mirrors legacy/data-layer.js's "MANAJEMEN MODUL" section (saveModulCustom /
// getModulCustom / saveModulOrder / getModulOrder) — dosen edits module
// metadata & order directly against the `modules` table, same dual-mode
// (Supabase when configured, else localStorage) fallback as forum.ts/profil.ts.

export type ModulStatus = 'aktif' | 'draf' | 'terkunci' | 'nonaktif'

export interface ModulCustom {
  judul?: string
  deskripsi?: string
  status?: ModulStatus
  durasi?: string
  catatan?: string
  updatedAt?: string
  pdfPath?: string
}

const CUSTOM_KEY_PREFIX = 'sfp_modul_custom_'
const ORDER_KEY = 'sfp_modul_order'
const VIDEO_URL_KEY_PREFIX = 'sfp_video_url_'

function customKey(moduleId: number): string {
  return CUSTOM_KEY_PREFIX + moduleId
}

function videoUrlKey(moduleId: number): string {
  return VIDEO_URL_KEY_PREFIX + moduleId
}

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
    // ignore quota/serialization errors, matches legacy/data-layer.js lsSet behavior
  }
}

// Mirrors legacy/data-layer.js saveModulCustom(). Note a legacy quirk preserved
// here on purpose: the Supabase write only distinguishes is_active by
// `status !== 'nonaktif'`, so 'draf' and 'terkunci' both persist as
// is_active: true — the aktif/draf/terkunci distinction only round-trips
// through localStorage, never through Supabase's is_active boolean.
export async function saveModulCustom(moduleId: number, data: ModulCustom): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const update: Record<string, unknown> = {
        title: data.judul,
        description: data.deskripsi,
        is_active: data.status !== 'nonaktif',
      }
      if (data.pdfPath) update.pdf_path = data.pdfPath
      const { error } = await supabase.from('modules').update(update).eq('id', moduleId)
      if (error) throw error
      return
    } catch (e) {
      console.warn('[manajemen] saveModulCustom → Supabase gagal, fallback localStorage:', e)
    }
  }
  lsSet(customKey(moduleId), data)
}

// Dosen sets the pemutar URL for a module (spec §5.1, §9 WP4). Same
// dual-mode fallback as saveModulCustom above: Supabase when configured,
// else localStorage keyed by module id so the "Ubah" modal still works in
// demo mode even though (like saveModulCustom's other localStorage-only
// fields) it won't be read back into fetchModules() there.
export async function saveVideoUrl(moduleId: number, url: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('modules').update({ video_url: url }).eq('id', moduleId)
      if (error) throw error
      return
    } catch (e) {
      console.warn('[manajemen] saveVideoUrl → Supabase gagal, fallback localStorage:', e)
    }
  }
  lsSet(videoUrlKey(moduleId), url)
}

// Creates a brand-new module row (dosen-only, gated by the same RLS as
// saveModulCustom's UPDATE). Demo/localStorage mode has no modules dataset
// to append to (fetchModules() always returns [] when Supabase isn't
// configured — see src/lib/modules.ts) so there's nowhere for a new module
// to persist there; callers should check isSupabaseConfigured and show a
// "butuh koneksi Supabase" message instead of calling this in demo mode —
// and this function self-guards with the same throw in case a future caller
// forgets to, rather than trusting the caller (unlike uploadModulPdf, which
// *can* fall back to a local-only object URL, there's genuinely nowhere for a
// brand-new module to live in demo mode, so a clear throw is the honest match).
export async function createModul(data: {
  judul: string
  deskripsi: string
  orderNum: number
  status?: ModulStatus
  durasi?: string
  catatan?: string
  /** Mata kuliah (v23). Tanpa ini DB memakai bawaan 1. */
  courseId?: number
}): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('createModul membutuhkan koneksi Supabase — tidak tersedia di mode demo.')
  }
  const { data: inserted, error } = await supabase
    .from('modules')
    .insert({
      title: data.judul,
      description: data.deskripsi,
      order_num: data.orderNum,
      ...(data.courseId != null ? { course_id: data.courseId } : {}),
      // Mirrors saveModulCustom's is_active mapping below so a freshly created
      // module respects the Status the dosen picked, instead of always
      // landing is_active:true regardless of what the form said.
      is_active: data.status !== 'nonaktif',
    })
    .select('id')
    .single()
  if (error) throw error

  // durasi/catatan have no backing column on `modules` (see saveModulCustom's
  // comment above — they only ever round-trip through localStorage). Stash
  // them locally keyed to the new row's id using the exact same mechanism, so
  // create and edit are at least consistent in *what* gets captured, even
  // though (like the edit path) they won't be read back while Supabase reads
  // for this module keep succeeding — that's a pre-existing limitation of the
  // schema, not something a create/edit-path fix alone can close.
  if ((data.durasi || data.catatan) && inserted) {
    lsSet(customKey(inserted.id as number), { durasi: data.durasi, catatan: data.catatan })
  }
}

// Sama seperti createModul di atas, tapi mengembalikan id baris baru —
// dipakai alur Tambah Modul + PDF (ModulList.tsx, antrean #43) yang perlu id
// modul sebelum bisa memanggil uploadModulPdf. createModul lama tidak diubah
// supaya pemanggil existing tidak kena efek samping.
export async function createModulReturningId(data: {
  judul: string
  deskripsi: string
  orderNum: number
  status?: ModulStatus
  durasi?: string
  catatan?: string
  /** Mata kuliah (v23). Tanpa ini DB memakai bawaan 1. */
  courseId?: number
}): Promise<number> {
  if (!isSupabaseConfigured) {
    throw new Error('createModulReturningId membutuhkan koneksi Supabase — tidak tersedia di mode demo.')
  }
  const { data: inserted, error } = await supabase
    .from('modules')
    .insert({
      title: data.judul,
      description: data.deskripsi,
      order_num: data.orderNum,
      ...(data.courseId != null ? { course_id: data.courseId } : {}),
      is_active: data.status !== 'nonaktif',
    })
    .select('id')
    .single()
  if (error) throw error
  const id = inserted.id as number
  if (data.durasi || data.catatan) {
    lsSet(customKey(id), { durasi: data.durasi, catatan: data.catatan })
  }
  return id
}

// Nama file Storage dari sebuah public URL `modul-pdf`. Mengembalikan null
// untuk URL di luar bucket ini (mis. blob: dari mode demo, atau path statis
// /books/... bawaan repo) supaya pemanggil tidak pernah salah menghapus.
function storageObjectName(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null
  const marker = '/storage/v1/object/public/modul-pdf/'
  const i = publicUrl.indexOf(marker)
  if (i === -1) return null
  const name = publicUrl.slice(i + marker.length).split('?')[0]
  return name ? decodeURIComponent(name) : null
}

// Hapus modul beserta file PDF-nya di Storage.
//
// Tabel turunan (user_progress, quiz_questions, quiz_attempts, forum_posts,
// workshop_content) sudah ON DELETE CASCADE di schema, jadi ikut terhapus
// sendiri. `drafts.module_id` SENGAJA tanpa cascade — draf mahasiswa adalah
// karya mereka, tidak boleh lenyap diam-diam gara-gara dosen merapikan daftar
// modul. Postgres akan menolak delete-nya (kode 23503); kita terjemahkan jadi
// pesan yang bisa ditindaklanjuti alih-alih melempar error mentah.
export async function deleteModul(moduleId: number): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('deleteModul membutuhkan koneksi Supabase — tidak tersedia di mode demo.')
  }

  // Ambil pdf_path SEBELUM baris hilang, supaya file Storage-nya bisa ikut
  // dibersihkan dan tidak menumpuk jadi orphan di bucket.
  const { data: row } = await supabase
    .from('modules')
    .select('pdf_path')
    .eq('id', moduleId)
    .maybeSingle()

  const { error } = await supabase.from('modules').delete().eq('id', moduleId)
  if (error) {
    if (error.code === '23503') {
      throw new Error(
        'Modul ini masih dipakai draf mahasiswa, jadi tidak bisa dihapus. Nonaktifkan modul lewat Status kalau hanya ingin menyembunyikannya.',
      )
    }
    throw error
  }

  const objectName = storageObjectName(row?.pdf_path as string | undefined)
  if (objectName) {
    try {
      await supabase.storage.from('modul-pdf').remove([objectName])
    } catch (cleanupError) {
      // Baris DB sudah hilang — kegagalan bersih-bersih file jangan sampai
      // memunculkan error seolah penghapusan modulnya gagal.
      console.warn('[manajemen] deleteModul → gagal menghapus PDF di Storage:', cleanupError)
    }
  }

  try {
    localStorage.removeItem(customKey(moduleId))
  } catch {
    // ignore
  }
}

// Upload a dosen-provided PDF to the public `modul-pdf` Storage bucket (see
// database/migration_v3_modul_pdf_storage.sql) and point the module's
// pdf_path at the resulting public URL. Demo/localStorage mode has no
// Storage backend, so it just stores the override locally instead — the
// file itself never leaves the browser in that mode.
export async function uploadModulPdf(moduleId: number, file: File): Promise<string> {
  if (isSupabaseConfigured) {
    // Nama file lama dicatat dulu: setiap upload memakai path ber-timestamp
    // baru, jadi tanpa pembersihan ini file versi sebelumnya menumpuk
    // selamanya di bucket dan muncul terus di daftar "pakai file yang sudah
    // ada" walau tidak ada modul yang memakainya lagi.
    const { data: prevRow } = await supabase
      .from('modules')
      .select('pdf_path')
      .eq('id', moduleId)
      .maybeSingle()
    const prevObject = storageObjectName(prevRow?.pdf_path as string | undefined)

    const path = `modul-${moduleId}-${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('modul-pdf')
      .upload(path, file, { upsert: true, contentType: 'application/pdf' })
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('modul-pdf').getPublicUrl(path)
    const { error: updateError } = await supabase
      .from('modules')
      .update({ pdf_path: data.publicUrl })
      .eq('id', moduleId)
    if (updateError) {
      // Storage upload succeeded but the DB link failed — the file would
      // otherwise sit orphaned in Storage with nothing pointing at it. Best
      // effort cleanup: a failure here must not mask the real (updateError)
      // failure the caller needs to see.
      try {
        await supabase.storage.from('modul-pdf').remove([path])
      } catch (cleanupError) {
        console.warn('[manajemen] uploadModulPdf → gagal membersihkan file orphan setelah update DB gagal:', cleanupError)
      }
      throw updateError
    }
    // Modul sudah menunjuk file baru — file lama kini yatim, buang.
    // Dilindungi guard `!== path` supaya re-upload dengan nama identik
    // (secara teori mustahil karena timestamp, tapi murah untuk dijaga)
    // tidak menghapus file yang baru saja diunggah.
    if (prevObject && prevObject !== path) {
      try {
        await supabase.storage.from('modul-pdf').remove([prevObject])
      } catch (cleanupError) {
        console.warn('[manajemen] uploadModulPdf → gagal menghapus PDF lama:', cleanupError)
      }
    }
    return data.publicUrl
  }
  // Demo mode: no Storage backend — keep the override local only.
  const objectUrl = URL.createObjectURL(file)
  const existing = lsGet<ModulCustom>(customKey(moduleId)) ?? {}
  lsSet(customKey(moduleId), { ...existing, pdfPath: objectUrl })
  return objectUrl
}

// Nama file Storage dari sebuah public URL `modul-video`. Sama pola dengan
// storageObjectName di atas, bucket berbeda — dipertahankan terpisah alih-alih
// menambah parameter bucket ke fungsi lama supaya uploadModulPdf tidak ikut
// tersentuh (spec: berkas ini tidak boleh mengubah fungsi yang sudah ada).
function videoStorageObjectName(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null
  const marker = '/storage/v1/object/public/modul-video/'
  const i = publicUrl.indexOf(marker)
  if (i === -1) return null
  const name = publicUrl.slice(i + marker.length).split('?')[0]
  return name ? decodeURIComponent(name) : null
}

// Upload a dosen-provided video file to the public `modul-video` Storage
// bucket (see database/migration_v21_modul_video_storage.sql) and point the
// module's video_url at the resulting public URL. Mirrors uploadModulPdf's
// shape exactly (old-file cleanup, orphan cleanup on DB-update failure,
// demo-mode local-only fallback), just against modules.video_url instead of
// pdf_path, and keyed under the same videoUrlKey() localStorage slot that
// saveVideoUrl's demo-mode fallback already uses.
export async function uploadModulVideo(moduleId: number, file: File): Promise<string> {
  if (isSupabaseConfigured) {
    const { data: prevRow } = await supabase
      .from('modules')
      .select('video_url')
      .eq('id', moduleId)
      .maybeSingle()
    const prevObject = videoStorageObjectName(prevRow?.video_url as string | undefined)

    const ext = file.type === 'video/webm' ? 'webm' : 'mp4'
    const path = `modul-${moduleId}-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('modul-video')
      .upload(path, file, { upsert: true, contentType: file.type || 'video/mp4' })
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('modul-video').getPublicUrl(path)
    const { error: updateError } = await supabase
      .from('modules')
      .update({ video_url: data.publicUrl })
      .eq('id', moduleId)
    if (updateError) {
      try {
        await supabase.storage.from('modul-video').remove([path])
      } catch (cleanupError) {
        console.warn('[manajemen] uploadModulVideo → gagal membersihkan file orphan setelah update DB gagal:', cleanupError)
      }
      throw updateError
    }
    if (prevObject && prevObject !== path) {
      try {
        await supabase.storage.from('modul-video').remove([prevObject])
      } catch (cleanupError) {
        console.warn('[manajemen] uploadModulVideo → gagal menghapus video lama:', cleanupError)
      }
    }
    return data.publicUrl
  }
  // Demo mode: no Storage backend — keep the override local only, under the
  // same key saveVideoUrl's demo-mode fallback reads.
  const objectUrl = URL.createObjectURL(file)
  lsSet(videoUrlKey(moduleId), objectUrl)
  return objectUrl
}

export interface ModulPdfFile {
  name: string
  url: string
  updatedAt: string | null
  /** Judul modul yang sedang memakai file ini, atau null kalau tidak dipakai siapa pun. */
  usedBy: string | null
}

// Lists every file sitting in the `modul-pdf` bucket, including ones no
// module currently points at (e.g. a PDF uploaded for a module that was
// later deleted/re-created, or uploaded ahead of time). Lets a dosen reuse
// an already-uploaded file for another module instead of uploading the
// exact same PDF twice. Not available in demo mode -- there's no Storage
// backend to list.
export async function listModulPdfFiles(): Promise<ModulPdfFile[]> {
  if (!isSupabaseConfigured) return []
  const [listRes, modulesRes] = await Promise.all([
    supabase.storage.from('modul-pdf').list('', {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' },
    }),
    supabase.from('modules').select('title, pdf_path'),
  ])
  if (listRes.error) throw listRes.error

  // Peta nama-objek → judul modul pemakainya, supaya file yatim (sisa upload
  // lama yang sudah tidak ditunjuk modul mana pun) bisa dibedakan di UI.
  const usedBy = new Map<string, string>()
  for (const m of modulesRes.data ?? []) {
    const name = storageObjectName((m as { pdf_path?: string }).pdf_path)
    if (name) usedBy.set(name, (m as { title?: string }).title || 'Tanpa judul')
  }

  return (listRes.data || [])
    .filter((f) => {
      if (!f.name.toLowerCase().endsWith('.pdf')) return false
      // Supabase menyisakan baris placeholder 0-byte untuk folder kosong dan
      // untuk sebagian upload yang gagal di tengah jalan — keduanya bukan PDF
      // yang bisa dibuka, jadi jangan ditawarkan.
      const size = (f.metadata as { size?: number } | null)?.size
      return size == null || size > 0
    })
    .map((f) => ({
      name: f.name,
      url: supabase.storage.from('modul-pdf').getPublicUrl(f.name).data.publicUrl,
      updatedAt: f.updated_at ?? null,
      usedBy: usedBy.get(f.name) ?? null,
    }))
}

// Points a module at an already-uploaded file (picked via listModulPdfFiles)
// instead of uploading a new one — just a metadata update, no Storage write.
export async function assignModulPdf(moduleId: number, url: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('assignModulPdf membutuhkan koneksi Supabase — tidak tersedia di mode demo.')
  }
  const { error } = await supabase.from('modules').update({ pdf_path: url }).eq('id', moduleId)
  if (error) throw error
}

// Hapus satu berkas di bucket `modul-pdf` (dipanggil dari /akun/pdf, WP-C).
// Beda dari deleteModul: ini menghapus BERKAS, bukan baris modul — kalau ada
// modul yang masih menunjuk ke berkas ini, pdf_path modul itu dikosongkan
// dulu supaya tidak menyisakan tautan ke berkas yang sudah tidak ada.
export async function deleteModulPdfFile(path: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('deleteModulPdfFile membutuhkan koneksi Supabase — tidak tersedia di mode demo.')
  }
  const { data: modulesRes } = await supabase.from('modules').select('id, pdf_path')
  const usedByIds = (modulesRes ?? [])
    .filter((m) => storageObjectName((m as { pdf_path?: string }).pdf_path) === path)
    .map((m) => (m as { id: number }).id)

  const { error } = await supabase.storage.from('modul-pdf').remove([path])
  if (error) throw error

  if (usedByIds.length) {
    await supabase.from('modules').update({ pdf_path: null }).in('id', usedByIds)
  }
}

// Mirrors legacy/data-layer.js getModulCustom(). In Supabase mode only
// judul/deskripsi/status (aktif|nonaktif) come back — durasi/catatan have no
// backing columns and are only ever available via the localStorage fallback.
export async function getModulCustom(moduleId: number): Promise<ModulCustom | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('title, description, is_active')
        .eq('id', moduleId)
        .single()
      if (error) throw error
      if (data) {
        const row = data as { title?: string; description?: string; is_active?: boolean }
        return { judul: row.title, deskripsi: row.description, status: row.is_active ? 'aktif' : 'nonaktif' }
      }
    } catch (e) {
      console.warn('[manajemen] getModulCustom → Supabase gagal, fallback localStorage:', e)
    }
  }
  return lsGet<ModulCustom>(customKey(moduleId))
}

// Batched convenience wrapper (not a legacy DataLayer method) mirroring
// legacy/manajemen.html renderTable()'s `customMap` prefetch: Promise.all
// over every module id so the table can render synchronously from one fetch.
export async function getModulCustomMap(moduleIds: number[]): Promise<Record<number, ModulCustom | null>> {
  const entries = await Promise.all(moduleIds.map(async (id) => [id, await getModulCustom(id)] as const))
  return Object.fromEntries(entries)
}

// Mirrors legacy/data-layer.js saveModulOrder(), with two deliberate
// deviations from a naive "fire N parallel UPDATEs" implementation:
//
// 1. `modules.order_num` has a hard UNIQUE constraint (database/schema.sql).
//    Firing all target order_num updates in parallel is a real, reliably
//    reproducible race: e.g. swapping modules A (3->1) and B (1->3), A's
//    UPDATE can try to commit order_num=1 while B's row still holds it (each
//    Supabase .update() call is its own independent transaction, so there's
//    no shared transaction to defer the UNIQUE check within) -> Postgres
//    rejects it with a unique-violation. This is the actual, confirmed cause
//    of the "Gagal menyimpan urutan" failures seen in production, not a
//    transient/flaky backend issue. Fixed with a two-phase move: first push
//    every affected row to a temporary NEGATIVE order_num (guaranteed to
//    never collide with the 1..N positive range or with each other, since
//    they're keyed by index), then set every row to its real final
//    order_num — by the time phase 2 runs, none of the target positive
//    values are still occupied by anything in this reorder set (the array
//    always contains every module, see Manajemen.tsx's `order` derivation).
// 2. Still uses Promise.allSettled (not Promise.all) within each phase and
//    reports back exactly which module ids failed, so the caller can roll
//    back its optimistic UI instead of displaying an order that doesn't
//    match what's actually saved.
export async function saveModulOrder(order: number[]): Promise<void> {
  if (isSupabaseConfigured) {
    const phase1 = await Promise.allSettled(
      order.map((moduleId, i) => supabase.from('modules').update({ order_num: -(i + 1) }).eq('id', moduleId)),
    )
    const phase1Failed = phase1.some((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error))
    if (phase1Failed) {
      throw new Error('saveModulOrder: gagal pada tahap penempatan sementara')
    }

    const phase2 = await Promise.allSettled(
      order.map((moduleId, i) => supabase.from('modules').update({ order_num: i + 1 }).eq('id', moduleId)),
    )
    const failedIds: number[] = []
    phase2.forEach((r, i) => {
      if (r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)) failedIds.push(order[i])
    })
    if (failedIds.length === 0) return
    throw new Error(`saveModulOrder: gagal menyimpan order_num untuk modul id ${failedIds.join(', ')}`)
  }
  lsSet(ORDER_KEY, order)
}

// Mirrors legacy/data-layer.js getModulOrder().
export async function getModulOrder(): Promise<number[] | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('modules').select('id').order('order_num')
      if (error) throw error
      if (data && data.length) return data.map((m) => m.id as number)
    } catch (e) {
      console.warn('[manajemen] getModulOrder → Supabase gagal, fallback localStorage:', e)
    }
  }
  return lsGet<number[]>(ORDER_KEY)
}

// ── Berkas video di bucket `modul-video` (antrean #56) ──
// Cermin dari listModulPdfFiles/deleteModulPdfFile untuk halaman Berkas tab
// Video. Memakai videoStorageObjectName di atas.
export interface ModulVideoFile {
  name: string
  url: string
  updatedAt: string | null
  sizeBytes: number | null
  /** Judul topik yang sedang memakai berkas ini, atau null bila belum terpakai. */
  usedBy: string | null
}

export async function listModulVideoFiles(): Promise<ModulVideoFile[]> {
  if (!isSupabaseConfigured) return []
  const [listRes, modulesRes] = await Promise.all([
    supabase.storage.from('modul-video').list('', {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' },
    }),
    supabase.from('modules').select('title, video_url'),
  ])
  if (listRes.error) {
    // Bucket belum dibuat (migrasi v21 belum jalan): tampilkan kosong, jangan crash.
    if (/not found|does not exist/i.test(listRes.error.message)) return []
    throw listRes.error
  }
  const usedBy = new Map<string, string>()
  for (const m of modulesRes.data ?? []) {
    const name = videoStorageObjectName((m as { video_url?: string }).video_url)
    if (name) usedBy.set(name, (m as { title?: string }).title || 'Tanpa judul')
  }
  return (listRes.data || [])
    .filter((f) => {
      if (!/\.(mp4|webm)$/i.test(f.name)) return false
      const size = (f.metadata as { size?: number } | null)?.size
      return size == null || size > 0
    })
    .map((f) => ({
      name: f.name,
      url: supabase.storage.from('modul-video').getPublicUrl(f.name).data.publicUrl,
      updatedAt: f.updated_at ?? null,
      sizeBytes: (f.metadata as { size?: number } | null)?.size ?? null,
      usedBy: usedBy.get(f.name) ?? null,
    }))
}

export async function deleteModulVideoFile(path: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('deleteModulVideoFile membutuhkan koneksi Supabase, tidak tersedia di mode demo.')
  }
  const { data: modulesRes } = await supabase.from('modules').select('id, video_url')
  const usedByIds = (modulesRes ?? [])
    .filter((m) => videoStorageObjectName((m as { video_url?: string }).video_url) === path)
    .map((m) => (m as { id: number }).id)
  const { error } = await supabase.storage.from('modul-video').remove([path])
  if (error) throw error
  if (usedByIds.length) {
    await supabase.from('modules').update({ video_url: null }).in('id', usedByIds)
  }
}
