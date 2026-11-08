// Membangun Sebelum-Sesudah-UI.docx dari daftar.json dan gambar/ (antrean #361, 8 Nov 2026).
// Tambah perubahan UI baru = tambah satu objek di daftar.json + dua PNG laptop di gambar/, lalu jalankan:
//   NODE_PATH=<folder node_modules yang memuat docx> node docs/sebelum-sesudah-ui/buat-word.cjs
// Hanya tampilan desktop (laptop 1536x960, PNG 1920x1200). Entri tanpa gambar = "tidak ada perubahan desktop".
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ImageRun, HeadingLevel, ShadingType, PageOrientation,
} = require('docx')

const DIR = __dirname
const daftar = JSON.parse(fs.readFileSync(path.join(DIR, 'daftar.json'), 'utf8'))
const FON = 'Calibri'
const t = (text, o = {}) => new TextRun({ text, font: FON, size: 21, ...o })
const p = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], spacing: { after: 80 }, ...o })

// PNG laptop 1920x1200 (1536x960 CSS px x 1,25). Lebar kolom 12,6 cm = 476 px pada 96 dpi.
const LEBAR_PX = 476
function ukuranPng(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}
function gambar(nama) {
  const buf = fs.readFileSync(path.join(DIR, 'gambar', nama))
  const { w, h } = ukuranPng(buf)
  return new ImageRun({ type: 'png', data: buf, transformation: { width: LEBAR_PX, height: Math.round((LEBAR_PX * h) / w) } })
}
const garis = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' }
const tepi = { top: garis, bottom: garis, left: garis, right: garis }
function sel(judul, nama, warna) {
  const isi = nama
    ? [new Paragraph({ children: [gambar(nama)], spacing: { after: 40 } })]
    : [p(t('Tidak ada gambar desktop untuk sisi ini.', { italics: true, color: '666666' }))]
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    borders: tepi,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({ children: [t(judul, { bold: true, color: warna })], shading: { type: ShadingType.CLEAR, fill: 'F2F2F2' }, spacing: { after: 60 } }),
      ...isi,
    ],
  })
}

const isi = [
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'Sebelum dan Sesudah Perubahan Tampilan SMART-FLIP', font: FON, size: 36, bold: true })], spacing: { after: 120 } }),
  p(t('Hanya tampilan desktop (laptop 1536 x 960). Perubahan yang dikerjakan dari tampilan telepon tetap hanya dicatat dari sisi desktopnya. Dibangun dari docs/sebelum-sesudah-ui/daftar.json; entri terbaru di bawah.', { color: '555555' })),
]
for (const e of daftar) {
  isi.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 80 }, children: [new TextRun({ text: `${e.judul}`, font: FON, size: 26, bold: true })], pageBreakBefore: false }),
    p([t(`Antrean ${e.antrean}`, { bold: true }), t(`  ·  Papan ${e.papan}  ·  ${e.tanggal}  ·  commit ${e.commit ?? '-'}`, { color: '555555' })]),
    p(t(e.ringkasan)),
  )
  if (e.sebelum || e.sesudah) {
    isi.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ cantSplit: true, children: [sel('SEBELUM', e.sebelum, 'A33A2A'), sel('SESUDAH', e.sesudah, '1F7A3A')] })] }))
  } else {
    isi.push(p(t('Tidak ada perubahan di tampilan desktop.', { italics: true })))
  }
  if (e.catatan) isi.push(p(t(e.catatan, { color: '555555', italics: true }), { spacing: { before: 60, after: 120 } }))
}

const doc = new Document({
  creator: 'SMART-FLIP',
  title: 'Sebelum dan Sesudah Perubahan Tampilan SMART-FLIP',
  sections: [{
    properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 850, bottom: 850, left: 850, right: 850 } } },
    children: isi,
  }],
})
Packer.toBuffer(doc).then((b) => {
  const out = path.join(DIR, 'Sebelum-Sesudah-UI.docx')
  fs.writeFileSync(out, b)
  console.log('ditulis', out, b.length, 'byte,', daftar.length, 'entri')
})
