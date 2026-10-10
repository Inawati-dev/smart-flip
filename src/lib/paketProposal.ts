import { supabase, isSupabaseConfigured } from './supabase'
import type { FinalProject, FinalSubmission, RubrikKriteria } from './tugasAkhir'
import { awalMinggu, jadwalTopik } from './jadwal'

// Paket Rancangan Proposal (antrean #179, keputusan Johan 10 dan 11 Okt 2026).
// Empat Mini Projek berurutan: Bab 1 dari Topik 1 sampai 3, Bab 2 dari Topik 4,
// Bab 3 dari Topik 5 dan 6, lalu Rancangan Proposal Lengkap. Tiap bab satu
// berkas .docx; Aktivitas Mandiri tidak diunggah sendiri tetapi dilampirkan.
// Tiga bab digabung mahasiswa sendiri, bukan oleh sistem. Skema: migration_v37.
// Rancangan layar: canvas "Mini Projek Rancangan Proposal" (23 papan).

export interface BagianBab {
  no: string
  nama: string
  /** Bahan yang dipakai menulis bagian ini. */
  bahan: string
}

export interface BabPaket {
  urutan: 1 | 2 | 3 | 4
  judul: string
  ringkas: string
  /** Nomor urut topik sumber (1 = topik pertama mata kuliah). */
  topik: number[]
  /** Bab terbuka saat topik ini dibuka jadwal; null = sesudah Bab 3 dinilai. */
  bukaTopik: number | null
  syarat: string
  /** Persen sumbangan ke nilai Mini Projek; usulan awal, bisa diubah dosen. */
  bobot: number
  /** Bab 3: tautan prototipe wajib diisi saat mengirim. */
  butuhTautan: boolean
  templat: string
  bagian: BagianBab[]
  lampiran: string
  /** Daftar periksa di jendela kirim; semua harus dicentang. */
  periksa: string[]
  rubrik: RubrikKriteria[]
}

const k = (nama: string, ukur: string, bobot: number): RubrikKriteria => ({ nama, ukur, bobot })

export const PAKET_PROPOSAL: BabPaket[] = [
  {
    urutan: 1,
    judul: 'Bab 1 · Pendahuluan',
    ringkas: 'Latar belakang, identifikasi dan rumusan masalah, tujuan dan manfaat, spesifikasi produk. Bahannya dari Aktivitas Mandiri Topik 1, 2, 3.',
    topik: [1, 2, 3],
    bukaTopik: 1,
    syarat: 'Terbuka Sesudah Topik 1',
    bobot: 20,
    butuhTautan: false,
    templat: '/templat/Templat-Bab-1-Pendahuluan.docx',
    bagian: [
      { no: '1.1', nama: 'Latar Belakang Masalah', bahan: 'Dari Topik 2: catatan observasi, wawancara, studi pendahuluan. Dari Topik 3: draf latar belakang.' },
      { no: '1.2', nama: 'Identifikasi Masalah', bahan: 'Dari Topik 1: masalah dalam 2 sampai 3 kalimat. Dari Topik 2: tiga alternatif topik berskor.' },
      { no: '1.3', nama: 'Rumusan Masalah', bahan: 'Dari Topik 3: satu sampai dua rumusan masalah berbentuk pertanyaan.' },
      { no: '1.4', nama: 'Tujuan dan Manfaat', bahan: 'Dari Topik 3: tujuan terukur, manfaat praktis dan teoretis.' },
      { no: '1.5', nama: 'Spesifikasi Produk', bahan: 'Dari Topik 3: tabel spesifikasi produk, ruang lingkup, dan definisi operasional.' },
    ],
    lampiran: 'Lampirkan hasil Aktivitas Mandiri Topik 1, 2, dan 3 di akhir berkas yang sama.',
    periksa: ['Lima bagian terisi', 'Lampiran AM-1, AM-2, AM-3 ada'],
    rubrik: [
      k('Latar Belakang Masalah', 'Alur dari konteks ke bukti ke urgensi, memakai data observasi dan wawancara', 25),
      k('Identifikasi Masalah', 'Masalah spesifik, bisa diamati, dan dipilih dengan alasan', 20),
      k('Rumusan Masalah', 'Berbentuk pertanyaan dan selaras dengan identifikasi masalah', 15),
      k('Tujuan dan Manfaat', 'Tujuan terukur dan menjawab rumusan; manfaat praktis dan teoretis', 20),
      k('Spesifikasi Produk', 'Bentuk, isi, pengguna, dan batasan produk jelas', 20),
    ],
  },
  {
    urutan: 2,
    judul: 'Bab 2 · Landasan Teori',
    ringkas: 'Kajian teori per tema, penelitian relevan, kerangka berpikir. Bahannya dari Aktivitas Mandiri Topik 4.',
    topik: [4],
    bukaTopik: 4,
    syarat: 'Terbuka Sesudah Topik 4',
    bobot: 20,
    butuhTautan: false,
    templat: '/templat/Templat-Bab-2-Landasan-Teori.docx',
    bagian: [
      { no: '2.1', nama: 'Kajian Teori per Tema', bahan: 'Dari Topik 4: outline tema dan paragraf sintesis tiap tema.' },
      { no: '2.2', nama: 'Penelitian yang Relevan', bahan: 'Dari Topik 4: tabel minimal tiga penelitian yang relevan.' },
      { no: '2.3', nama: 'Kerangka Berpikir', bahan: 'Dari Topik 4: gambar empat kotak dan satu paragraf penjelasan.' },
    ],
    lampiran: 'Lampirkan hasil Aktivitas Mandiri Topik 4 di akhir berkas yang sama.',
    periksa: ['Tiga bagian terisi', 'Rujukan bab ada', 'Lampiran AM-4 ada'],
    rubrik: [
      k('Kajian Teori per Tema', 'Tiap tema berupa sintesis minimal dua sumber, bukan deretan kutipan', 40),
      k('Penelitian yang Relevan', 'Minimal 3 penelitian; persamaan dan perbedaan dengan proyek jelas', 25),
      k('Kerangka Berpikir', 'Alur dari masalah ke produk ke hasil runtut dan dijelaskan', 25),
      k('Kutipan dan Rujukan', 'Tiap kutipan punya rujukan, format APA edisi ke-7', 10),
    ],
  },
  {
    urutan: 3,
    judul: 'Bab 3 · Model Pengembangan',
    ringkas: 'Model dan alasannya, prosedur per tahap, validasi ahli dan uji coba, instrumen, teknik analisis data, prototipe produk. Bahannya dari Aktivitas Mandiri Topik 5 dan 6.',
    topik: [5, 6],
    bukaTopik: 5,
    syarat: 'Terbuka Sesudah Topik 5',
    bobot: 25,
    butuhTautan: true,
    templat: '/templat/Templat-Bab-3-Model-Pengembangan.docx',
    bagian: [
      { no: '3.1', nama: 'Model dan Alasannya', bahan: 'Dari Topik 5: model terpilih dan alasan 3 sampai 5 kalimat.' },
      { no: '3.2', nama: 'Prosedur per Tahap', bahan: 'Dari Topik 5: tabel kerja tahap model, ditulis ulang sebagai satu paragraf per tahap.' },
      { no: '3.3', nama: 'Validasi Ahli dan Uji Coba', bahan: 'Dari Topik 5: validator ahli, sasaran uji coba, tiga sampai lima kriteria validasi.' },
      { no: '3.4', nama: 'Instrumen', bahan: 'Dari Topik 6: jenis instrumen dan minimal 8 butir.' },
      { no: '3.5', nama: 'Teknik Analisis Data', bahan: 'Dari Topik 6: teknik analisis dan rencana responden, waktu, cara analisis.' },
      { no: '3.6', nama: 'Prototipe Produk', bahan: 'Dari Topik 5: flowchart ditempel di berkas; tautan prototipe diisi saat mengirim.' },
    ],
    lampiran: 'Lampirkan hasil Aktivitas Mandiri Topik 5 dan 6 di akhir berkas yang sama.',
    periksa: ['Enam bagian terisi', 'Lampiran AM-5 dan AM-6 ada'],
    rubrik: [
      k('Model dan Alasannya', 'Alasan dikaitkan dengan ciri proyek', 15),
      k('Prosedur per Tahap', 'Narasi tiap tahap memuat kegiatan, pelaku, keluaran, dan waktu', 20),
      k('Validasi Ahli dan Uji Coba', 'Validator, sasaran uji coba, dan kriteria jelas', 15),
      k('Instrumen', 'Minimal 8 butir, jelas, tidak bermakna ganda', 20),
      k('Teknik Analisis Data', 'Sesuai jenis data dan instrumen', 10),
      k('Prototipe Produk', 'Flowchart runtut; tautan prototipe bisa dibuka dan cocok dengan spesifikasi produk', 20),
    ],
  },
  {
    urutan: 4,
    judul: 'Rancangan Proposal Lengkap',
    ringkas: 'Sistem tidak menggabungkan berkas: unduh ketiga bab, tempel ke templat, perbaiki menurut umpan balik, susun Daftar Pustaka, lalu kirim satu berkas.',
    topik: [1, 2, 3, 4, 5, 6],
    bukaTopik: null,
    syarat: 'Terbuka Sesudah Bab 3 Dinilai',
    bobot: 35,
    butuhTautan: false,
    templat: '/templat/Templat-Rancangan-Proposal.docx',
    bagian: [
      { no: 'Bab 1', nama: 'Pendahuluan', bahan: 'Bab 1 yang sudah dinilai, diperbaiki menurut umpan balik.' },
      { no: 'Bab 2', nama: 'Landasan Teori', bahan: 'Bab 2 yang sudah dinilai, diperbaiki menurut umpan balik.' },
      { no: 'Bab 3', nama: 'Model Pengembangan', bahan: 'Bab 3 yang sudah dinilai, diperbaiki menurut umpan balik.' },
      { no: 'Penutup', nama: 'Daftar Pustaka', bahan: 'Gabungan rujukan ketiga bab: tanpa kembar, urut abjad, format APA edisi ke-7.' },
    ],
    lampiran: 'Buang lampiran Aktivitas Mandiri dan bagian Rujukan Bab Ini dari tiap bab sebelum digabung.',
    periksa: ['Bab 1, 2, 3 digabung', 'Perbaikan dari umpan balik sudah dikerjakan', 'Daftar Pustaka gabungan ada'],
    rubrik: [
      k('Perbaikan Menurut Umpan Balik', 'Catatan dosen di tiap bab sudah dikerjakan', 40),
      k('Keterpaduan Antarbab', 'Rumusan, tujuan, teori, dan metode saling cocok', 25),
      k('Daftar Pustaka', 'Lengkap, tanpa kembar, urut abjad, format APA edisi ke-7', 20),
      k('Tata Tulis dan Format', 'Mengikuti templat; bahasa baku dan rapi', 15),
    ],
  },
]

export const BOBOT_BAWAAN = PAKET_PROPOSAL.map((b) => b.bobot)

export function babPaket(urutan: number | null | undefined): BabPaket | null {
  return PAKET_PROPOSAL.find((b) => b.urutan === urutan) ?? null
}

/** Brief satu paket, urut Bab 1 sampai Rancangan Proposal. Paket terbaru bila dosen membuat lebih dari satu. */
export function briefPaket(projects: FinalProject[]): FinalProject[] {
  const terbaru = projects.find((p) => p.paket_id && p.urutan != null)
  if (!terbaru) return []
  return projects
    .filter((p) => p.paket_id === terbaru.paket_id && p.urutan != null)
    .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))
}

export type StatusBab = 'terkunci' | 'belum' | 'terkirim' | 'dinilai'

/**
 * Keadaan satu bab untuk mahasiswa. Kiriman yang sudah ada selalu menang atas
 * kunci, supaya bab yang telanjur dikirim tidak tampak terkunci bila jadwal
 * diubah dosen. `topikTerbuka(n)`: apakah topik ke-n sudah dibuka jadwal.
 */
export function statusBab(
  bab: BabPaket,
  kiriman: Pick<FinalSubmission, 'graded_at'> | null | undefined,
  topikTerbuka: (nomor: number) => boolean,
  bab3Dinilai: boolean,
): StatusBab {
  if (kiriman) return kiriman.graded_at ? 'dinilai' : 'terkirim'
  const terbuka = bab.bukaTopik == null ? bab3Dinilai : topikTerbuka(bab.bukaTopik)
  return terbuka ? 'belum' : 'terkunci'
}

type ModulJadwal = { id: number; minggu_mulai?: number | null }

/**
 * Pembuat `topikTerbuka` untuk statusBab: topik ke-n terbuka bila tanggal
 * materinya sudah lewat. Tanpa tanggal mulai kuliah tidak ada kunci tanggal
 * (aturan jadwal.ts), jadi semua topik dianggap terbuka.
 */
export function topikTerbukaDari(
  mulai: string | null | undefined,
  modulesUrut: ModulJadwal[],
  now: Date = new Date(),
): (nomor: number) => boolean {
  const jadwal = jadwalTopik(mulai, modulesUrut)
  if (!jadwal) return () => true
  return (nomor) => {
    const j = jadwal.get(modulesUrut[nomor - 1]?.id)
    // Mata kuliah yang topiknya lebih sedikit tidak punya jadwal untuk topik ini;
    // dianggap terbuka supaya bab tidak terkunci selamanya.
    return !j || now.getTime() >= j.materi.getTime()
  }
}

/**
 * Tenggat usulan tiap bab saat paket dibuat: awal minggu sesudah dua minggu
 * topik sumber terakhirnya selesai. Null tanpa jadwal dan untuk Rancangan
 * Proposal (tenggatnya diisi dosen).
 */
export function tenggatBawaan(mulai: string | null | undefined, modulesUrut: ModulJadwal[]): Array<string | null> {
  const jadwal = jadwalTopik(mulai, modulesUrut)
  return PAKET_PROPOSAL.map((bab) => {
    if (!jadwal || !mulai || bab.bukaTopik == null) return null
    const j = jadwal.get(modulesUrut[Math.max(...bab.topik) - 1]?.id)
    return j ? awalMinggu(mulai, j.minggu + 2).toISOString() : null
  })
}

/** Jumlah bobot harus tepat 100 dan tiap bobot bilangan bulat 0 sampai 100. */
export function bobotSah(bobot: number[]): boolean {
  return (
    bobot.length === PAKET_PROPOSAL.length &&
    bobot.every((b) => Number.isInteger(b) && b >= 0 && b <= 100) &&
    bobot.reduce((a, b) => a + b, 0) === 100
  )
}

/** Bobot tersimpan keempat brief; kembali ke bawaan bila ada yang kosong atau jumlahnya bukan 100. */
export function bobotPaket(briefs: FinalProject[]): number[] {
  const tersimpan = briefs.map((b) => b.bobot ?? NaN)
  return bobotSah(tersimpan) ? tersimpan : BOBOT_BAWAAN
}

/** Nilai Mini Projek = jumlah nilai tiap bab kali bobotnya. Null selama masih ada bab yang belum dinilai. */
export function nilaiMiniProjek(bobot: number[], total: Array<number | null | undefined>): number | null {
  if (!bobotSah(bobot) || total.length !== bobot.length) return null
  let jumlah = 0
  for (let i = 0; i < bobot.length; i++) {
    const t = total[i]
    if (t == null || Number.isNaN(t)) return null
    jumlah += t * bobot[i]
  }
  return Math.round(jumlah / 100)
}

/** Tautan prototipe Bab 3: wajib http atau https. */
export function tautanSah(link: string): boolean {
  return /^https?:\/\/\S+\.\S+$/i.test(link.trim())
}

const PESAN_V37 = 'Kolom paket belum ada di basis data. Jalankan database/migration_v37_paket_proposal.sql di Supabase, lalu coba lagi.'

function kolomHilang(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null
  return !!err && (err.code === '42703' || err.code === 'PGRST204')
}

/** Dosen: buat empat brief sekaligus. `tenggat[i]` untuk bab ke-(i+1), boleh null. */
export async function buatPaketProposal(input: {
  dosenId: string
  classIds: string[]
  courseId?: number
  tenggat: Array<string | null>
}): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Membuat paket proposal butuh koneksi Supabase, tidak tersedia di mode demo.')
  const paketId = crypto.randomUUID()
  const rows = PAKET_PROPOSAL.map((b, i) => ({
    dosen_id: input.dosenId,
    title: b.judul,
    description: b.ringkas,
    deadline: input.tenggat[i] ?? null,
    rubric: b.rubrik,
    class_ids: input.classIds,
    is_open: true,
    paket_id: paketId,
    urutan: b.urutan,
    bobot: b.bobot,
    ...(input.courseId != null ? { course_id: input.courseId } : {}),
  }))
  const { error } = await supabase.from('tugas_akhir_briefs').insert(rows)
  if (error) throw kolomHilang(error) ? new Error(PESAN_V37) : error
}

/** Dosen: ubah bobot keempat bab. `bobot[i]` untuk `briefs[i]`. */
export async function simpanBobotPaket(briefs: FinalProject[], bobot: number[]): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Mengubah bobot butuh koneksi Supabase.')
  if (briefs.length !== bobot.length || !bobotSah(bobot)) throw new Error('Jumlah keempat bobot harus 100.')
  const hasil = await Promise.all(briefs.map((b, i) => supabase.from('tugas_akhir_briefs').update({ bobot: bobot[i] }).eq('id', b.id)))
  const gagal = hasil.find((r) => r.error)
  if (gagal?.error) throw kolomHilang(gagal.error) ? new Error(PESAN_V37) : gagal.error
}

// ── Aktivitas Mandiri per topik (panel di halaman topik) ──
// Langkahnya disalin dari naskah modul Bab 1 sampai 6 (kerja nyata/Naskah
// sampai Aktivitas Mandiri, keadaan 11 Okt 2026). Aktivitas ini tidak diunggah
// sendiri: hasilnya dilampirkan di berkas bab Mini Projek yang memakainya.

export interface AktivitasMandiri {
  /** Nomor urut topik, 1 sampai 6. */
  topik: number
  langkah: string[]
  /** Urutan bab Mini Projek yang memakai hasilnya. */
  bab: 1 | 2 | 3
  /** Bagian proposal yang memakai hasilnya. */
  dipakai: string[]
}

export const AKTIVITAS_MANDIRI: AktivitasMandiri[] = [
  {
    topik: 1,
    bab: 1,
    dipakai: ['1.2 Identifikasi Masalah'],
    langkah: [
      'Kunjungi kembali catatan PKL/magang Anda, atau amati satu unit kerja di lingkungan kampus (perpustakaan, laboratorium, unit layanan mahasiswa) selama minimal 30 menit',
      'Identifikasi satu masalah operasional yang Anda lihat/alami (contoh: proses peminjaman buku yang lambat, alur antrean yang tidak efisien)',
      'Tuliskan masalah tersebut dalam 2-3 kalimat yang jelas dan spesifik (bukan opini, tapi kondisi yang bisa diamati)',
      'Klasifikasikan: apakah masalah ini lebih cocok didekati secara kuantitatif, kualitatif, atau langsung R&D? Jelaskan alasan Anda dalam 3-5 kalimat',
      'Susun hasil Langkah 1-4 dalam format tabel sederhana (Masalah | Lokasi Pengamatan | Paradigma yang Dipilih | Alasan)',
      'Simpan tabel tersebut sebagai berkas AM-1. Tabel tulisan tangan boleh difoto lalu ditempel ke berkas Word',
    ],
  },
  {
    topik: 2,
    bab: 1,
    dipakai: ['1.1 Latar Belakang Masalah', '1.2 Identifikasi Masalah'],
    langkah: [
      'Pilih satu lokasi pengamatan: tempat PKL/magang Anda, atau jika belum ada, unit layanan di kampus/lingkungan sekitar',
      'Lakukan observasi singkat (30-45 menit) dan catat minimal 3 hal yang menurut Anda berpotensi menjadi masalah',
      'Lakukan wawancara singkat (5-10 menit) dengan 1-2 orang yang terlibat langsung di lokasi tersebut, tanyakan pengalaman dan kendala mereka',
      'Dari hasil observasi dan wawancara, rumuskan 3 alternatif topik proyek yang mungkin dikembangkan',
      'Uji ketiga alternatif tersebut dengan kriteria kelayakan, kebermanfaatan, dan keterjangkauan; beri skor 1-3 pada masing-masing kriteria',
      'Pilih satu topik dengan skor tertinggi, lalu tuliskan studi pendahuluan singkat (setengah halaman) yang menjelaskan bukti bahwa masalah ini nyata terjadi',
    ],
  },
  {
    topik: 3,
    bab: 1,
    dipakai: ['1.1 Latar Belakang Masalah', '1.3 Rumusan Masalah', '1.4 Tujuan dan Manfaat', '1.5 Spesifikasi Produk'],
    langkah: [
      'Buka kembali topik dan studi pendahuluan yang telah Anda susun di Bab 2',
      'Tulis draft latar belakang mengikuti alur: konteks umum -> data/bukti masalah -> urgensi (minimal 3 paragraf)',
      'Ubah masalah yang Anda pilih di Bab 2 menjadi 1-2 rumusan masalah berbentuk pertanyaan: satu tentang produk yang dikembangkan dan satu tentang kelayakannya',
      'Rumuskan 1-2 tujuan proyek yang spesifik dan terukur (gunakan kata kerja aktif seperti "menghasilkan", "merancang", "menguji")',
      'Tuliskan ruang lingkup dan batasan proyek (apa yang termasuk dan tidak termasuk dalam proyek Anda)',
      'Tuliskan manfaat proyek dari dua sisi: manfaat praktis (bagi pengguna/industri) dan manfaat teoretis (bagi keilmuan/pembelajaran)',
      'Susun definisi operasional untuk minimal 2 istilah kunci dalam proyek Anda',
      'Isi tabel spesifikasi produk dengan enam baris: nama produk, bentuk, isi atau fitur utama, pengguna sasaran, tempat dipakai, dan batasan',
      'Gabungkan seluruh komponen menjadi satu draf dan simpan sebagai berkas AM-3. Susun Bab 1 Pendahuluan proposal dari AM-1, AM-2, dan AM-3, lalu kirim melalui menu Mini Projek di Smart Flip 5.0 untuk mendapat nilai dan umpan balik dosen',
    ],
  },
  {
    topik: 4,
    bab: 2,
    dipakai: ['2.1 Kajian Teori per Tema', '2.2 Penelitian yang Relevan', '2.3 Kerangka Berpikir'],
    langkah: [
      'Tentukan 2-3 tema utama yang perlu dibahas dalam kajian pustaka Anda, berdasarkan topik yang telah ditetapkan di Bab 2-3',
      'Telusuri minimal 5 sumber relevan dari industri/praktik dan dari kalangan akademik, minimal 3 di antaranya berupa hasil penelitian, melalui mesin pencari jurnal seperti Google Scholar atau Garuda, atau sumber lain yang kredibel',
      'Susun outline kajian pustaka: kelompokkan kelima sumber tersebut ke dalam 2-3 tema yang telah ditentukan',
      'Pilih satu tema, lalu kembangkan menjadi satu paragraf utuh (minimal 150 kata) yang memadukan minimal 2 sumber dengan teknik parafrase',
      'Pastikan setiap kutipan/rujukan dalam paragraf tersebut dicantumkan sesuai format APA edisi ke-7',
      'Kembangkan tema lainnya dengan cara yang sama, sehingga setiap tema memiliki minimal satu paragraf sintesis',
      'Dari sumber yang terkumpul, pilih minimal 3 yang berupa hasil penelitian, lalu isi tabel penelitian yang relevan (Peneliti dan Tahun | Temuan Kunci | Persamaan dengan Proyek Saya | Perbedaan dengan Proyek Saya)',
      'Gambar kerangka berpikir empat kotak (masalah di lapangan, teori dan penelitian yang dipakai, produk yang dikembangkan, hasil yang diharapkan) dan jelaskan alurnya dalam satu paragraf',
      'Simpan outline, paragraf tiap tema, tabel penelitian yang relevan, dan kerangka berpikir sebagai berkas AM-4',
    ],
  },
  {
    topik: 5,
    bab: 3,
    dipakai: ['3.1 Model dan Alasannya', '3.2 Prosedur per Tahap', '3.3 Validasi Ahli dan Uji Coba', '3.6 Prototipe Produk'],
    langkah: [
      'Baca kembali karakteristik proyek Anda (jenis produk, tenggat waktu, kebutuhan pengulangan siklus)',
      'Gunakan Tabel 5.5 (perbandingan tujuh model pengembangan) untuk memperoleh pilihan awal',
      'Bandingkan pilihan awal tersebut dengan pertimbangan pribadi Anda; tetapkan satu model pengembangan (4D, ADDIE, Waterfall, Borg & Gall, XP, GDLC, atau RAD) untuk proyek Anda',
      'Tuliskan alasan pemilihan model tersebut dalam 3-5 kalimat, dikaitkan dengan karakteristik proyek Anda',
      'Isi tabel kerja tahap model (Tahap | Kegiatan di Proyek Saya | Keluaran | Perkiraan Waktu), lalu tulis ulang setiap baris menjadi satu paragraf',
      'Rancang skema tahapan validasi produk: tentukan siapa yang akan menjadi validator ahli (misalnya dosen pembimbing, praktisi industri) dan siapa target uji coba pengguna',
      'Susun draf kriteria validasi awal (3-5 poin) yang akan dinilai oleh validator ahli nantinya',
      'Gambar flowchart alur produk Anda, lalu buat prototipe awal di Figma atau alat sejenis dan simpan tautannya',
      'Gabungkan seluruh hasil menjadi satu dokumen dan simpan sebagai berkas AM-5',
    ],
  },
  {
    topik: 6,
    bab: 3,
    dipakai: ['3.4 Instrumen', '3.5 Teknik Analisis Data'],
    langkah: [
      'Tentukan jenis instrumen yang paling sesuai untuk menguji produk Anda (angket, pedoman wawancara, lembar observasi, atau kombinasi)',
      'Rancang minimal 8 butir instrumen (misalnya 8 pertanyaan angket atau 8 poin lembar validasi), pastikan setiap butir jelas dan tidak bermakna ganda',
      'Periksa setiap butir dengan kriteria pada Tabel 6.4, lalu minta satu teman membacanya dan menandai butir yang membingungkan; revisi jika diperlukan',
      'Tentukan teknik analisis data yang akan digunakan (deskriptif, tematik, atau kombinasi) sesuai jenis data yang akan dikumpulkan',
      'Susun rencana singkat (setengah halaman) yang menjelaskan: siapa target responden/subjek, kapan data akan dikumpulkan, dan bagaimana data akan dianalisis',
      'Gabungkan instrumen dan rencana analisis data menjadi satu dokumen dan simpan sebagai berkas AM-6',
    ],
  },
]

export function aktivitasTopik(nomor: number): AktivitasMandiri | null {
  return AKTIVITAS_MANDIRI.find((a) => a.topik === nomor) ?? null
}
