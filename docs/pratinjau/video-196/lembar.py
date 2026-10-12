# Antrean #199: membuat lembar pose gambar diam (lembar-pose.html) tanpa merender video.
# Tujuh pose badan penuh (nomor 1 sampai 7) dan empat tampak dekat (8 sampai 11).
#   python lembar.py      cara sekarang: gambar dari tokoh5.html, lengan satu kurva dari hitungan di tokoh5.js
#   python lembar.py b    pilihan B: badan dan kepala tetap dari tokoh5.html, tetapi lengan dan tangan digambar per pose
#                         (lengan atas dan lengan bawah bersiku, tangan dengan jari terpisah)
# Sesudah itu potret lembar-pose.html, misalnya:
#   chrome --headless=new --hide-scrollbars --window-size=1800,1000 --screenshot=lembar.png lembar-pose.html
import io, re, sys

B = len(sys.argv) > 1 and sys.argv[1] == 'b'
html = io.open('tokoh5.html', encoding='utf-8').read()
js = io.open('tokoh5.js', encoding='utf-8').read()
svg = re.search(r'<svg viewBox="0 0 470 800".*?</svg>', html, flags=re.S).group(0)
a, z = js.index('const LEHER'), js.index('// bahu, siku, dan tangan memakai')
hitung = js[a:z]
assert 'const hitung' in hitung and 'BICARA' in hitung

# Pilihan B. Sudut diukur dari arah lurus ke bawah: 0 = turun, 90 = mendatar ke luar badan, lebih dari 90 = naik.
# Tiap lengan: [sudut lengan atas, sudut lengan bawah, bentuk tangan, putar tangan terhadap lengan bawah].
LENGAN_B = r'''
const SISI = { k: { bahu: [272, 322], m: 1 }, l: { bahu: [128, 322], m: -1 } };
const ATAS = 86, BAWAH = 84, KAIN = '#5C4F43', LIPAT = '#4A3F35', KULIT = '#D7A476', GARIS = '#B98558', JEMPOL = '#DDAE82';
const POSE_B = [
  ['Istirahat', { k: [5, 2, 'santai', 0], l: [5, 2, 'santai', 0], mulut: [1.12, 0.16] }],
  ['Bicara, tangan sedang', { k: [22, 112, 'buka', -28], l: [5, 2, 'santai', 0], mulut: [1, 1] }],
  ['Bicara, tangan lebih tinggi', { k: [30, 148, 'buka', -8], l: [5, 2, 'santai', 0], mulut: [1.2, 0.56] }],
  ['Bicara, tangan lebih rendah', { k: [16, 80, 'buka', -40], l: [5, 2, 'santai', 0], mulut: [0.74, 0.92] }],
  ['Bicara, dua tangan terbuka', { k: [26, 104, 'buka', -32], l: [26, 104, 'buka', -32], mulut: [1.28, 0.42] }],
  ['Bertanya', { k: [34, 150, 'buka', -6], l: [18, 78, 'buka', -44], mulut: [0.96, 0.36], alis: -6, kepala: -4 }],
  ['Menunjuk papan', { k: [80, 96, 'spidol', 0], l: [5, 2, 'santai', 0], mulut: [1.2, 0.56], kepala: 4, lirik: true }],
];
const NS = 'http://www.w3.org/2000/svg';
const el = (nama, sifat) => { const e = document.createElementNS(NS, nama); for (const k in sifat) e.setAttribute(k, sifat[k]); return e; };
const rad = (d) => (d * Math.PI) / 180;
// ruas lengan: segi empat yang mengecil dari pangkal ke ujung
const ruas = (p, q, lp, lq) => {
  const dx = q[0] - p[0], dy = q[1] - p[1], n = Math.hypot(dx, dy), nx = -dy / n, ny = dx / n;
  return `M${p[0] + nx * lp} ${p[1] + ny * lp} L${q[0] + nx * lq} ${q[1] + ny * lq} L${q[0] - nx * lq} ${q[1] - ny * lq} L${p[0] - nx * lp} ${p[1] - ny * lp} Z`;
};
const jari = (x, panjang, putar, lebar = 8.8) => el('rect', { x: x - lebar / 2, y: 26, width: lebar, height: panjang, rx: lebar / 2, fill: KULIT, stroke: GARIS, 'stroke-width': 0.9, transform: `rotate(${putar} ${x} 28)` });
// Tangan digambar dengan pergelangan di (0,0) dan jari ke arah +y, untuk sisi l; sisi k dicerminkan.
const TANGAN = {
  // terbuka: empat jari terpisah dan sedikit mengembang, ibu jari menjauh dari telapak
  buka: (g) => {
    [[-11.5, 23, 9], [-3.8, 27, 3], [3.9, 26, -3], [11.4, 20, -10]].forEach(([x, p, r]) => g.appendChild(jari(x, p, r)));
    g.appendChild(el('rect', { x: -5.2, y: 0, width: 10.4, height: 24, rx: 5.2, fill: JEMPOL, stroke: GARIS, 'stroke-width': 0.9, transform: 'translate(-13 9) rotate(52)' }));
    g.appendChild(el('path', { d: 'M-15 -2 L15 -2 Q18.5 12 16.5 32 L-16.5 32 Q-18.5 12 -15 -2 Z', fill: KULIT }));
    g.appendChild(el('path', { d: 'M-9 20 Q0 25 9 20', fill: 'none', stroke: GARIS, 'stroke-width': 1, 'stroke-linecap': 'round', opacity: 0.7 }));
  },
  // santai di sisi badan: jari rapat dan sedikit menekuk, ibu jari menempel di depan telapak
  santai: (g) => {
    [[-10.5, 17, 5], [-3.5, 20, 6], [3.6, 19, 7], [10.4, 15, 9]].forEach(([x, p, r]) => g.appendChild(jari(x, p, r, 8.2)));
    g.appendChild(el('path', { d: 'M-14 -2 L14 -2 Q17 12 15.5 31 L-15.5 31 Q-17 12 -14 -2 Z', fill: KULIT }));
    g.appendChild(el('rect', { x: -4.8, y: 0, width: 9.6, height: 21, rx: 4.8, fill: JEMPOL, stroke: GARIS, 'stroke-width': 0.9, transform: 'translate(11 8) rotate(-10)' }));
  },
  // menggenggam spidol: kepalan dengan garis buku jari, ibu jari melintang di depan, spidol searah lengan bawah
  spidol: (g) => {
    g.appendChild(el('rect', { x: -6, y: 6, width: 12, height: 56, rx: 4.5, fill: '#26211E' }));
    g.appendChild(el('rect', { x: -5, y: 58, width: 10, height: 12, rx: 3.5, fill: '#B8855A' }));
    g.appendChild(el('path', { d: 'M-15 -2 L15 -2 Q19 6 19 18 Q19 33 6 33 L-6 33 Q-19 33 -19 18 Q-19 6 -15 -2 Z', fill: KULIT }));
    g.appendChild(el('path', { d: 'M-14 17 L14 17 M-12.5 25 L12.5 25', fill: 'none', stroke: GARIS, 'stroke-width': 1.1, 'stroke-linecap': 'round', opacity: 0.8 }));
    g.appendChild(el('rect', { x: -5, y: 0, width: 10, height: 22, rx: 5, fill: JEMPOL, stroke: GARIS, 'stroke-width': 0.9, transform: 'translate(-17 15) rotate(-72)' }));
  },
};
const lenganB = (svg, sisi, [sAtas, sBawah, bentuk, putar]) => {
  const { bahu, m } = SISI[sisi];
  const arah = (s) => [m * Math.sin(rad(s)), Math.cos(rad(s))];
  const a = arah(sAtas), b = arah(sBawah);
  const siku = [bahu[0] + a[0] * ATAS, bahu[1] + a[1] * ATAS], tangan = [siku[0] + b[0] * BAWAH, siku[1] + b[1] * BAWAH];
  const g = el('g', {});
  g.appendChild(el('circle', { cx: bahu[0], cy: bahu[1], r: 23, fill: KAIN }));
  g.appendChild(el('path', { d: ruas(bahu, siku, 23, 19.5), fill: KAIN }));
  g.appendChild(el('circle', { cx: siku[0], cy: siku[1], r: 19.5, fill: KAIN }));
  g.appendChild(el('path', { d: ruas(siku, tangan, 19.5, 15.5), fill: KAIN }));
  // lipatan kain di sisi dalam siku, hanya bila siku cukup menekuk
  if (Math.abs(sBawah - sAtas) > 25) {
    // garisnya mulai dari lekuk dalam siku (tempat tepi kedua ruas bertemu) dan masuk ke arah sendi
    const t = [b[0] - a[0], b[1] - a[1]], n = Math.hypot(t[0], t[1]) || 1;
    const lekuk = Math.min(48, 19.5 / Math.sin(rad((180 - Math.abs(sBawah - sAtas)) / 2)));
    const p = [siku[0] + (t[0] / n) * (lekuk - 1), siku[1] + (t[1] / n) * (lekuk - 1)], q = [siku[0] + (t[0] / n) * (lekuk - 13), siku[1] + (t[1] / n) * (lekuk - 13)];
    g.appendChild(el('path', { d: `M${p[0]} ${p[1]} L${q[0]} ${q[1]}`, stroke: LIPAT, 'stroke-width': 2.2, 'stroke-linecap': 'round', fill: 'none' }));
  }
  const sudut = (Math.atan2(b[1], b[0]) * 180) / Math.PI - 90;
  const gt = el('g', { transform: `translate(${tangan[0]} ${tangan[1]}) rotate(${sudut + m * putar})${m > 0 ? ' scale(-1 1)' : ''}` });
  TANGAN[bentuk](gt);
  g.appendChild(gt);
  g.appendChild(el('rect', { x: -18, y: -11, width: 36, height: 14, rx: 5, fill: '#FFFDF8', transform: `translate(${tangan[0]} ${tangan[1]}) rotate(${sudut})` }));
  svg.querySelector('#k-lengan').parentNode.insertBefore(g, svg.querySelector('#l-lengan'));
  return { siku, tangan };
};
'''

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
<h1>@@JUDUL@@</h1>
<p>@@KETERANGAN@@ Sebut nomornya untuk bagian yang masih terasa tidak alami.</p>
<div class="baris" id="badan"></div>
<div class="baris" id="dekat"></div>
<template id="tokoh">@@SVG@@</template>
<script>
const CARA_B = @@B@@;
@@HITUNG@@
@@LENGAN_B@@
const BADAN = CARA_B ? POSE_B : [
  ['Istirahat', { k: ISTIRAHAT, l: ISTIRAHAT, mulut: [1.12, 0.16] }],
  ['Bicara, tangan sedang', { k: BICARA[0], l: ISTIRAHAT, mulut: [1, 1] }],
  ['Bicara, tangan lebih tinggi', { k: BICARA[1], l: ISTIRAHAT, mulut: [1.2, 0.56] }],
  ['Bicara, tangan lebih rendah', { k: BICARA[2], l: ISTIRAHAT, mulut: [0.74, 0.92] }],
  ['Bicara, tangan lebih lebar', { k: BICARA[3], l: BICARA[2], mulut: [1.28, 0.42] }],
  ['Bertanya', { k: TANYA_K, l: TANYA_L, mulut: [0.96, 0.36], alis: -6, kepala: -4 }],
  ['Menunjuk papan', { k: TUNJUK_POSE, l: ISTIRAHAT, mulut: [1.2, 0.56], kepala: 4, lirik: true, spidol: true }],
];
const templat = document.getElementById('tokoh');
// mengembalikan [svg, letak pergelangan kanan layar] supaya tampak dekat bisa dipusatkan di tangan
const gambar = (p, lebar, kotak) => {
  const svg = templat.content.firstElementChild.cloneNode(true);
  const q = (s) => svg.querySelector(s);
  let pergelangan;
  if (CARA_B) {
    pergelangan = lenganB(svg, 'k', p.k).tangan;
    lenganB(svg, 'l', p.l);
    ['#k-lengan', '#k-atas', '#k-tangan', '#l-lengan', '#l-atas', '#l-tangan'].forEach((s) => q(s).remove());
  } else {
    ['k', 'l'].forEach((sisi) => {
      const h = hitung(sisi, p[sisi]);
      q(`#${sisi}-lengan`).setAttribute('d', h.lengan);
      q(`#${sisi}-atas`).setAttribute('d', h.atas);
      q(`#${sisi}-tangan`).setAttribute('transform', `translate(${h.x} ${h.y}) rotate(${h.rotation})`);
      if (sisi === 'k') pergelangan = [h.x, h.y];
    });
    q('#k-spidol').style.opacity = p.spidol ? 1 : 0;
    q('#k-buka').style.opacity = p.spidol ? 0 : 1;
  }
  const mulut = q('#tk-mulut');
  mulut.style.transformBox = 'fill-box'; mulut.style.transformOrigin = '50% 50%'; mulut.style.transform = `scale(${p.mulut[0]}, ${p.mulut[1]})`;
  if (p.alis) q('#tk-alis').setAttribute('transform', `translate(0 ${p.alis})`);
  if (p.kepala) q('#tk-kepala').setAttribute('transform', `rotate(${p.kepala} ${LEHER})`);
  if (p.lirik) { q('#tk-wajah').setAttribute('transform', 'translate(5 0)'); svg.querySelectorAll('.tk-pupil').forEach((e) => e.setAttribute('transform', 'translate(3.5 0)')); }
  const k = typeof kotak === 'function' ? kotak(pergelangan) : kotak;
  const [, , w, h] = k.split(' ').map(Number);
  svg.setAttribute('viewBox', k); svg.setAttribute('width', lebar); svg.setAttribute('height', Math.round(lebar * h / w));
  svg.style.overflow = 'hidden';
  return svg;
};
const panel = (induk, nomor, judul, svg) => {
  const d = document.createElement('div'); d.className = 'panel';
  d.innerHTML = `<b><span>${nomor}</span>${judul}</b>`; d.appendChild(svg); document.getElementById(induk).appendChild(d);
};
// tampak dekat: [judul, urutan pose badan yang diperbesar, kotak pandang persegi]; kotak tangan dipusatkan di pergelangan
const sekitar = (geser) => (w) => `${w[0] - 110 + geser} ${w[1] - 120} 220 220`;
const DEKAT = [
  ['Kepala dan songkok', 0, '90 66 220 220'],
  ['Tangan terbuka (pose 3)', 2, sekitar(0)],
  ['Tangan memegang spidol (pose 7)', 6, sekitar(20)],
  ['Lengan dan siku saat bertanya (pose 6)', 5, '-30 150 500 500'],
];
BADAN.forEach(([judul, p], i) => panel('badan', i + 1, judul, gambar(p, 222, '-62 78 592 705')));
DEKAT.forEach(([judul, n, kotak], i) => panel('dekat', BADAN.length + i + 1, judul, gambar(BADAN[n][1], 404, kotak)));
</script></body></html>
'''
judul = 'Lembar pose dosen, pilihan B (lengan bersiku, jari terpisah)' if B else 'Lembar pose dosen (tokoh versi 5)'
ket = 'Badan, kepala, dan songkok sama dengan tokoh versi 5; lengan dan tangan digambar per pose.' if B else 'Gambar diam dari tokoh yang sama dengan contoh video terakhir.'
for kunci, isi in (('@@SVG@@', svg), ('@@HITUNG@@', hitung), ('@@LENGAN_B@@', LENGAN_B if B else ''), ('@@B@@', 'true' if B else 'false'), ('@@JUDUL@@', judul), ('@@KETERANGAN@@', ket)):
    halaman = halaman.replace(kunci, isi)
io.open('lembar-pose.html', 'w', encoding='utf-8', newline='\n').write(halaman)
print('lembar-pose.html ditulis; cara', 'B' if B else 'sekarang')
