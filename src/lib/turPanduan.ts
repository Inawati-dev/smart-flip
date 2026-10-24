// Tur panduan menu (antrean #331, pola sesi Ndaru #88): sorotan di tiap menu
// sidebar + kartu langkah. Muncul sekali per akun (tanda localStorage per id
// pengguna, TIDAK dihapus saat keluar, beda dari WelcomeModal yang muncul tiap
// login), dan bisa diulang dari menu Akun. Mahasiswa baru melihatnya sesudah
// tes diagnostik awal, karena sebelum itu menu lain disembunyikan (#332).

export interface LangkahTur {
  /** Nilai atribut data-tur elemen yang disorot (lihat Layout.tsx). */
  sasaran: string
  judul: string
  teks: string
}

export const LANGKAH_MAHASISWA: LangkahTur[] = [
  { sasaran: '/dashboard', judul: 'Dashboard', teks: 'Ringkasan belajarmu: topik aktif, langkah berikutnya, dan progres tiap topik.' },
  { sasaran: '/modul', judul: 'Modul', teks: 'Modul PDF tiap topik. Baca sampai selesai untuk membuka tes formatif topik itu.' },
  { sasaran: '/video', judul: 'Video', teks: 'Video tiap pertemuan. Tonton sesudah membaca modul.' },
  { sasaran: '/asesmen', judul: 'Asesmen', teks: 'Tes formatif tiap topik dan hasil tes diagnostik awal. Lulus tes formatif membuka topik berikutnya.' },
  { sasaran: '/mini-projek', judul: 'Mini Projek', teks: 'Susun rancangan proposal per bab dan kirim ke dosen untuk dinilai.' },
  { sasaran: '/akun', judul: 'Akun', teks: 'Profil, kelas, gaya belajar, dan Panduan Pemakaian. Tur ini bisa diulang dari sini.' },
  { sasaran: 'tema', judul: 'Tema dan Keluar', teks: 'Ganti tema terang atau gelap, dan keluar dari aplikasi.' },
]

export const LANGKAH_DOSEN: LangkahTur[] = [
  { sasaran: '/dashboard', judul: 'Dashboard', teks: 'Aktivitas kelas: tes diagnostik, tes formatif, modul dibaca, video ditonton, dan mahasiswa yang perlu diperhatikan.' },
  { sasaran: '/modul', judul: 'Modul', teks: 'Kelola topik: unggah PDF, atur urutan, jadwal buka, dan watermark.' },
  { sasaran: '/video', judul: 'Video', teks: 'Unggah atau tautkan video tiap pertemuan.' },
  { sasaran: '/asesmen', judul: 'Asesmen', teks: 'Hasil tes kelas, sesi tes, dan rekap nilai.' },
  { sasaran: '/asesmen/bank', judul: 'Bank Soal', teks: 'Soal tes diagnostik dan tes formatif per Bab, bisa diimpor dari templat Excel, serta Mini Projek.' },
  { sasaran: '/kelas', judul: 'Kelas', teks: 'Kelas otomatis dari tes diagnostik dan akun mahasiswa.' },
  { sasaran: '/akun', judul: 'Akun', teks: 'Profil, mata kuliah, kode undangan, dan Panduan Pemakaian. Tur ini bisa diulang dari sini.' },
  { sasaran: 'tema', judul: 'Tema dan Keluar', teks: 'Ganti tema terang atau gelap, dan keluar dari aplikasi.' },
]

/** Dikirim tombol "Ulangi Tur Panduan" di Akun; Layout yang menjalankan tur. */
export const EVENT_MULAI_TUR = 'sfp-mulai-tur'

const kunci = (userId: string) => `sfp_tur_v1_${userId}`

export function sudahTur(userId: string): boolean {
  try {
    return localStorage.getItem(kunci(userId)) === '1'
  } catch {
    return true // penyimpanan diblokir: jangan memaksa tur tiap halaman
  }
}

export function tandaiTur(userId: string): void {
  try {
    localStorage.setItem(kunci(userId), '1')
  } catch {
    // abaikan: paling buruk tur muncul lagi
  }
}
