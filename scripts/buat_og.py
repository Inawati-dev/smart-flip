"""Gambar sampul berbagi tautan (og:image) SMART-FLIP: public/assets/og-smart-flip.png, 1200x630.

Pakai (dari akar repo):  python scripts/buat_og.py
Butuh: Chrome atau Edge terpasang. Logo diambil dari public/assets/favicon.svg
(sumber tunggal ikon, antrean #300), jadi gambar ini ikut berubah bila logo
diganti dan skrip dijalankan ulang. Halaman HTML sementara dan profil Chrome
ditulis di folder temp sistem, bukan di repo (server dev Vite memantau repo).
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
LOGO = AKAR / 'public' / 'assets' / 'favicon.svg'
KELUARAN = AKAR / 'public' / 'assets' / 'og-smart-flip.png'
PERAMBAN = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    shutil.which('chrome') or '', shutil.which('google-chrome') or '', shutil.which('msedge') or '',
]

HTML = """<!doctype html><html lang="id"><head><meta charset="utf-8">
<style>
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:'Segoe UI',Inter,Arial,sans-serif;background:#FAFAF9;color:#1D5FA8;display:flex}
.kiri{width:470px;background:#1D5FA8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:40px}
.kiri .logo svg{width:250px;height:250px;display:block;filter:drop-shadow(0 18px 30px rgba(10,30,60,.35))}
.kiri .nama{color:#FFFFFF;font-size:46px;font-weight:800;letter-spacing:-.5px}
.kiri .nama span{color:#F2B544}
.kanan{flex:1;padding:64px 64px 56px 60px;display:flex;flex-direction:column}
h1{font-size:38px;line-height:1.18;font-weight:800;color:#1D5FA8;letter-spacing:-.4px}
.sub{margin-top:14px;font-size:22px;color:#57534E;line-height:1.4}
ul{list-style:none;padding:0;margin-top:30px;display:flex;flex-direction:column;gap:14px}
li{display:flex;gap:14px;align-items:flex-start;font-size:22px;color:#292524;line-height:1.3}
li b{flex:0 0 12px;height:12px;border-radius:50%;background:#F2B544;margin-top:9px}
.kaki{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;font-size:18px;color:#78716C}
.kaki .url{font-size:22px;font-weight:700;color:#3BA6F1}
</style></head><body>
<div class="kiri"><div class="logo">{{LOGO}}</div><div class="nama">SMART-FLIP <span>5.0</span></div></div>
<div class="kanan">
<h1>E-Modul Adaptif Metode Penelitian dan Pengembangan</h1>
<p class="sub">Modul flipbook, video tiap pertemuan, dan tes yang menyesuaikan jalur belajar mahasiswa.</p>
<ul>
<li><b></b>Tes diagnostik awal menentukan Jalur Cepat atau Belajar Mendalam</li>
<li><b></b>Modul PDF dibaca seperti buku, video untuk dua pertemuan per topik</li>
<li><b></b>Tes formatif tiap topik dan peningkatan skor kelas otomatis</li>
</ul>
<div class="kaki"><div>Fakultas Vokasi, Universitas Negeri Malang</div><div class="url">smart-flips.vercel.app</div></div>
</div></body></html>"""


def main() -> None:
    exe = next((p for p in PERAMBAN if p and os.path.exists(p)), None)
    if not exe:
        sys.exit('Chrome/Edge tidak ditemukan.')
    logo = re.sub(r'<\?xml[^>]*>', '', LOGO.read_text(encoding='utf-8'))
    temp = Path(tempfile.mkdtemp(prefix='og-smartflip-'))
    try:
        halaman = temp / 'og.html'
        halaman.write_text(HTML.replace('{{LOGO}}', logo), encoding='utf-8')
        png = temp / 'og.png'
        subprocess.run([
            exe, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
            f'--user-data-dir={temp / "profil"}', '--window-size=1200,630', '--force-device-scale-factor=1',
            f'--screenshot={png}', halaman.as_uri(),
        ], check=True, capture_output=True, timeout=120)
        from PIL import Image
        img = Image.open(png).convert('RGB')
        assert img.size == (1200, 630), f'ukuran tangkapan {img.size}, harus 1200x630'
        img.save(KELUARAN, optimize=True)
    finally:
        shutil.rmtree(temp, ignore_errors=True)
    print(f'{KELUARAN}: {KELUARAN.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
