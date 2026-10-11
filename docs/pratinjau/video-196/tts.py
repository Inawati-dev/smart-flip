import asyncio,sys,json,subprocess,os
import edge_tts
out=sys.argv[1]
baris=[
 ("s1","Saat PKL atau magang, adakah satu masalah yang Anda lihat setiap hari? Ada tiga paradigma untuk membacanya."),
 ("s2","Paradigma kuantitatif mengandalkan angka. Ia cocok ketika Anda perlu membuktikan seberapa besar sebuah masalah terjadi."),
 ("s3","Paradigma kualitatif menggali makna lewat wawancara atau observasi. Ia cocok ketika Anda perlu memahami mengapa sesuatu terjadi."),
 ("s4","Lalu ada R and D, penelitian dan pengembangan, yang menggabungkan riset dengan menciptakan dan menguji produk baru."),
 ("s5","Contohnya, sebuah ritel di Malang ingin mengurangi antrean kasir. Timnya mengukur waktu tunggu dan mewawancarai kasir, baru kemudian merancang kasir mandiri."),
 ("s6","Pahami dulu, baru kembangkan."),
]
async def main():
    meta=[]
    for id,teks in baris:
        f=os.path.join(out,id+'.mp3')
        await edge_tts.Communicate(teks,"id-ID-GadisNeural",rate="+6%").save(f)
        d=float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True).stdout.strip())
        meta.append({"id":id,"teks":teks,"dur":round(d,2)})
    json.dump(meta,open(os.path.join(out,'narasi.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
    print(json.dumps([(m['id'],m['dur']) for m in meta]), 'total',round(sum(m['dur'] for m in meta),1), 'kata',sum(len(m['teks'].split()) for m in meta))
asyncio.run(main())
