import { useMemo } from 'react'
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { useCourse } from '../contexts/CourseContext'
import { useModules } from './useModules'
import { fetchProjectsMhs, fetchMySubmission, type FinalSubmission } from '../lib/tugasAkhir'
import { bacaKabarDilihat, briefPaket, kabarBaru, kabarPaket, simpanKabarDilihat, topikTerbukaDari } from '../lib/paketProposal'

const KUNCI_DILIHAT = ['kabar-paket-dilihat']

// Paket Rancangan Proposal milik mahasiswa yang sedang masuk (antrean #179 dan
// #189): brief, kiriman sendiri, kunci jadwal, dan kabar. Dipakai halaman Mini
// Projek, kartu Kabar Terbaru di Dashboard, dan titik di menu; kunci kueri
// sama di ketiganya supaya datanya diambil sekali.
export function usePaketMhs(aktif: boolean = true) {
  const queryClient = useQueryClient()
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
  const { data: dilihat = null } = useQuery({ queryKey: KUNCI_DILIHAT, queryFn: bacaKabarDilihat, staleTime: Infinity })

  const modulesUrut = useMemo(() => [...modules].sort((a, b) => a.order_num - b.order_num), [modules])
  const topikTerbuka = useMemo(() => topikTerbukaDari(course?.mulai_kuliah, modulesUrut), [course?.mulai_kuliah, modulesUrut])
  const kabar = memuat ? [] : kabarPaket(paket, kiriman, course?.mulai_kuliah, modulesUrut)
  const baru = kabarBaru(kabar, dilihat)

  return {
    paket,
    kiriman,
    memuat,
    modulesUrut,
    topikTerbuka,
    kabar,
    baru,
    /** Semua kabar sampai saat ini dianggap sudah dilihat (di peramban ini). */
    tandaiDilihat: () => queryClient.setQueryData(KUNCI_DILIHAT, simpanKabarDilihat()),
  }
}
