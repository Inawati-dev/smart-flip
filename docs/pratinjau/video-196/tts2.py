# Suara narasi versi 2 (antrean #196): naskah gaya bicara, satu berkas per kalimat,
# laju dan nada sedikit berbeda tiap kalimat, dan waktu tiap kata untuk gerak mulut.
# Pemakaian: python tts2.py <folder-keluaran> [nama-suara]
import asyncio, json, os, subprocess, sys
import edge_tts

out = sys.argv[1]
suara = sys.argv[2] if len(sys.argv) > 2 else 'id-ID-GadisNeural'
os.makedirs(out, exist_ok=True)

# (teks yang dibaca, teks takarir bila berbeda, laju, nada)
ADEGAN = [
    [("Coba ingat lagi masa PKL atau magang Anda.", None, "+2%", "+0Hz"),
     ("Ada, kan, satu masalah yang Anda lihat hampir setiap hari?", None, "+4%", "+6Hz"),
     ("Nah, ada tiga cara pandang untuk membacanya.", None, "+0%", "+0Hz")],
    [("Yang pertama, kuantitatif.", None, "-2%", "+2Hz"),
     ("Di sini, kita bicara angka.", None, "-3%", "+0Hz"),
     ("Cocok kalau Anda ingin tahu, seberapa besar sih masalahnya?", None, "+5%", "+6Hz")],
    [("Yang kedua, kualitatif.", None, "-2%", "+2Hz"),
     ("Kita menggali cerita, lewat wawancara atau observasi.", None, "+2%", "+0Hz"),
     ("Cocok kalau pertanyaannya, mengapa ini bisa terjadi?", None, "+4%", "+6Hz")],
    [("Lalu yang ketiga, ar en di, penelitian dan pengembangan.", "Lalu yang ketiga, R&amp;D, penelitian dan pengembangan.", "+0%", "+2Hz"),
     ("Kita meriset dulu, lalu membuat, dan menguji produk baru.", None, "+2%", "+0Hz")],
    [("Contohnya begini.", None, "+0%", "+3Hz"),
     ("Sebuah ritel di Malang ingin memangkas antrean kasir.", None, "+4%", "+0Hz"),
     ("Timnya mengukur waktu tunggu, mewawancarai para kasir, baru setelah itu merancang kasir mandiri.", None, "+3%", "+0Hz")],
    [("Jadi, pahami dulu, baru kembangkan.", None, "-8%", "-2Hz")],
]

async def satu(teks, laju, nada, berkas):
    kata = []
    c = edge_tts.Communicate(teks, suara, rate=laju, pitch=nada, boundary='WordBoundary')
    with open(berkas, 'wb') as f:
        async for bagian in c.stream():
            if bagian['type'] == 'audio':
                f.write(bagian['data'])
            elif bagian['type'] == 'WordBoundary':
                kata.append({'t': round(bagian['offset'] / 1e7, 3), 'd': round(bagian['duration'] / 1e7, 3), 'w': bagian['text']})
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', berkas],
                               capture_output=True, text=True).stdout.strip())
    return kata, round(dur, 3)

async def main():
    hasil = []
    for i, adegan in enumerate(ADEGAN):
        kal = []
        for j, (teks, tampil, laju, nada) in enumerate(adegan):
            nama = f'k{i + 1}{j + 1}.mp3'
            kata, dur = await satu(teks, laju, nada, os.path.join(out, nama))
            # ekor senyap di akhir berkas dibuang dari hitungan: kalimat selesai di kata terakhir
            akhir = round(kata[-1]['t'] + kata[-1]['d'], 3) if kata else dur
            kal.append({'file': nama, 'teks': tampil or teks, 'dur': dur, 'akhir': akhir, 'kata': kata, 'tanya': teks.endswith('?')})
        hasil.append(kal)
    json.dump({'suara': suara, 'adegan': hasil}, open(os.path.join(out, 'narasi2.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    n = sum(len(k['kata']) for a in hasil for k in a)
    print(suara, 'kalimat', sum(len(a) for a in hasil), 'kata', n, 'detik bicara', round(sum(k['akhir'] for a in hasil for k in a), 1))

asyncio.run(main())
