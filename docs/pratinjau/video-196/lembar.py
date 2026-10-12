# Antrean #199: membuat lembar pose gambar diam (lembar-pose.html) dari tokoh versi yang berlaku, tanpa merender video.
# Gambar tokoh diambil dari tokoh5.html dan hitungan lengan diambil apa adanya dari tokoh5.js, jadi lembar selalu sama
# dengan yang dipakai video. Tujuh pose badan penuh (nomor 1 sampai 7) dan empat tampak dekat (8 sampai 11).
# Pemakaian: python lembar.py   lalu buka lembar-pose.html di peramban dan potret.
import io, re

html = io.open('tokoh5.html', encoding='utf-8').read()
js = io.open('tokoh5.js', encoding='utf-8').read()
svg = re.search(r'<svg viewBox="0 0 470 800".*?</svg>', html, flags=re.S).group(0)
a, z = js.index('const LEHER'), js.index('// bahu, siku, dan tangan memakai')
hitung = js[a:z]
assert 'const hitung' in hitung and 'BICARA' in hitung

halaman = '''<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>Lembar pose dosen</title>
<style>
  body { margin: 0; padding: 20px 24px 28px; background: #FFFDF8; font-family: Arial, sans-serif; color: #3E362E; width: 1752px; }
  h1 { font-size: 22px; margin: 0 0 4px; } p { margin: 0 0 14px; font-size: 15px; color: #6B5D4F; }
  .baris { display: flex; gap: 12px; margin-bottom: 18px; }
  .panel { background: #F5F2E9; border: 1px solid rgba(62,54,46,.14); border-radius: 10px; padding: 8px 8px 4px; }
  .panel b { display: block; font-size: 16px; margin-bottom: 4px; }
  .panel b span { display: inline-block; min-width: 26px; height: 26px; line-height: 26px; text-align: center; border-radius: 13px; background: #3E362E; color: #FFFDF8; margin-right: 6px; }
  svg { display: block; }
</style></head><body>
<h1>Lembar pose dosen (tokoh versi 5)</h1>
<p>Gambar diam dari tokoh yang sama dengan contoh video terakhir. Sebut nomornya untuk bagian yang masih terasa tidak alami.</p>
<div class="baris" id="badan"></div>
<div class="baris" id="dekat"></div>
<template id="tokoh">@@SVG@@</template>
<script>
@@HITUNG@@
const BADAN = [
  ['Istirahat', { k: ISTIRAHAT, l: ISTIRAHAT, mulut: [1.12, 0.16] }],
  ['Bicara, tangan sedang', { k: BICARA[0], l: ISTIRAHAT, mulut: [1, 1] }],
  ['Bicara, tangan lebih tinggi', { k: BICARA[1], l: ISTIRAHAT, mulut: [1.2, 0.56] }],
  ['Bicara, tangan lebih rendah', { k: BICARA[2], l: ISTIRAHAT, mulut: [0.74, 0.92] }],
  ['Bicara, tangan lebih lebar', { k: BICARA[3], l: BICARA[2], mulut: [1.28, 0.42] }],
  ['Bertanya', { k: TANYA_K, l: TANYA_L, mulut: [0.96, 0.36], alis: -6, kepala: -4 }],
  ['Menunjuk papan', { k: TUNJUK_POSE, l: ISTIRAHAT, mulut: [1.2, 0.56], kepala: 4, lirik: true, spidol: true }],
];
// tampak dekat: [judul, nomor pose badan yang diperbesar, kotak pandang persegi]; kotak tangan dipusatkan di pergelangan
const sekitar = (p, geser = 0) => { const h = hitung('k', p); return `${h.x - 110 + geser} ${h.y - 120} 220 220`; };
const DEKAT = [
  ['Kepala dan songkok', 0, '90 66 220 220'],
  ['Tangan terbuka (pose 3)', 2, sekitar(BICARA[1])],
  ['Tangan memegang spidol (pose 7)', 6, sekitar(TUNJUK_POSE, 20)],
  ['Lengan dan siku saat bertanya (pose 6)', 5, '-30 150 500 500'],
];
const templat = document.getElementById('tokoh');
const gambar = (p, kotak, lebar) => {
  const svg = templat.content.firstElementChild.cloneNode(true);
  const q = (s) => svg.querySelector(s);
  ['k', 'l'].forEach((sisi) => {
    const h = hitung(sisi, p[sisi]);
    q(`#${sisi}-lengan`).setAttribute('d', h.lengan);
    q(`#${sisi}-atas`).setAttribute('d', h.atas);
    q(`#${sisi}-tangan`).setAttribute('transform', `translate(${h.x} ${h.y}) rotate(${h.rotation})`);
  });
  q('#k-spidol').style.opacity = p.spidol ? 1 : 0;
  q('#k-buka').style.opacity = p.spidol ? 0 : 1;
  const mulut = q('#tk-mulut'), b = mulut.getBBox ? null : null;
  mulut.style.transformBox = 'fill-box'; mulut.style.transformOrigin = '50% 50%'; mulut.style.transform = `scale(${p.mulut[0]}, ${p.mulut[1]})`;
  if (p.alis) q('#tk-alis').setAttribute('transform', `translate(0 ${p.alis})`);
  if (p.kepala) q('#tk-kepala').setAttribute('transform', `rotate(${p.kepala} ${LEHER})`);
  if (p.lirik) { q('#tk-wajah').setAttribute('transform', 'translate(5 0)'); svg.querySelectorAll('.tk-pupil').forEach((e) => e.setAttribute('transform', 'translate(3.5 0)')); }
  const [x, y, w, h] = kotak.split(' ').map(Number);
  svg.setAttribute('viewBox', kotak); svg.setAttribute('width', lebar); svg.setAttribute('height', Math.round(lebar * h / w));
  svg.style.overflow = 'hidden';
  return svg;
};
const panel = (induk, nomor, judul, svg) => {
  const d = document.createElement('div'); d.className = 'panel';
  d.innerHTML = `<b><span>${nomor}</span>${judul}</b>`; d.appendChild(svg); document.getElementById(induk).appendChild(d);
};
BADAN.forEach(([judul, p], i) => panel('badan', i + 1, judul, gambar(p, '-62 78 592 705', 222)));
DEKAT.forEach(([judul, n, kotak], i) => panel('dekat', BADAN.length + i + 1, judul, gambar(BADAN[n][1], kotak, 404)));
</script></body></html>
'''
io.open('lembar-pose.html', 'w', encoding='utf-8', newline='\n').write(halaman.replace('@@SVG@@', svg).replace('@@HITUNG@@', hitung))
print('lembar-pose.html ditulis;', len(svg), 'huruf gambar tokoh')
