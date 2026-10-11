# Menyusun contoh video versi 2 (antrean #196): tokoh kartun di samping papan, gerak dari waktu tiap kata.
# Pemakaian: python buat2.py <folder-proyek> [folder-suara] [versi-tokoh]
import json, os, re, shutil, sys

sini = os.path.dirname(os.path.abspath(__file__))
proyek = sys.argv[1]
suara = os.path.join(sini, sys.argv[2] if len(sys.argv) > 2 else 'assets2')
versi = sys.argv[3] if len(sys.argv) > 3 else '2'
adegan = json.load(open(os.path.join(suara, 'narasi2.json'), encoding='utf-8'))['adegan']

AWAL, JEDA_KALIMAT, JEDA_ADEGAN, EKOR = 1.0, 0.34, 0.62, 2.4
t, mulai, dur, kata, kalimat = AWAL, [], [], [], []
for a in adegan:
    mulai.append(round(t, 2))
    for j, k in enumerate(a):
        k['mulai'] = round(t, 3)
        kalimat.append({'t': k['mulai'], 'd': k['akhir'], 'tanya': k['tanya']})
        kata += [{'t': round(k['mulai'] + w['t'], 3), 'd': w['d'], 'w': w['w']} for w in k['kata']]
        t += k['akhir'] + (JEDA_KALIMAT if j < len(a) - 1 else 0)
    dur.append(round(t - mulai[-1], 2))
    t += JEDA_ADEGAN
total = round(t - JEDA_ADEGAN + EKOR, 1)
batas = [0.0] + [round(m - 0.3, 2) for m in mulai[1:]] + [total]

os.makedirs(os.path.join(proyek, 'assets'), exist_ok=True)
semua = [k for a in adegan for k in a]
for k in semua:
    shutil.copy(os.path.join(suara, k['file']), os.path.join(proyek, 'assets'))
for f in os.listdir(os.path.join(sini, 'fon')):
    if f.endswith('.woff2'):
        shutil.copy(os.path.join(sini, 'fon', f), os.path.join(proyek, 'assets'))

html_takarir, html_audio = [], []
for n, k in enumerate(semua):
    berikut = semua[n + 1]['mulai'] if n + 1 < len(semua) else total - 0.6
    lama = round(min(berikut - k['mulai'] - 0.02, k['akhir'] + 0.5), 2)
    html_takarir.append(f'      <div class="clip takarir" id="tk{n}" data-start="{k["mulai"]}" data-duration="{lama}" data-track-index="3"><span>{k["teks"]}</span></div>')
    html_audio.append(f'      <audio id="suara-{n}" src="assets/{k["file"]}" data-start="{k["mulai"]}" data-duration="{round(min(k["dur"], k["akhir"] + 0.25), 3)}" data-track-index="{10 + n % 2}" data-volume="1"></audio>')

tpl = open(os.path.join(sini, 'templat.html'), encoding='utf-8').read()
a, z = tpl.index('    <script>\n      window.__timelines'), tpl.index('</script>', tpl.index('window.__timelines')) + len('</script>\n')
tpl = tpl[:a] + open(os.path.join(sini, 'skrip2.js'), encoding='utf-8').read() + tpl[z:]
isi = {
    'TOKOHJS': open(os.path.join(sini, f'tokoh{versi}.js'), encoding='utf-8').read().rstrip('\n'),
    'TOKOH': open(os.path.join(sini, f'tokoh{versi}.html'), encoding='utf-8').read(),
    'RUANG': open(os.path.join(sini, 'kelas.html'), encoding='utf-8').read().rstrip() if versi in ('3', '4') else '',
    'KELAS': 'papan', 'WAJAH': '', 'TOTAL': total, 'TAKARIR': '\n'.join(html_takarir), 'AUDIO': '\n'.join(html_audio),
    'MULAI': json.dumps(mulai), 'BATAS': json.dumps(batas), 'DUR': json.dumps(dur),
    'KATA': json.dumps(kata, ensure_ascii=False), 'KALIMAT': json.dumps(kalimat),
}
for i in range(6):
    isi[f'K{i + 1}'] = f'data-start="{batas[i]}" data-duration="{round(batas[i + 1] - batas[i], 2)}" data-track-index="2"'
for k, v in isi.items():
    tpl = tpl.replace(f'@@{k}@@', str(v))
assert '@@' not in tpl, re.findall(r'@@\w+@@', tpl)
open(os.path.join(proyek, 'index.html'), 'w', encoding='utf-8', newline='\n').write(tpl)
print(proyek, 'total', total, 'mulai', mulai, 'kalimat', len(kalimat), 'kata', len(kata))
