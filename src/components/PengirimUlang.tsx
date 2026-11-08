import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { daftarKirim, kirimSemua, PERISTIWA_ANTREAN } from '../lib/tesTunda'

// Pengirim ulang hasil tes (antrean #355). Dipasang sekali di App. Menampilkan:
//   - penanda luring: internet putus, jawaban tes tetap tersimpan di perangkat;
//   - penanda antrean: ada hasil tes yang belum sampai ke server, dikirim otomatis (online, tiap 30
//     detik, tab terlihat lagi) atau lewat tombol "Kirim sekarang".
const JEDA_ULANG_MS = 30_000
const KUNCI_KAPAN_KIRIM = ['quizAttempts', 'attempts-by-kind', 'pretest-done', 'topik-pretest-done', 'kelas-saya', 'group-team-view', 'test-session']

export function PengirimUlang() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id
  const [jumlah, setJumlah] = useState(() => (userId ? daftarKirim(userId).length : 0))
  const [luring, setLuring] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  const [mengirim, setMengirim] = useState(false)
  const [kabar, setKabar] = useState<string | null>(null)

  const hitung = useCallback(() => setJumlah(userId ? daftarKirim(userId).length : 0), [userId])

  const coba = useCallback(async () => {
    if (!userId || daftarKirim(userId).length === 0) return
    setMengirim(true)
    try {
      const { terkirim } = await kirimSemua(userId)
      if (terkirim > 0) {
        setKabar(terkirim === 1 ? 'Hasil tes yang tertunda sudah tersimpan di server.' : `${terkirim} hasil tes yang tertunda sudah tersimpan di server.`)
        for (const k of KUNCI_KAPAN_KIRIM) void queryClient.invalidateQueries({ queryKey: [k] })
      }
    } finally {
      setMengirim(false)
      hitung()
    }
  }, [userId, queryClient, hitung])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- antrean ada di localStorage; dibaca sekali saat mount lalu lewat peristiwa
    hitung()
    void coba()
    const kembali = () => {
      setLuring(false)
      void coba()
    }
    const putus = () => setLuring(true)
    const terlihat = () => {
      if (document.visibilityState === 'visible') void coba()
    }
    window.addEventListener('online', kembali)
    window.addEventListener('offline', putus)
    window.addEventListener(PERISTIWA_ANTREAN, hitung)
    document.addEventListener('visibilitychange', terlihat)
    const t = setInterval(() => void coba(), JEDA_ULANG_MS)
    return () => {
      window.removeEventListener('online', kembali)
      window.removeEventListener('offline', putus)
      window.removeEventListener(PERISTIWA_ANTREAN, hitung)
      document.removeEventListener('visibilitychange', terlihat)
      clearInterval(t)
    }
  }, [coba, hitung])

  useEffect(() => {
    if (!kabar) return
    const t = setTimeout(() => setKabar(null), 5000)
    return () => clearTimeout(t)
  }, [kabar])

  if (!userId || (!luring && jumlah === 0 && !kabar)) return null

  return (
    <div className="pill-koneksi fixed left-3 right-3 bottom-[76px] md:bottom-3 z-[650] flex justify-center pointer-events-none" role="status" aria-live="polite">
      <div
        className="pointer-events-auto max-w-md w-full rounded-xl border border-[color:var(--border)] bg-ivory px-4 py-3 text-sm text-brown flex items-center gap-3"
        style={{ boxShadow: '0 8px 32px color-mix(in srgb, var(--shadow-color) 20%, transparent)', animation: 'slideUpModal 0.2s ease' }}
      >
        <p className="flex-1 min-w-0 leading-snug">
          {kabar ??
            (jumlah > 0
              ? `${jumlah} hasil tes belum terkirim ke server. Tersimpan aman di perangkat ini dan dikirim otomatis saat internet kembali.`
              : 'Internet terputus. Jawaban tes tetap tersimpan di perangkat ini.')}
        </p>
        {jumlah > 0 && !kabar && (
          <button type="button" onClick={() => void coba()} disabled={mengirim || luring} className="btn btn-primary btn-sm shrink-0">
            {mengirim ? 'Mengirim…' : 'Kirim sekarang'}
          </button>
        )}
      </div>
    </div>
  )
}
