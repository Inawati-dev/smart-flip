import { useEffect, useRef, useState } from 'react'
import type { AcakSoalResult } from '../lib/acak'
import { bacaDraft, tulisDraft, type DraftTes } from '../lib/tesTunda'

// Menyalin pengerjaan tes ke localStorage tiap jawaban berubah, dan memulihkannya sekali saat tes yang
// sama dibuka lagi (antrean #355). `kunci` null = tes belum jelas (kode belum diverifikasi); `aktif` false
// = jangan memulihkan (mis. topik sudah lulus). Pemanggil memanggil hapusDraft(kunci) saat tes terkirim.
// Mengembalikan true bila pengerjaan lama baru saja dilanjutkan.
export function useDraftTes(opts: {
  kunci: string | null
  aktif?: boolean
  acak: AcakSoalResult | null
  currentQ: number
  jawaban: Record<number, number>
  submitted?: Record<number, boolean>
  pulih: (d: DraftTes) => void
}): boolean {
  const { kunci, aktif = true, acak, currentQ, jawaban, submitted, pulih } = opts
  const [dipulihkan, setDipulihkan] = useState(false)
  const sudah = useRef<string | null>(null)
  const pulihRef = useRef(pulih)
  useEffect(() => {
    pulihRef.current = pulih
  })

  useEffect(() => {
    if (!kunci || !aktif || sudah.current === kunci) return
    sudah.current = kunci
    const d = bacaDraft(kunci)
    if (!d) return
    pulihRef.current(d)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- memulihkan dari localStorage hanya mungkin sesudah mount
    setDipulihkan(true)
  }, [kunci, aktif])

  useEffect(() => {
    if (kunci && acak) tulisDraft(kunci, { acak, currentQ, jawaban, submitted })
  }, [kunci, acak, currentQ, jawaban, submitted])

  return dipulihkan
}

/** Teks pemberitahuan di atas pengerjaan yang dilanjutkan. */
export const CATATAN_DILANJUTKAN = 'Pengerjaan sebelumnya dilanjutkan dari soal terakhir. Jawabanmu tersimpan otomatis di perangkat ini.'
