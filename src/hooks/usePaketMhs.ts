import { useMemo } from 'react'
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useCourse } from '../contexts/CourseContext'
import { useModules } from './useModules'
import { fetchProjectsMhs, fetchMySubmission, type FinalSubmission } from '../lib/tugasAkhir'
import { bacaPenandaKabar, briefPaket, kabarBaru, kabarPaket, simpanPenandaKabar, topikTerbukaDari } from '../lib/paketProposal'

// Paket Rancangan Proposal milik mahasiswa yang sedang masuk (antrean #179 dan
// #189): brief, kiriman sendiri, kunci jadwal, dan kabar. Dipakai halaman Mini
// Projek, kartu Kabar Terbaru di Dashboard, dan titik di menu; kunci kueri
// sama di ketiganya supaya datanya diambil sekali.
//
// Dua penanda per pengguna dan mata kuliah, keduanya berisi WAKTU KABAR
// terbaru yang sudah dilihat (bukan jam perangkat, supaya selisih jam dengan
// server tidak berpengaruh):
//   dilihat - diisi saat halaman Mini Projek dibuka; mematikan titik dan lencana.
//   pita    - diisi saat pita ditutup atau rincian nilainya dibuka.
export function usePaketMhs(aktif: boolean = true) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { courseId, course } = useCourse()
  const { data: modules = [] } = useModules()
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['final-projects-mhs', courseId],
    queryFn: () => fetchProjectsMhs(courseId),
    enabled: aktif,
  })
  const paket = useMemo(() => briefPaket(projects), [projects])
  const hasil = useQueries({
    queries: paket.map((b) => ({
      queryKey: ['final-submission-mhs', b.id],
      queryFn: () => fetchMySubmission(b.id),
      enabled: aktif,
    })),
  })
  const memuat = aktif && (isLoading || hasil.some((h) => h.isPending))
  const kiriman: Array<FinalSubmission | null> = hasil.map((h) => h.data ?? null)

  const pemilik = `${user?.id ?? 'tamu'}:${courseId ?? 0}`
  const { data: dilihat = null } = useQuery({
    queryKey: ['kabar-paket', 'dilihat', pemilik],
    queryFn: () => bacaPenandaKabar('dilihat', pemilik),
    staleTime: Infinity,
  })
  const { data: pitaDitutup = null } = useQuery({
    queryKey: ['kabar-paket', 'pita', pemilik],
    queryFn: () => bacaPenandaKabar('pita', pemilik),
    staleTime: Infinity,
  })

  const modulesUrut = useMemo(() => [...modules].sort((a, b) => a.order_num - b.order_num), [modules])
  const topikTerbuka = useMemo(() => topikTerbukaDari(course?.mulai_kuliah, modulesUrut), [course?.mulai_kuliah, modulesUrut])
  const kabar = memuat ? [] : kabarPaket(paket, kiriman, course?.mulai_kuliah, modulesUrut)
  const baru = kabarBaru(kabar, dilihat)
  const nilai = kabar.filter((k) => k.jenis === 'dinilai')
  const terbaru = kabar[0]?.waktu
  const nilaiTerbaru = nilai[0]?.waktu

  const tandaiDilihat = () => {
    if (terbaru) queryClient.setQueryData(['kabar-paket', 'dilihat', pemilik], simpanPenandaKabar('dilihat', pemilik, terbaru))
  }
  const tutupPita = () => {
    if (nilaiTerbaru) queryClient.setQueryData(['kabar-paket', 'pita', pemilik], simpanPenandaKabar('pita', pemilik, nilaiTerbaru))
  }

  return {
    paket,
    kiriman,
    memuat,
    modulesUrut,
    topikTerbuka,
    kabar,
    /** Kabar yang belum dilihat: menyalakan titik di menu dan lencana di Dashboard. */
    baru,
    /** Nilai terbaru yang pitanya belum ditutup, atau null. */
    nilaiBaru: kabarBaru(nilai, pitaDitutup)[0] ?? null,
    tandaiDilihat,
    tutupPita,
  }
}
