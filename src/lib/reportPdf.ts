// Laporan belajar PDF (Profil.tsx "Unduh Laporan PDF") — a hidden <iframe>
// gets a real report template (not the live page's own sidebar/nav/buttons)
// written into it, then only THAT iframe's window is printed. Browsers still
// show their native print dialog (Save as PDF / Print / Cancel) -- this
// isn't a way to skip that, just to stop what's printed from looking like a
// raw "print this webpage" dump.

export interface QuizHistoryRow {
  moduleTitle: string
  score: number
  completedAt: string | null
}

export interface LaporanData {
  nama: string
  nimNidn: string
  email: string
  prodi: string
  angkatan: string
  totalModules: number
  modulSelesai: number
  waktuBelajar: string
  totalKuis: number
  avgScore: number
  bestScore: number
  bestModTitle: string
  varkDominant: string | null
  recentQuiz: QuizHistoryRow[]
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function scoreColor(pct: number): string {
  if (pct >= 80) return '#27500A'
  if (pct >= 60) return '#705010'
  return '#B03020'
}

function buildReportHtml(d: LaporanData): string {
  const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const quizRows = d.recentQuiz.length
    ? d.recentQuiz
        .map(
          (q) => `
        <tr>
          <td>${esc(q.moduleTitle)}</td>
          <td style="text-align:center;font-weight:700;color:${scoreColor(q.score)}">${q.score}%</td>
          <td style="text-align:right">${q.completedAt ? new Date(q.completedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
        </tr>`,
        )
        .join('')
    : '<tr><td colspan="3" style="text-align:center;color:#9B8B7A;padding:16px">Belum ada riwayat kuis</td></tr>'

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Laporan Belajar — ${esc(d.nama)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #3E362E;
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2.5px solid #3E362E;
    padding-bottom: 14px;
    margin-bottom: 20px;
  }
  .header h1 { font-family: Georgia, serif; font-size: 20px; margin: 0 0 3px; }
  .header .sub { color: #6B5D4F; font-size: 11px; }
  .header .tanggal { text-align: right; font-size: 11px; color: #9B8B7A; }
  .info-box {
    background: #FAF7F0;
    border: 1px solid #e5e0d5;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 20px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 20px;
  }
  .info-box .label { color: #9B8B7A; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; }
  .info-box .value { font-weight: 600; font-size: 12.5px; }
  h2.section {
    font-family: Georgia, serif;
    font-size: 14px;
    border-left: 3px solid #D4A373;
    padding-left: 8px;
    margin: 22px 0 10px;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 6px;
  }
  .stat {
    border: 1px solid #e5e0d5;
    border-radius: 8px;
    padding: 10px 12px;
  }
  .stat .val { font-size: 18px; font-weight: 700; }
  .stat .label { font-size: 10px; color: #6B5D4F; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; color: #9B8B7A; border-bottom: 1.5px solid #3E362E; padding: 6px 4px; }
  td { padding: 8px 4px; border-bottom: 1px solid #ece7db; font-size: 12px; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e5e0d5; font-size: 10px; color: #9B8B7A; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Laporan Belajar</h1>
      <div class="sub">Smart Flip 5.0 — E-Modul Adaptif Metode Penelitian &amp; Pengembangan</div>
    </div>
    <div class="tanggal">Dicetak ${esc(tanggal)}</div>
  </div>

  <div class="info-box">
    <div><div class="label">Nama</div><div class="value">${esc(d.nama)}</div></div>
    <div><div class="label">NIM</div><div class="value">${esc(d.nimNidn || '—')}</div></div>
    <div><div class="label">Email</div><div class="value">${esc(d.email || '—')}</div></div>
    <div><div class="label">Program Studi</div><div class="value">${esc(d.prodi || '—')}${d.angkatan ? ' · Angkatan ' + esc(d.angkatan) : ''}</div></div>
    ${d.varkDominant ? `<div><div class="label">Gaya Belajar (VARK)</div><div class="value">${esc(d.varkDominant)}</div></div>` : ''}
  </div>

  <h2 class="section">Ringkasan Progres</h2>
  <div class="stats">
    <div class="stat"><div class="val">${d.modulSelesai}/${d.totalModules}</div><div class="label">Modul Selesai</div></div>
    <div class="stat"><div class="val">${d.avgScore}%</div><div class="label">Rata-rata Kuis</div></div>
    <div class="stat"><div class="val">${d.bestScore}%</div><div class="label">Skor Terbaik${d.bestModTitle ? ' — ' + esc(d.bestModTitle) : ''}</div></div>
    <div class="stat"><div class="val">${esc(d.waktuBelajar)}</div><div class="label">Waktu Belajar</div></div>
  </div>

  <h2 class="section">Riwayat Kuis Terakhir</h2>
  <table>
    <thead><tr><th>Modul</th><th style="text-align:center">Skor</th><th style="text-align:right">Tanggal</th></tr></thead>
    <tbody>${quizRows}</tbody>
  </table>

  <div class="footer">Perpustakaan Digital Smart Flip 5.0 · Fakultas Vokasi, Universitas Negeri Malang · Dana Internal UM 2026</div>
</body>
</html>`
}

export function printLaporanPdf(data: LaporanData): void {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
  }

  iframe.onload = () => {
    const win = iframe.contentWindow
    if (!win) {
      cleanup()
      return
    }
    win.focus()
    win.print()
    // afterprint doesn't fire reliably across browsers for iframe windows —
    // a short delay after print() returns (which itself blocks until the
    // dialog closes on most browsers) is the pragmatic cleanup point.
    setTimeout(cleanup, 500)
  }

  iframe.srcdoc = buildReportHtml(data)
}
