import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { capAir } from '../lib/capAir'

// Watermark layar tes (antrean #351 A, Johan 8 Nov 2026): nama, NIM, dan jam (WIB) berulang diagonal
// menutupi seluruh layar selama soal tampil. Ia bagian dari halaman, jadi ikut terfoto dan
// tertangkap layar, dan foto yang beredar (ke AI atau ke teman) bisa dilacak ke pemiliknya dan
// waktunya. Batas jujur: ini tidak mencegah layar difoto; ia menurunkan niat dan memberi bukti.
// Memakai pola SVG yang sama dengan watermark PDF (capAir), huruf kecil, jarak sedang, abu-abu tipis supaya seluruh layar tertutup tanpa mengganggu membaca soal. Jam diperbarui tiap 30 detik.
const JEDA_JAM_MS = 30_000
// Tipis agar soal tetap enak dibaca (keluhan Johan 8 Nov 2026): abu-abu netral, terbaca di tema terang dan gelap,
// opasitas sekitar setengah watermark PDF, jarak sedang supaya sedikit teks melintas di atas kalimat soal.
export const GAYA_CAP_TES = { warna: '#7a7a7a', opasitas: 0.1 }

/** "Nama · NIM · 8 Nov 2026 14.32 WIB". Bagian yang kosong dibuang; tanpa nama jatuh ke nama aplikasi. */
export function teksCapTes(nama: string | null | undefined, nim: string | null | undefined, kini: Date): string {
  const tgl = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' }).format(kini)
  const jam = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(kini)
  const identitas = [nama?.trim(), nim?.trim()].filter(Boolean).join(' · ') || 'SMART-FLIP 5.0'
  return `${identitas} · ${tgl} ${jam} WIB`
}

/** Dipasang di luar tata letak (portal ke body) karena leluhur Layout memakai transform dan merusak position:fixed. */
export function CapTes() {
  const { profile, role } = useAuth()
  const [kini, setKini] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setKini(new Date()), JEDA_JAM_MS)
    return () => clearInterval(t)
  }, [])
  const teks = teksCapTes(profile?.full_name, profile?.nim_nidn, kini)
  const latar = useMemo(() => capAir(teks, 'kecil', 'sedang', GAYA_CAP_TES), [teks])
  if (role === 'dosen' || typeof document === 'undefined') return null
  return createPortal(
    <div
      data-testid="cap-tes"
      aria-hidden="true"
      className="fixed inset-0 z-[450] pointer-events-none select-none"
      style={{ backgroundImage: latar, backgroundRepeat: 'repeat' }}
    />,
    document.body,
  )
}
