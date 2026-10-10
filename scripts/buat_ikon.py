"""Buat semua ikon aplikasi dari SATU sumber: public/assets/favicon.svg.

Pakai (dari akar repo):  python scripts/buat_ikon.py
Butuh: Pillow. Tidak butuh perender SVG: berkas sumbernya hanya memuat satu
<rect> dan tiga <path> berperintah M, C, V, jadi diurai langsung di sini.
Kalau favicon.svg diubah memakai perintah lain, skrip ini berhenti dengan
pesan galat dan perlu diperluas.

Keluaran di public/assets/:
  favicon-32.png        32x32, sudut membulat seperti SVG
  icon-180.png          180x180, latar penuh tanpa transparansi (apple-touch-icon)
  icon-192.png          192x192, sudut membulat
  icon-512.png          512x512, sudut membulat
  icon-512-maskable.png 512x512, latar penuh, gambar diperkecil ke zona aman
"""
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw

AKAR = Path(__file__).resolve().parent.parent
SUMBER = AKAR / 'public' / 'assets' / 'favicon.svg'
LAPIS = 8  # gambar 8x lebih besar lalu dikecilkan, supaya tepi halus
NS = '{http://www.w3.org/2000/svg}'


def warna(h, opasitas=1.0):
    h = h.lstrip('#')
    if len(h) == 3:  # bentuk pendek, mis. #fff
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (round(255 * opasitas),)


def titik_path(d):
    """Ubah atribut d (M, C, V mutlak) jadi daftar titik."""
    tok = re.findall(r'[MCVmcv]|-?\d*\.?\d+', d)
    titik, i, x, y = [], 0, 0.0, 0.0
    while i < len(tok):
        c = tok[i]
        i += 1
        if c == 'M':
            x, y = float(tok[i]), float(tok[i + 1])
            i += 2
            titik.append((x, y))
        elif c == 'V':
            y = float(tok[i])
            i += 1
            titik.append((x, y))
        elif c == 'C':
            x1, y1, x2, y2, x3, y3 = (float(t) for t in tok[i:i + 6])
            i += 6
            for k in range(1, 25):
                t = k / 24
                a, b, c2, e = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3
                titik.append((a * x + b * x1 + c2 * x2 + e * x3, a * y + b * y1 + c2 * y2 + e * y3))
            x, y = x3, y3
        else:
            sys.exit(f'Perintah path {c!r} belum didukung; perluas scripts/buat_ikon.py')
    return titik


def gambar(sisi, latar_penuh=False, skala_gambar=1.0):
    svg = ET.parse(SUMBER).getroot()
    kotak = svg.find(f'{NS}rect')
    n = sisi * LAPIS
    k = n / 32  # viewBox 0 0 32 32
    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = 0 if latar_penuh else float(kotak.get('rx', 0)) * k
    d.rounded_rectangle([0, 0, n - 1, n - 1], radius=radius, fill=warna(kotak.get('fill')))

    def ubah(p):
        # perkecil gambar ke tengah untuk ikon maskable (zona aman)
        return ((p[0] - 16) * skala_gambar + 16) * k, ((p[1] - 16) * skala_gambar + 16) * k

    for path in svg.findall(f'{NS}path'):
        lapis = Image.new('RGBA', (n, n), (0, 0, 0, 0))
        dl = ImageDraw.Draw(lapis)
        tebal = float(path.get('stroke-width', 1)) * k * skala_gambar
        w = warna(path.get('stroke'), float(path.get('opacity', 1)))
        pts = [ubah(p) for p in titik_path(path.get('d'))]
        dl.line(pts, fill=w, width=max(1, round(tebal)), joint='curve')
        r = tebal / 2
        for x, y in (pts[0], pts[-1]):  # ujung membulat
            dl.ellipse([x - r, y - r, x + r, y + r], fill=w)
        img = Image.alpha_composite(img, lapis)
    return img.resize((sisi, sisi), Image.LANCZOS)


def simpan(nama, img, tanpa_alfa=False):
    if tanpa_alfa:
        dasar = Image.new('RGB', img.size, (255, 255, 255))
        dasar.paste(img, mask=img.split()[3])
        img = dasar
    tujuan = SUMBER.parent / nama
    img.save(tujuan, optimize=True)
    print(f'{nama}: {img.size[0]}x{img.size[1]} {img.mode} {tujuan.stat().st_size} B')


if __name__ == '__main__':
    simpan('favicon-32.png', gambar(32))
    simpan('icon-180.png', gambar(180, latar_penuh=True), tanpa_alfa=True)
    simpan('icon-192.png', gambar(192))
    simpan('icon-512.png', gambar(512))
    simpan('icon-512-maskable.png', gambar(512, latar_penuh=True, skala_gambar=0.7), tanpa_alfa=True)
