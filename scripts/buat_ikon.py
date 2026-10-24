"""Buat semua ikon aplikasi dari SATU sumber: public/assets/favicon.svg.

Pakai (dari akar repo):  python scripts/buat_ikon.py
Butuh: PyMuPDF (fitz) untuk menggambar SVG, Pillow untuk menyimpan PNG.

Sumber memuat <rect id="latar"> (kotak biru bersudut) dan <g id="tanda">
(logo A1 "Halaman Terbang ke Bintang", antrean #300). Varian dibuat dengan
mengubah dua atribut itu saja, jadi gambar tetap satu sumber:
  - latar penuh  : rx latar = 0 (apple-touch-icon dan maskable tanpa transparansi)
  - zona aman    : tanda diperkecil ke tengah (maskable, lingkaran aman 80 %)

Keluaran di public/assets/:
  favicon-32.png        32x32, sudut membulat seperti SVG
  icon-180.png          180x180, latar penuh tanpa transparansi (apple-touch-icon)
  icon-192.png          192x192, sudut membulat
  icon-512.png          512x512, sudut membulat
  icon-512-maskable.png 512x512, latar penuh, tanda diperkecil ke zona aman
"""
import io
import re
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image

AKAR = Path(__file__).resolve().parent.parent
SUMBER = AKAR / 'public' / 'assets' / 'favicon.svg'
LAPIS = 8  # gambar 8x lebih besar lalu dikecilkan, supaya tepi halus
TANDA_AMAN = 'translate(14.4 13.6) scale(0.55)'  # 0.55 x 64 = 35 px di tengah kotak 64


def varian(svg: str, latar_penuh: bool = False, zona_aman: bool = False) -> str:
    if latar_penuh:
        svg, n = re.subn(r'(<rect id="latar"[^>]*?) rx="[\d.]+"', r'\1 rx="0"', svg)
        assert n == 1, 'rect id="latar" ber-rx tidak ditemukan di favicon.svg'
    if zona_aman:
        svg, n = re.subn(r'(<g id="tanda" transform=")[^"]*"', rf'\g<1>{TANDA_AMAN}"', svg)
        assert n == 1, 'g id="tanda" ber-transform tidak ditemukan di favicon.svg'
    return svg


def gambar(svg: str, sisi: int) -> Image.Image:
    doc = fitz.open(stream=svg.encode('utf-8'), filetype='svg')
    hal = doc[0]
    skala = sisi * LAPIS / hal.rect.width
    pix = hal.get_pixmap(matrix=fitz.Matrix(skala, skala), alpha=True)
    img = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGBA')
    return img.resize((sisi, sisi), Image.LANCZOS)


def simpan(nama: str, img: Image.Image, tanpa_alfa: bool = False) -> None:
    if tanpa_alfa:
        dasar = Image.new('RGB', img.size, (255, 255, 255))
        dasar.paste(img, mask=img.split()[3])
        img = dasar
    tujuan = SUMBER.parent / nama
    img.save(tujuan, optimize=True)
    print(f'{nama}: {img.size[0]}x{img.size[1]} {img.mode} {tujuan.stat().st_size} B')


if __name__ == '__main__':
    svg = SUMBER.read_text(encoding='utf-8')
    # Semua varian dibangun dulu baru disimpan: assert yang gagal tidak
    # meninggalkan set ikon setengah baru setengah lama.
    hasil = [
        ('favicon-32.png', gambar(svg, 32), False),
        ('icon-180.png', gambar(varian(svg, latar_penuh=True), 180), True),
        ('icon-192.png', gambar(svg, 192), False),
        ('icon-512.png', gambar(svg, 512), False),
        ('icon-512-maskable.png', gambar(varian(svg, latar_penuh=True, zona_aman=True), 512), True),
    ]
    for nama, img, tanpa_alfa in hasil:
        simpan(nama, img, tanpa_alfa)
