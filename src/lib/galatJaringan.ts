// Galat jaringan dari peramban (antrean #350): fetch gagal sebelum ada jawaban dari server,
// jadi teksnya mentah dan berbahasa Inggris ("Failed to fetch" di Chrome/Edge, "Load failed"
// di Safari, "NetworkError ..." di Firefox). Penyebab di sisi pengguna: sinyal putus,
// jaringan kampus memblokir alamat server, atau antivirus/ekstensi keamanan peramban.
const POLA = /failed to fetch|networkerror|load failed|fetch failed|network request failed/i

export const PESAN_JARINGAN =
  'Tidak bisa terhubung ke server. Periksa koneksi internet. Jika memakai antivirus atau ekstensi keamanan di peramban, matikan sementara atau coba peramban lain, lalu coba lagi.'

/** Pesan Indonesia bila `msg` galat jaringan peramban, selain itu `msg` apa adanya. */
export function pesanGalat(msg: string): string {
  return POLA.test(msg) ? PESAN_JARINGAN : msg
}
