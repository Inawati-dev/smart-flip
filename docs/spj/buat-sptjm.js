const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, LevelFormat, TabStopType,
} = require('docx');

const FON = 'Times New Roman';
const UK = 22; // 11 pt
const t = (text, o = {}) => new TextRun({ text, font: FON, size: UK, ...o });
const p = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], spacing: { after: 80, line: 276 }, ...o });

// Identitas: label, isian (tab rata kiri di 2400 DXA)
const baris = (label, isi) => p([t(label), t('\t:\t'), t(isi)], {
  tabStops: [{ type: TabStopType.LEFT, position: 2600 }, { type: TabStopType.LEFT, position: 2850 }],
  indent: { left: 2850, hanging: 2850 }, // baris lanjutan rata dengan isian
  spacing: { after: 40 },
});

const garis = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const sisi = { top: garis, bottom: garis, left: garis, right: garis };
const KOLOM = [450, 1050, 2520, 700, 750, 1250, 1350, 1100]; // jumlah 9170 (A4, margin 2 cm kiri-kanan ~ 9638)
const LEBAR = KOLOM.reduce((a, b) => a + b, 0);
const sel = (text, i, o = {}) => new TableCell({
  borders: sisi, width: { size: KOLOM[i], type: WidthType.DXA },
  margins: { top: 50, bottom: 50, left: 70, right: 70 },
  shading: o.kepala ? { type: ShadingType.CLEAR, color: 'auto', fill: 'E7E6E6' } : undefined,
  columnSpan: o.span,
  children: [new Paragraph({ alignment: o.rata || AlignmentType.LEFT, children: [t(text, { bold: !!o.kepala || !!o.tebal, size: 20 })] })],
});
const KEPALA = ['No', 'Tanggal', 'Nama bahan dan spesifikasi', 'Vol.', 'Satuan', 'Harga satuan (Rp)', 'Jumlah (Rp)', 'Toko / No. nota'];
const tabel = new Table({
  width: { size: LEBAR, type: WidthType.DXA },
  columnWidths: KOLOM,
  rows: [
    new TableRow({ tableHeader: true, children: KEPALA.map((k, i) => sel(k, i, { kepala: true, rata: AlignmentType.CENTER })) }),
    ...[1, 2, 3, 4, 5].map((n) => new TableRow({ children: KOLOM.map((_, i) => sel(i === 0 ? String(n) : '', i, { rata: i === 0 ? AlignmentType.CENTER : AlignmentType.LEFT })) })),
    new TableRow({ children: [
      new TableCell({ borders: sisi, columnSpan: 6, width: { size: KOLOM.slice(0, 6).reduce((a, b) => a + b, 0), type: WidthType.DXA }, margins: { top: 50, bottom: 50, left: 70, right: 70 },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t('JUMLAH', { bold: true, size: 20 })] })] }),
      sel('', 6), sel('', 7),
    ] }),
  ],
});

const doc = new Document({
  styles: { default: { document: { run: { font: FON, size: UK } } } },
  numbering: { config: [{ reference: 'butir', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 400, hanging: 400 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    children: [
      p(t('SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK (SPTJM)', { bold: true, size: 24 }), { alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
      p(t('BELANJA BAHAN LABORATORIUM', { bold: true, size: 24 }), { alignment: AlignmentType.CENTER, spacing: { after: 240 } }),
      p(t('Yang bertanda tangan di bawah ini:')),
      baris('Nama', 'Inawati, S.IP., M.M.'),
      baris('NIP', '..................................................'),
      baris('Jabatan', 'Ketua Peneliti'),
      baris('Judul penelitian', 'E-Modul Adaptif Smart Flip 5.0: Optimalisasi Self Directed Learning melalui Smart Flip 5.0 untuk Mahasiswa Fakultas Vokasi UM'),
      baris('Skema / tahun', 'Penelitian Dana Internal (Non-APBN) Universitas Negeri Malang 2026'),
      baris('Nomor kontrak', '..................................................'),
      p(t('dengan ini menyatakan dengan sesungguhnya bahwa:'), { spacing: { before: 120, after: 80 } }),
      ...[
        'Bahan laboratorium yang tercantum dalam rincian di bawah dibeli untuk keperluan penelitian tersebut di atas, telah diterima, dan telah digunakan.',
        'Harga yang dibayarkan wajar dan sesuai dengan nota/kuitansi asli yang dilampirkan.',
        'Bukti pengeluaran tersebut sah dan tidak digunakan untuk pertanggungjawaban kegiatan lain.',
        'Apabila di kemudian hari ditemukan kelebihan pembayaran atau ketidaksesuaian, saya bersedia mengembalikan dana tersebut ke kas yang ditentukan.',
        'Saya bertanggung jawab penuh secara hukum atas kebenaran pernyataan ini.',
      ].map((s) => new Paragraph({ numbering: { reference: 'butir', level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: 60, line: 276 }, children: [t(s)] })),
      p(t('Rincian belanja bahan:'), { spacing: { before: 160, after: 80 } }),
      tabel,
      p([t('Terbilang: '), t('......................................................................................................................... rupiah', { italics: true })], { spacing: { before: 120, after: 120 } }),
      p(t('Demikian surat pernyataan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.'), { alignment: AlignmentType.JUSTIFIED, spacing: { after: 240 } }),
      p(t('Malang, ........................ 2026'), { indent: { left: 5600 }, spacing: { after: 0 } }),
      p(t('Ketua Peneliti,'), { indent: { left: 5600 }, spacing: { after: 120 } }),
      p(t('Meterai Rp10.000', { color: '808080', size: 18 }), { indent: { left: 5600 }, spacing: { after: 700 } }),
      p(t('Inawati, S.IP., M.M.', { bold: true, underline: {} }), { indent: { left: 5600 }, spacing: { after: 0 } }),
      p(t('NIP. ....................................'), { indent: { left: 5600 } }),
    ],
  }],
});

Packer.toBuffer(doc).then((b) => { fs.writeFileSync(process.argv[2], b); console.log('ditulis', process.argv[2], b.length, 'byte'); });
