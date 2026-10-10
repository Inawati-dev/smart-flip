#!/usr/bin/env python3
"""Pemeriksa HURUF BESAR TIAP KATA untuk teks berposisi label (antrean #154).

Jalankan dari akar repo:  python scripts/cek_huruf_judul.py
Keluaran: `berkas:baris: [jenis] teks` per temuan, lalu `gagal = N`. Keluar 1 bila N > 0.

Yang diperiksa (src/pages/*.tsx, src/components/*.tsx; src/lib/*.ts hanya untuk butir 3-5; uji dilewati):
  1. teks di dalam <button>, <h1>-<h4>, <th>, <label>, <legend>, <option>, <summary>;
     <Link>/<NavLink> apa pun dan <a> berkelas btn; elemen berkelas uppercase, step-pill, nav-tile;
     span/div/p berkelas rounded-full (pil, lencana, chip)
  2. elemen biasa yang isinya satu ekspresi, mis. <span>{a ? 'Daftar kelas' : ...}</span> (jenis `ekspresi`)
  3. nilai label= / judul= / finishLabel= / linkLabel= (bukan aria-label) dan label: / judul: di objek,
     termasuk nilai bawaan parameter (`label = 'Pilih berkas'`)
  4. konstanta `const ..._LABEL(S) = {...}` dan larik string yang di-.map() (kepala kolom)
  5. kandidat umum: elemen apa pun berteks 2-5 kata tanpa titik di akhir (jenis `umum`)
Teks berakhiran titik atau memuat ". " dianggap kalimat dan dilewati. Teks lebih dari 7 kata di posisi
bukan-judul dicetak di bagian "ragu" (tidak dihitung gagal) supaya tidak lolos diam-diam.

Aturan kata: tiap kata diawali huruf besar kecuali kata tugas (dan, di, ke, dari, yang,
untuk, atau, pada, dengan, per, oleh, dalam, sebagai) yang bukan kata pertama, kata
satuan tepat sesudah angka atau isian `${...}` (jadi "18 hal"), keterangan dalam kurung
("(opsional)"), dan bagian sesudah tanda hubung ("Pre-test").

PENGECUALIAN: (berkas, teks) -> alasan; dipakai untuk kalimat/keterangan yang sengaja tetap huruf kalimat.
DITUNDA: berkas yang sedang disunting agen lain; temuannya dicetak terpisah dan tidak dihitung ke gagal.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIRS = ['src/pages', 'src/components']

STOP = {'dan', 'di', 'ke', 'dari', 'yang', 'untuk', 'atau', 'pada', 'dengan', 'per', 'oleh', 'dalam', 'sebagai'}

# (nama berkas, teks) -> alasan. Teks persis seperti dicetak skrip.
KALIMAT_PESAN = 'pesan kosong/galat/proses: tetap huruf kalimat'
POTONGAN = 'potongan kalimat di sekitar tag <code>/<strong>: tetap huruf kalimat'
HITUNGAN = 'frasa hitungan (angka + satuan + keterangan) di pil: tetap huruf kalimat'
BUTIR = 'butir daftar fitur/ajakan berbentuk kalimat pendek: tetap huruf kalimat'
TAUTAN = 'tautan di tengah kalimat, bukan tombol: tetap huruf kalimat'
SKOR = 'keterangan sebaris di dalam kalimat ("Skor kamu: <b>80</b>"): tetap huruf kalimat'
KETERANGAN = 'keterangan status/baris info di bawah judul, bukan label: tetap huruf kalimat'
PENGECUALIAN = {
    ('AsesmenMhs.tsx', 'dari 100'): 'lanjutan angka ("80 dari 100"): satuan, bukan label',
    ('Dashboard.tsx', '§ perlu perhatian'): HITUNGAN,
    ('ResetPassword.tsx', '&quot;Lupa kata sandi?&quot;'): POTONGAN,
    ('Akun.tsx', 'Belum bergabung kelas'): KETERANGAN,
    ('Dashboard.tsx', 'Belum bergabung kelas'): KETERANGAN,
    ('AsesmenMhs.tsx', 'Memuat topik…'): KALIMAT_PESAN,
    ('Modul.tsx', 'Belum mulai membaca'): KETERANGAN,
    ('Modul.tsx', 'Halaman terakhir: §'): KETERANGAN,
    ('Modul.tsx', 'Sudah dibaca'): KETERANGAN,
    ('ModulList.tsx', 'Dibuka untuk mahasiswa'): KETERANGAN,
    ('ModulList.tsx', 'Ditutup, mahasiswa tidak melihatnya'): KETERANGAN,
    ('ModulList.tsx', 'Mulai kuliah: §'): KETERANGAN,
    ('ModulList.tsx', 'Tanggal mulai kuliah belum diatur'): KETERANGAN,
    ('ModulList.tsx', 'Belum dibaca'): KETERANGAN,
    ('ModulList.tsx', 'Selesai dibaca'): KETERANGAN,
    ('Dashboard.tsx', 'Belum ada yang perlu diperhatikan'): KALIMAT_PESAN,
    ('Formatif.tsx', 'Topik tidak ditemukan'): KALIMAT_PESAN,
    ('Modul.tsx', 'Modul tidak ditemukan'): KALIMAT_PESAN,
    ('FileInput.tsx', 'Belum ada berkas dipilih'): KALIMAT_PESAN,
    ('GrafikBatang.tsx', 'Belum ada data'): KALIMAT_PESAN,
    ('Select.tsx', 'Tidak ada opsi'): KALIMAT_PESAN,
    ('ResetPassword.tsx', 'Memverifikasi token…'): KALIMAT_PESAN,
    ('ResetPassword.tsx', 'Password berhasil diperbarui!'): KALIMAT_PESAN,
    ('ResetPassword.tsx', 'Anda sedang dalam'): POTONGAN,
    ('ResetPassword.tsx', 'Dari halaman login, klik'): POTONGAN,
    ('Kelas.tsx', 'Unggah file CSV dengan kolom'): POTONGAN,
    ('Kelas.tsx', 'nama, nim, email'): 'nama kolom CSV di dalam <code>: nilai teknis, bukan label',
    ('Kelas.tsx', 'Anda akan membuat'): POTONGAN,
    ('Kelas.tsx', 'Password hanya ditampilkan'): POTONGAN,
    ('Kelas.tsx', 'satu kali di sini'): POTONGAN,
    ('Kelas.tsx', '§ baris valid'): HITUNGAN,
    ('Kelas.tsx', '§ baris tidak valid (dilewati)'): HITUNGAN,
    ('Kelas.tsx', '§ kelas penuh'): HITUNGAN,
    ('ModulList.tsx', '§: belum dipakai'): 'opsi berisi nama berkas dari data + keterangan: tetap',
    ('Login.tsx', 'Daftar di sini'): TAUTAN,
    ('Register.tsx', 'Masuk di sini'): TAUTAN,
    ('Login.tsx', 'Asesmen gaya belajar VARK'): BUTIR,
    ('Login.tsx', 'Progres tersimpan, sinkron lintas perangkat'): BUTIR,
    ('Login.tsx', 'Baca modul interaktif per-bab'): BUTIR,
    ('Login.tsx', 'Progress tersimpan otomatis'): BUTIR,
    ('Login.tsx', 'Sinkron lintas perangkat'): BUTIR,
    ('Ebook.tsx', '§ · ketuk tengah untuk kendali'): 'petunjuk berbentuk kalimat di dalam pil halaman: tetap',
    ('PembacaPdf.tsx', '§ · ketuk tengah untuk kendali'): 'petunjuk berbentuk kalimat di dalam pil halaman: tetap',
    ('Formatif.tsx', 'Skor terbaik kamu:'): SKOR,
    ('Formatif.tsx', 'Skor terbaik kamu sebelumnya:'): SKOR,
    ('TesKelompok.tsx', 'Skor kamu:'): SKOR,
    ('TesKhusus.tsx', 'Skor kamu:'): SKOR,
    ('JadwalModal.tsx', 'Belum ada tanggal mulai'): KETERANGAN,
    ('JadwalModal.tsx', 'Minggu tidak sah'): KETERANGAN,
    ('AsesmenMhs.tsx', 'Skor post-test:'): SKOR,
    ('analitik.ts', 'Posting baru di Forum Modul §'): 'baris umpan aktivitas berbentuk kalimat: tetap',
}

# Berkas yang sedang disunting agen lain; temuannya dicetak terpisah ("ditunda") dan
# tidak dihitung ke gagal. Kosong = skrip menghitung semuanya (sejak sisa #154 disapu).
DITUNDA = set()

LABEL_TAGS = {'button', 'h1', 'h2', 'h3', 'h4', 'th', 'label', 'legend', 'option', 'summary'}
HEADING_TAGS = {'h1', 'h2', 'h3', 'h4'}
LINK_TAGS = {'a', 'Link', 'NavLink'}
PROP_NAMES = ('label', 'judul', 'finishLabel', 'linkLabel')


# ---------------------------------------------------------------- pemindai dasar
def hapus_komentar(src: str) -> str:
    def blank(m):
        return re.sub(r'[^\n]', ' ', m.group(0))
    src = re.sub(r'/\*.*?\*/', blank, src, flags=re.S)
    # komentar // hanya bila didahului spasi/awal baris (bukan https://)
    src = re.sub(r'(?m)(^|(?<=[\s;,{(]))//[^\n]*', blank, src)
    return src


def lewati_string(s: str, i: int) -> int:
    """s[i] adalah kutip pembuka ' atau " atau `; kembalikan indeks sesudah penutup."""
    q = s[i]
    i += 1
    n = len(s)
    while i < n:
        c = s[i]
        if c == '\\':
            i += 2
            continue
        if q == '`' and c == '$' and i + 1 < n and s[i + 1] == '{':
            i = lewati_kurawal(s, i + 1)
            continue
        if c == q:
            return i + 1
        i += 1
    return n


def lewati_kurawal(s: str, i: int) -> int:
    """s[i] == '{'; kembalikan indeks sesudah '}' pasangannya."""
    depth = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c in '\'"`':
            i = lewati_string(s, i)
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return n


def buka_tag(s: str, i: int):
    """s[i] == '<' awal tag pembuka. Kembalikan (akhir, self_closing, atribut) atau None."""
    m = re.compile(r'<([A-Za-z][\w.]*)').match(s, i)
    if not m:
        return None
    j = m.end()
    n = len(s)
    while j < n:
        c = s[j]
        if c == '{':
            j = lewati_kurawal(s, j)
            continue
        if c in '"\'':
            j = lewati_string(s, j)
            continue
        if c == '/' and j + 1 < n and s[j + 1] == '>':
            return j + 2, True, s[m.end():j]
        if c == '>':
            return j + 1, False, s[m.end():j]
        j += 1
    return None


def cari_penutup(s: str, mulai: int, tag: str):
    """Cari </tag> pasangan mulai dari indeks `mulai` (sesudah tag pembuka)."""
    depth = 1
    pola = re.compile(r'<(/?)' + re.escape(tag) + r'(?=[\s/>])')
    for m in pola.finditer(s, mulai):
        if m.group(1):
            depth -= 1
            if depth == 0:
                return m.start()
        else:
            t = buka_tag(s, m.start())
            if t and not t[1]:
                depth += 1
    return None


def literal_dalam(expr: str):
    """Ambil literal string dari ekspresi JS. `${...}` jadi '§'. Tag JSX dibuang dulu."""
    # buang tag JSX (beserta atributnya) supaya className="..." tidak ikut
    bersih = []
    i = 0
    n = len(expr)
    while i < n:
        if expr[i] == '<' and re.match(r'<[A-Za-z/>]', expr[i:i + 2]):
            if expr[i + 1] == '/':
                k = expr.find('>', i)
                i = n if k < 0 else k + 1
                bersih.append(' ')
                continue
            t = buka_tag(expr, i)
            if t:
                i = t[0]
                bersih.append(' ')
                continue
        bersih.append(expr[i])
        i += 1
    e = ''.join(bersih)
    hasil = []
    i = 0
    n = len(e)
    while i < n:
        c = e[i]
        if c in '\'"':
            j = lewati_string(e, i)
            if not re.search(r'[=!]==?\s*$', e[:i]):  # 'x' pembanding (=== 'x') bukan teks tampil
                hasil.append(e[i + 1:j - 1])
            i = j
        elif c == '`':
            j = lewati_string(e, i)
            isi = e[i + 1:j - 1]
            # ganti ${...} dengan §
            out = []
            k = 0
            while k < len(isi):
                if isi.startswith('${', k):
                    e2 = lewati_kurawal(isi, k + 1)
                    out.append('§')
                    k = e2
                else:
                    out.append(isi[k])
                    k += 1
            hasil.append(''.join(out))
            i = j
        else:
            i += 1
    return hasil


def segmen_anak(anak: str):
    """Pecah anak elemen jadi segmen teks: satu run teks JSX (dengan § untuk ekspresi)
    ditambah tiap literal string di dalam ekspresi."""
    run = []
    literal = []
    i = 0
    n = len(anak)
    while i < n:
        c = anak[i]
        if c == '{':
            j = lewati_kurawal(anak, i)
            expr = anak[i + 1:j - 1]
            run.append('§')
            literal.extend(literal_dalam(expr))
            i = j
        elif c == '<':
            if i + 1 < n and anak[i + 1] == '/':
                k = anak.find('>', i)
                i = n if k < 0 else k + 1
                run.append(' ')
                continue
            t = buka_tag(anak, i)
            if t:
                i = t[0]
                run.append(' ')
                continue
            run.append(c)
            i += 1
        else:
            run.append(c)
            i += 1
    teks = re.sub(r'\s+', ' ', ''.join(run)).strip()
    # sisakan § hanya bila ada huruf lain
    segs = []
    if re.search(r'[A-Za-zÀ-ÖØ-öø-ÿ]', teks):
        segs.append(teks)
    for l in literal:
        l = re.sub(r'\s+', ' ', l).strip()
        if re.search(r'[A-Za-zÀ-ÖØ-öø-ÿ]', l):
            segs.append(l)
    return segs


# ---------------------------------------------------------------- aturan kata
def kata_salah(teks: str):
    """Daftar kata yang awalnya huruf kecil dan bukan pengecualian."""
    salah = []
    sesudah_angka = False
    for idx, tok in enumerate(teks.split(' ')):
        if '§' in tok:
            sesudah_angka = True
            continue
        if tok.startswith('('):  # keterangan dalam kurung, mis. "Tenggat (opsional)", tetap huruf kecil
            continue
        m = re.search(r'[A-Za-zÀ-ÖØ-öø-ÿ0-9]', tok)
        if not m:
            continue
        # token yang diawali tanda lain sebelum huruf (mis. "(opsional)") tetap diperiksa pada huruf pertamanya
        c = tok[m.start()]
        if c.isdigit():
            sesudah_angka = True
            continue
        if c.isupper():
            sesudah_angka = False
            continue
        bersih = re.sub(r'[^\w-]', '', tok).lower()
        if sesudah_angka:
            sesudah_angka = False
            continue
        if idx > 0 and bersih in STOP:
            continue
        salah.append(tok)
    return salah


def kalimat(teks: str) -> bool:
    t = teks.rstrip()
    if t.endswith('…') or t.endswith('...'):
        return False
    return t.endswith('.') or '. ' in t


# ---------------------------------------------------------------- pemeriksaan satu berkas
def periksa(path: Path, lib_saja: bool = False):
    asli = path.read_text(encoding='utf-8')
    src = hapus_komentar(asli)

    def baris(pos):
        return asli.count('\n', 0, pos) + 1

    temuan = []  # (baris, jenis, teks)
    ragu = []
    terlihat = set()

    def catat(pos, jenis, teks, judul=False):
        teks = teks.strip()
        if not teks or kalimat(teks) or re.match(r'(var\(|#|transparent|rgba?\()', teks):
            return
        if not kata_salah(teks):
            return
        if not judul and len(teks.split()) > 7:
            ragu.append((baris(pos), jenis, teks))
            return
        kunci = (baris(pos), teks)
        if kunci in terlihat:
            return
        terlihat.add(kunci)
        temuan.append((baris(pos), jenis, teks))

    # 1. elemen JSX
    for m in ([] if lib_saja else re.finditer(r'(?<![\w$)\].])<([A-Za-z][\w.]*)(?=[\s/>])', src)):
        tag = m.group(1)
        t = buka_tag(src, m.start())
        if not t:
            continue
        akhir, self_closing, attrs = t
        if self_closing:
            continue
        kelas = ''
        mk = re.search(r'className=(?:"([^"]*)"|\{(.*?)\}(?=\s|$))', attrs, flags=re.S)
        if mk:
            kelas = mk.group(1) or mk.group(2) or ''
        tokens_kelas = set(re.findall(r'[\w\[\].:%/-]+', kelas))
        jenis = None
        if tag in LABEL_TAGS:
            jenis = tag
        elif tag in ('Link', 'NavLink') or (tag == 'a' and 'btn' in kelas):
            jenis = tag + '.tautan'
        elif 'uppercase' in tokens_kelas:
            jenis = tag + '.uppercase'
        elif 'step-pill' in kelas or 'nav-tile' in kelas:
            jenis = tag + '.pill'
        elif tag in ('span', 'div', 'p') and 'rounded-full' in tokens_kelas:
            jenis = tag + '.pil'
        elif 'btn' in tokens_kelas:
            jenis = tag + '.btn'
        if not jenis:
            # elemen biasa yang isinya satu ekspresi, mis. <span>{a ? 'Daftar kelas' : ...}</span>:
            # literal 2-5 kata di dalamnya diperlakukan sebagai kandidat label
            tutup = cari_penutup(src, akhir, tag)
            if tutup is None:
                continue
            anak = src[akhir:tutup].strip()
            if anak.startswith('{') and lewati_kurawal(anak, 0) == len(anak):
                for lit in literal_dalam(anak[1:-1]):
                    lit = re.sub(r'\s+', ' ', lit).strip()
                    if 2 <= len(lit.split(' ')) <= 5 and lit[:1].isalpha():
                        catat(m.start(), 'ekspresi', lit)
            continue
        tutup = cari_penutup(src, akhir, tag)
        if tutup is None:
            continue
        for seg in segmen_anak(src[akhir:tutup]):
            catat(m.start(), jenis, seg, judul=tag in HEADING_TAGS)

    # 2. props string: label="..." / label={...}
    for m in re.finditer(r'(?<![\w-])(' + '|'.join(PROP_NAMES) + r')=', src):
        i = m.end()
        if src[i] == '"':
            j = lewati_string(src, i)
            segs = [src[i + 1:j - 1]]
        elif src[i] == '{':
            j = lewati_kurawal(src, i)
            segs = literal_dalam(src[i + 1:j - 1])
        else:
            continue
        for s in segs:
            catat(m.start(), 'prop ' + m.group(1), s, judul=True)

    # 3. properti objek: label: ... , judul: ...
    for m in re.finditer(r'(?<![\w-])(' + '|'.join(PROP_NAMES) + r')\s*:\s*', src):
        i = m.end()
        # baca ekspresi sampai koma/kurung penutup tingkat atas
        depth = 0
        j = i
        n = len(src)
        while j < n:
            c = src[j]
            if c in '\'"`':
                j = lewati_string(src, j)
                continue
            if c in '({[':
                depth += 1
            elif c in ')}]':
                if depth == 0:
                    break
                depth -= 1
            elif c == ',' and depth == 0:
                break
            elif c == '\n' and depth == 0 and not re.match(r'\s*[?:]', src[j + 1:j + 20]):
                break
            j += 1
        ekspr = src[i:j]
        # tipe (label: string) bukan nilai
        if re.match(r'(string|number|boolean|ReactNode)\b', ekspr.strip()):
            continue
        for s in literal_dalam(ekspr):
            catat(m.start(), 'obj ' + m.group(1), s, judul=True)

    # 3b. label bawaan parameter: ({ label = 'Pilih berkas' })
    for m in re.finditer(r"(?<![\w-])(" + '|'.join(PROP_NAMES) + r")\s*=\s*(['\"])", src):
        j = lewati_string(src, m.end() - 1)
        catat(m.start(), 'bawaan ' + m.group(1), src[m.end():j - 1], judul=True)

    # 3c. konstanta bernama *LABEL(S): nilai literalnya adalah label
    for m in re.finditer(r'\bconst\s+[A-Za-z_]*LABELS?\b[^=\n]*=\s*\{', src):
        j = lewati_kurawal(src, m.end() - 1)
        for sg in literal_dalam(src[m.end():j - 1]):
            catat(m.start(), 'konstanta LABEL', sg, judul=True)

    # 3d. larik string yang di-.map() (kepala kolom, opsi): ['Nama', 'Kelas'].map(
    for m in re.finditer(r"\[((?:\s*'[^'\n]*'\s*,?)+)\]\.map\(", src):
        for sg in literal_dalam(m.group(1)):
            catat(m.start(), 'larik.map', sg, judul=True)

    # 4. kandidat umum: teks pendek 2-5 kata di elemen apa pun
    for m in ([] if lib_saja else re.finditer(r'(?<!=)>([^<>{}=]{3,80})<', src)):
        teks = re.sub(r'\s+', ' ', m.group(1)).strip()
        w = teks.split(' ')
        if re.search(r'&&|\|\||=>|return|function|const|\(\s*$|^\w+\s*\(|\(null\)', teks):
            continue
        if 2 <= len(w) <= 5 and re.search(r'[A-Za-zÀ-ÖØ-öø-ÿ]', teks[:3]) and not kalimat(teks):
            catat(m.start(1), 'umum', teks)

    return sorted(temuan), sorted(ragu)


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    gagal = 0
    pengecualian_dipakai = 0
    ragu_semua = []
    ditunda = []
    for d in DIRS + ['src/lib']:
        lib = d == 'src/lib'
        for p in sorted((ROOT / d).glob('*.ts' if lib else '*.tsx')):
            if '.test.' in p.name:
                continue
            temuan, ragu = periksa(p, lib_saja=lib)
            for b, jenis, teks in temuan:
                if (p.name, teks) in PENGECUALIAN:
                    pengecualian_dipakai += 1
                    continue
                baris = f'{d}/{p.name}:{b}: [{jenis}] {teks}'
                if p.name in DITUNDA:
                    ditunda.append(baris)
                    continue
                print(baris)
                gagal += 1
            for b, jenis, teks in ragu:
                ragu_semua.append(f'{d}/{p.name}:{b}: [{jenis}] {teks}')
    if ragu_semua:
        print('--- ragu (tidak dihitung, teks panjang di posisi bukan-judul) ---')
        print(chr(10).join(ragu_semua))
    if ditunda:
        print('--- ditunda (berkas dikerjakan agen lain, tidak dihitung ke gagal) ---')
        print(chr(10).join(ditunda))
    print(f'pengecualian dipakai = {pengecualian_dipakai}')
    print(f'ditunda = {len(ditunda)}')
    print(f'gagal = {gagal}')
    sys.exit(1 if gagal else 0)


if __name__ == '__main__':
    main()
