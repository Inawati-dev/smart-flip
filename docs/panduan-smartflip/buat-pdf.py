"""Penyusun Panduan Pemakaian SMART-FLIP (antrean #290).

    python docs/panduan-smartflip/buat-pdf.py

Keluaran: public/panduan-smartflip.pdf, ikut ter-deploy dan diunduh dari
aplikasi lewat /panduan-smartflip.pdf (komponen src/components/TautanPanduan.tsx).

Langkah: isi templat panduan.html (edisi, tanggal, kode QR), cetak lewat Chrome
headless supaya tautan di PDF tetap bisa diklik, lalu dengan PyMuPDF tambah
nomor halaman dan penanda bab (bookmark) dari judul <h2>.
Butuh: Chrome atau Edge terpasang, `pip install segno pymupdf`.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

import fitz  # PyMuPDF
import segno

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.dirname(os.path.dirname(DIR))
KELUARAN = os.path.join(AKAR, 'public', 'panduan-smartflip.pdf')

# Harus sama dengan EDISI_PANDUAN di src/components/TautanPanduan.tsx.
EDISI = 'Edisi 3'
TANGGAL = '24 Oktober 2026'
SITUS = 'https://smart-flips.vercel.app'

PERAMBAN = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    shutil.which('chrome') or '', shutil.which('google-chrome') or '', shutil.which('msedge') or '',
]


def logo() -> str:
    """Logo aplikasi untuk sampul belakang (#311), diambil dari sumber tunggal ikon public/assets/favicon.svg."""
    svg = open(os.path.join(DIR, '..', '..', 'public', 'assets', 'favicon.svg'), encoding='utf-8').read()
    return re.sub(r'<\?xml[^>]*>', '', svg).strip()


def qr(url: str) -> str:
    svg = segno.make(url, error='m').svg_inline(scale=4, border=2, dark='#2B2622')
    return re.sub(r' (width|height)="\d+"', '', svg, count=2)


def cetak(html: str, pdf: str) -> None:
    exe = next((p for p in PERAMBAN if p and os.path.exists(p)), None)
    if not exe:
        sys.exit('Chrome/Edge tidak ditemukan.')
    # Profil di folder temp, bukan di repo: server dev Vite memantau repo dan
    # mati (EBUSY) bila berkas profil Chrome yang terkunci muncul di sana.
    profil = tempfile.mkdtemp(prefix='panduan-profil-')
    subprocess.run([
        exe, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--no-first-run',
        f'--user-data-dir={profil}', '--virtual-time-budget=8000',
        f'--print-to-pdf={pdf}', 'file:///' + html.replace('\\', '/'),
    ], check=True, capture_output=True, timeout=180)
    shutil.rmtree(profil, ignore_errors=True)


def rapikan(pdf: str, judul_bab: list[str]) -> int:
    doc = fitz.open(pdf)
    toc = []
    for i, hal in enumerate(doc):
        if 0 < i < len(doc) - 1:  # sampul depan dan sampul belakang (#311) tanpa nomor
            w, h = hal.rect.width, hal.rect.height
            hal.insert_text((w / 2 - 6, h - 22), str(i + 1), fontsize=8.5, color=(0.42, 0.36, 0.31))
            hal.insert_text((42, h - 22), 'Panduan Pemakaian SMART-FLIP 5.0', fontsize=7.5, color=(0.6, 0.55, 0.5))
    # Urutan awal: sampul (hal 1), Tentang SMART-FLIP (hal 2, #291), daftar isi (hal 3).
    # Daftar isi memuat semua judul, jadi bab dicari mulai halaman sesudahnya,
    # berurutan, supaya tiap judul jatuh di halaman tempat babnya dimulai.
    di = next(i for i in range(len(doc)) if ' '.join(doc[i].get_text().split()).startswith(judul_bab[0]))
    assert di >= 1 and 'Tentang SMART-FLIP' in doc[di - 1].get_text(), 'halaman sebelum daftar isi bukan "Tentang SMART-FLIP"'
    toc.append([1, 'Tentang SMART-FLIP', di])
    toc.append([1, judul_bab[0], di + 1])
    sisa = list(judul_bab[1:])
    for i in range(di + 1, len(doc)):
        teks = ' '.join(doc[i].get_text().split())
        while sisa and sisa[0] in teks:
            toc.append([1, sisa.pop(0), i + 1])
    doc.set_toc(toc)
    doc.set_metadata({'title': 'Panduan Pemakaian SMART-FLIP 5.0', 'author': 'Tim SMART-FLIP, Fakultas Vokasi UM', 'subject': EDISI + ', ' + TANGGAL})
    sementara = pdf + '.tmp'
    doc.save(sementara, garbage=4, deflate=True)
    n = len(doc)
    doc.close()
    os.replace(sementara, pdf)
    if sisa:
        print('Peringatan: judul bab tidak ditemukan untuk bookmark:', sisa)
    return n


def main() -> None:
    sumber = open(os.path.join(DIR, 'panduan.html'), encoding='utf-8').read()
    isi = (sumber.replace('{{EDISI}}', EDISI).replace('{{TANGGAL}}', TANGGAL)
           .replace('{{QR_MASUK}}', qr(SITUS + '/')).replace('{{QR_DAFTAR}}', qr(SITUS + '/register'))
           .replace('{{LOGO}}', logo()))
    assert '{{' not in isi, 'masih ada isian templat yang belum terganti'
    judul_bab = [re.sub(r'<[^>]+>', '', m) for m in re.findall(r'<h[12][^>]*>(.*?)</h[12]>', isi.split('<section class="bab"', 1)[1])]
    # Berkas cetak juga di temp; <base> menjaga alamat gambar/ tetap menunjuk folder ini.
    isi = isi.replace('<head>', '<head>\n<base href="file:///' + DIR.replace('\\', '/') + '/">', 1)
    cetak_html = os.path.join(tempfile.gettempdir(), 'panduan-smartflip-cetak.html')

    def satu_putaran(html: str) -> int:
        with open(cetak_html, 'w', encoding='utf-8') as f:
            f.write(html)
        try:
            cetak(cetak_html, KELUARAN)
        finally:
            os.remove(cetak_html)
        return rapikan(KELUARAN, judul_bab)

    # Putaran 1 mencari halaman tiap bab; putaran 2 menulis nomornya di daftar isi.
    satu_putaran(isi)
    with fitz.open(KELUARAN) as d:
        halaman = [h for _, _, h in d.get_toc()[2:]]
    awal, akhir = isi.index('<div class="isi-daftar">'), isi.index('</div>', isi.index('<div class="isi-daftar">'))
    potong = isi[awal:akhir].split('</a>')
    assert len(potong) - 1 == len(halaman), f'daftar isi {len(potong) - 1} baris, bab {len(halaman)}'
    daftar = ''.join(p + f'<span>{h}</span></a>' for p, h in zip(potong, halaman)) + potong[-1]
    n = satu_putaran(isi[:awal] + daftar + isi[akhir:])
    print(f'{KELUARAN}: {n} halaman, {os.path.getsize(KELUARAN) // 1024} KB')


if __name__ == '__main__':
    main()
