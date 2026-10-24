// Impor soal dari templat Excel di Bank Soal (antrean #329). Templat berkolom
// Pertanyaan, Opsi A sampai D, Kunci, Pembahasan, dan (khusus Tes Diagnostik
// Awal) Topik. Empat opsi mengikuti editor soal yang memang tetap empat opsi.
// exceljs dimuat saat modal impor dipakai saja, supaya halaman lain tidak ikut berat.

export const HURUF_OPSI = ['A', 'B', 'C', 'D'] as const

export interface DraftSoal {
  baris: number
  question: string
  options: string[]
  answer_idx: number
  explanation: string | null
  topik_id: number | null
}

export interface GalatBaris {
  baris: number
  pesan: string
}

type Bab = { id: number; title: string }

const KOLOM = {
  pertanyaan: 'Pertanyaan',
  opsi: HURUF_OPSI.map((h) => `Opsi ${h}`),
  kunci: 'Kunci',
  pembahasan: 'Pembahasan',
  topik: 'Topik',
}

export function kepalaTemplat(denganTopik: boolean): string[] {
  return [KOLOM.pertanyaan, ...KOLOM.opsi, KOLOM.kunci, KOLOM.pembahasan, ...(denganTopik ? [KOLOM.topik] : [])]
}

const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()

/**
 * Baris lembar kerja (baris pertama = kepala kolom) menjadi soal sah dan daftar galat.
 * Nomor baris mengikuti nomor baris Excel. Baris kosong seluruhnya dilewati.
 * Topik ditulis nomor Bab ("1", "Bab 1") atau judul Bab persis; kosong boleh.
 */
export function bacaBarisSoal(baris: unknown[][], opsi: { denganTopik: boolean; babList: Bab[] }): { sah: DraftSoal[]; galat: GalatBaris[] } {
  const sah: DraftSoal[] = []
  const galat: GalatBaris[] = []
  const kepala = (baris[0] ?? []).map((v) => norm(v).toLowerCase())
  const kol = (nama: string) => kepala.indexOf(nama.toLowerCase())
  const iTanya = kol(KOLOM.pertanyaan)
  const iOpsi = KOLOM.opsi.map(kol)
  const iKunci = kol(KOLOM.kunci)
  const iBahas = kol(KOLOM.pembahasan)
  const iTopik = kol(KOLOM.topik)
  const hilang = [KOLOM.pertanyaan, ...KOLOM.opsi, KOLOM.kunci].filter((n) => kol(n) < 0)
  if (hilang.length) return { sah, galat: [{ baris: 1, pesan: `Kolom tidak ditemukan: ${hilang.join(', ')}. Pakai templat dari tombol Unduh Templat.` }] }

  for (let r = 1; r < baris.length; r++) {
    const sel = baris[r] ?? []
    const ambil = (i: number) => (i < 0 ? '' : norm(sel[i]))
    if (sel.every((v) => !norm(v))) continue
    const nomor = r + 1
    const question = ambil(iTanya)
    const options = iOpsi.map(ambil)
    const kunciTeks = ambil(iKunci).toUpperCase()
    const pesan: string[] = []
    if (!question) pesan.push('Pertanyaan kosong')
    const kosong = options.flatMap((o, i) => (o ? [] : [HURUF_OPSI[i]]))
    if (kosong.length) pesan.push(`Opsi ${kosong.join(', ')} kosong`)
    let answer_idx = (HURUF_OPSI as readonly string[]).indexOf(kunciTeks)
    if (answer_idx < 0 && /^[1-4]$/.test(kunciTeks)) answer_idx = Number(kunciTeks) - 1
    if (answer_idx < 0) pesan.push(kunciTeks ? `Kunci "${kunciTeks}" bukan A, B, C, atau D` : 'Kunci kosong')
    let topik_id: number | null = null
    const topikTeks = opsi.denganTopik ? ambil(iTopik) : ''
    if (topikTeks) {
      const n = topikTeks.match(/^(?:bab\s*)?(\d+)$/i)
      const bab = n ? opsi.babList[Number(n[1]) - 1] : opsi.babList.find((b) => norm(b.title).toLowerCase() === topikTeks.toLowerCase())
      if (bab) topik_id = bab.id
      else pesan.push(`Topik "${topikTeks}" tidak dikenal`)
    }
    if (pesan.length) galat.push({ baris: nomor, pesan: pesan.join('; ') })
    else sah.push({ baris: nomor, question, options, answer_idx, explanation: ambil(iBahas) || null, topik_id })
  }
  return { sah, galat }
}

/** Berkas .xlsx templat: lembar "Soal" (kepala + satu contoh) dan lembar "Petunjuk". */
export async function buatTemplat(denganTopik: boolean, babList: Bab[]): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Soal')
  const kepala = kepalaTemplat(denganTopik)
  ws.addRow(kepala).font = { bold: true }
  ws.addRow([
    'Contoh: Penelitian yang menghasilkan produk lalu menguji keefektifannya disebut ...',
    'Penelitian kuantitatif',
    'Penelitian kualitatif',
    'Penelitian dan pengembangan (R&D)',
    'Penelitian tindakan kelas',
    'C',
    'R&D menghasilkan produk dan menguji keefektifannya. Hapus baris contoh ini sebelum mengimpor.',
    ...(denganTopik ? ['1'] : []),
  ])
  ws.columns.forEach((c, i) => (c.width = i === 0 ? 60 : i === 6 ? 40 : 24))
  ws.getColumn(1).alignment = { wrapText: true, vertical: 'top' }
  for (let r = 2; r <= 300; r++) ws.getCell(r, 6).dataValidation = { type: 'list', allowBlank: true, formulae: ['"A,B,C,D"'] }

  const pt = wb.addWorksheet('Petunjuk')
  const petunjuk = [
    'Petunjuk impor soal SMART-FLIP',
    '1. Isi satu soal per baris di lembar "Soal", mulai baris 2. Jangan ubah nama kolom di baris 1.',
    '2. Opsi A sampai D wajib diisi semua. Kunci diisi huruf A, B, C, atau D.',
    '3. Pembahasan boleh dikosongkan.',
    ...(denganTopik ? ['4. Topik diisi nomor Bab (mis. 1) atau judul Bab persis. Boleh dikosongkan.', '', 'Daftar Bab:', ...babList.map((b, i) => `${i + 1} = ${b.title}`)] : []),
    '',
    'Hapus baris contoh sebelum mengimpor. Jenis tes dan Bab mengikuti pilihan yang aktif di Bank Soal saat mengimpor.',
  ]
  petunjuk.forEach((t) => pt.addRow([t]))
  pt.getRow(1).font = { bold: true }
  pt.getColumn(1).width = 100
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/** Lembar pertama berkas .xlsx menjadi larik baris berisi teks sel. */
export async function bacaBerkasXlsx(file: File): Promise<unknown[][]> {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.worksheets[0]
  if (!ws) return []
  const hasil: unknown[][] = []
  ws.eachRow({ includeEmpty: true }, (row, nomor) => {
    const sel: unknown[] = []
    row.eachCell({ includeEmpty: true }, (cell, k) => (sel[k - 1] = cell.text))
    hasil[nomor - 1] = sel
  })
  return Array.from(hasil, (b) => b ?? [])
}
