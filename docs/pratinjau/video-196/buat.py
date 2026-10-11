# Menyusun index.html contoh video (antrean #196) dari narasi.json.
# Pemakaian: python buat.py <folder-proyek> [wajah]
import json, os, re, shutil, sys

sini = os.path.dirname(os.path.abspath(__file__))
proyek = sys.argv[1]
wajah = len(sys.argv) > 2 and sys.argv[2] == 'wajah'
narasi = json.load(open(os.path.join(sini, 'assets', 'narasi.json'), encoding='utf-8'))

AWAL, JEDA, EKOR = 1.0, 0.5, 2.3
mulai, t = [], AWAL
for n in narasi:
    mulai.append(round(t, 2))
    t += n['dur'] + JEDA
total = round(t - JEDA + EKOR, 1)
# batas adegan: sedikit sebelum suara adegan berikutnya
batas = [0.0] + [round(m - 0.25, 2) for m in mulai[1:]] + [total]

# takarir: satu kalimat per tampilan, lamanya sebanding jumlah huruf
takarir = []
for n, m in zip(narasi, mulai):
    kal = re.findall(r'[^.?!]+[.?!]', n['teks'])
    huruf = sum(len(k) for k in kal)
    s = m
    for i, k in enumerate(kal):
        d = n['dur'] * len(k) / huruf
        akhir = s + d + (JEDA - 0.1 if i == len(kal) - 1 else 0)
        takarir.append((round(s, 2), round(akhir - s, 2), k.strip().replace('R and D', 'R&amp;D')))
        s += d

os.makedirs(os.path.join(proyek, 'assets'), exist_ok=True)
for n in narasi:
    shutil.copy(os.path.join(sini, 'assets', n['id'] + '.mp3'), os.path.join(proyek, 'assets'))
for f in os.listdir(os.path.join(sini, 'fon')):
    if f.endswith('.woff2'):
        shutil.copy(os.path.join(sini, 'fon', f), os.path.join(proyek, 'assets'))

def klip(i):
    return f'data-start="{batas[i]}" data-duration="{round(batas[i + 1] - batas[i], 2)}" data-track-index="2"'

html_takarir = '\n'.join(
    f'      <div class="clip takarir" id="tk{i}" data-start="{s}" data-duration="{d}" data-track-index="3"><span>{k}</span></div>'
    for i, (s, d, k) in enumerate(takarir))
html_audio = '\n'.join(
    f'      <audio id="suara-{n["id"]}" src="assets/{n["id"]}.mp3" data-start="{m}" data-duration="{n["dur"]}" data-track-index="10" data-volume="1"></audio>'
    for n, m in zip(narasi, mulai))
html_wajah = f'''
      <div class="clip" id="wajah" data-start="0" data-duration="{total}" data-track-index="5">
        <div id="wajah-kotak">
          <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
            <circle cx="100" cy="78" r="38" fill="#FFFDF8" opacity=".9" />
            <path d="M28 200c0-44 32-72 72-72s72 28 72 72z" fill="#FFFDF8" opacity=".9" />
          </svg>
          <div id="wajah-label">Tempat wajah dosen</div>
        </div>
      </div>''' if wajah else ''

tpl = open(os.path.join(sini, 'templat.html'), encoding='utf-8').read()
isi = {
    'KELAS': 'wajah' if wajah else '', 'TOTAL': total, 'TAKARIR': html_takarir, 'AUDIO': html_audio, 'WAJAH': html_wajah,
    'MULAI': json.dumps(mulai), 'BATAS': json.dumps(batas), 'DUR': json.dumps([n['dur'] for n in narasi]),
}
for i in range(6):
    isi[f'K{i + 1}'] = klip(i)
for k, v in isi.items():
    tpl = tpl.replace(f'@@{k}@@', str(v))
assert '@@' not in tpl, re.findall(r'@@\w+@@', tpl)
open(os.path.join(proyek, 'index.html'), 'w', encoding='utf-8', newline='\n').write(tpl)
print(proyek, 'total', total, 'mulai', mulai, 'takarir', len(takarir))
