// Status tiap topik (= satu modul) untuk PertemuanStepper, daftar Modul/Video/
// Asesmen, dan guard halaman detail. Spec: docs/superpowers/specs/
// 2026-09-15-tiga-menu-asesmen-design.md §4.2, §9 WP6.
//
// WP1–WP5 memakai stub (semua topik 'open'). WP6 (ini) mengganti isinya
// dengan hitungan dari quiz_attempts (formatif topik n-1 skor >= PASS_SCORE)
// tanpa mengubah tanda tangan useTopikStatus, jadi Modul.tsx/ModulList.tsx/
// Video.tsx (sudah memakainya) tidak perlu disentuh.

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useModules } from '../hooks/useModules'
import { useAllQuizAttempts } from '../hooks/useQuizAttempts'
import { fetchAttemptsByKind, PASS_SCORE } from './quizAttempts'
import { isSupabaseConfigured } from './supabase'
import { useCourse } from '../contexts/CourseContext'
import { golonganDariSkor, bacaSkorPreDemo, type Golongan } from './golongan'

export type TopikStatus = 'done' | 'open' | 'locked'

export interface TopikState {
  statusOf: (moduleId: number) => TopikStatus
  loading: boolean
  /** Golongan pre-test mata kuliah terpilih (antrean #105). */
  golongan: Golongan
  skorPre: number | null
}

// localStorage flags dipakai gerbang pre-test (ProtectedRoute.tsx) dan
// AsesmenMhs.tsx:
// - sfp_pretest_skip: mahasiswa klik "Lanjut tanpa pre-test" karena bank
//   soal pre-test masih kosong (spec §9 WP6 poin 5b) — berlaku di kedua mode.
// - sfp_pretest_done: PENANDA MODE DEMO SAJA. fetchAttemptsByKind selalu
//   mengembalikan [] tanpa Supabase (lihat quizAttempts.ts), jadi kelulusan
//   pre-test tidak bisa dibaca dari DB di mode demo — dilacak lokal supaya
//   gerbang (spec §9 WP6 poin 3) tetap bisa dicoba end-to-end tanpa DB.
const PRETEST_SKIP_KEY = 'sfp_pretest_skip'
const PRETEST_DONE_KEY = 'sfp_pretest_done'

export function markPretestSkipped(): void {
  try {
    localStorage.setItem(PRETEST_SKIP_KEY, '1')
  } catch {
    // ignore quota/serialization errors
  }
}

export function markPretestDone(): void {
  try {
    localStorage.setItem(PRETEST_DONE_KEY, '1')
  } catch {
    // ignore quota/serialization errors
  }
}

async function isPreTestDone(courseId?: number): Promise<boolean> {
  try {
    if (localStorage.getItem(PRETEST_SKIP_KEY) === '1') return true
  } catch {
    // ignore, fall through
  }
  if (!isSupabaseConfigured) {
    try {
      return localStorage.getItem(PRETEST_DONE_KEY) === '1'
    } catch {
      return false
    }
  }
  const attempts = await fetchAttemptsByKind('pre', courseId)
  return attempts.length > 0
}

// Dipakai gerbang ProtectedRoute (redirect /asesmen/pre). Mode demo sengaja
// default FALSE (localStorage sfp_pretest_done belum diisi) supaya alur
// gerbangnya sendiri bisa dicoba tanpa DB (spec §9 WP6 poin 3).
export function usePreTestDone() {
  const { courseId } = useCourse()
  return useQuery({ queryKey: ['pretest-done', courseId], queryFn: () => isPreTestDone(courseId) })
}

// preDone KHUSUS untuk kalkulasi status topik (beda dari usePreTestDone di
// atas — spec §9 WP6 poin 2 secara eksplisit mengizinkan perbedaan ini):
// fetchAttemptsByKind selalu [] di mode demo (tidak ada DB untuk dibaca),
// jadi topik TIDAK PERNAH dikunci oleh pre-test di mode demo — beda dari
// gerbang redirect di atas yang sengaja masih bisa dicoba manual.
// `initialData` membuat nilainya SINKRON di mode demo (bukan menunggu
// resolve query), supaya halaman yang dirender tanpa menunggu promise
// (mis. renderToStaticMarkup di tes) tetap melihat topik 1 'open' seperti
// stub WP1–WP5 — inilah yang menjaga Modul.test.tsx/ModulList.test.tsx/
// Video.test.tsx/PertemuanStepper.test.tsx tetap hijau tanpa disentuh.
// Antrean #105: query ini juga membawa skor pre-test terakhir untuk golongan.
// Mode demo: `done` selalu true (niat awal initialData di atas; refetch dulu
// sempat menimpanya jadi false), skor dibaca dari localStorage per mata kuliah.
function useTopikPre() {
  const { courseId } = useCourse()
  return useQuery({
    queryKey: ['topik-pretest-done', courseId],
    queryFn: async (): Promise<{ done: boolean; skor: number | null }> => {
      const attempts = await fetchAttemptsByKind('pre', courseId)
      const skor = attempts.length ? attempts[attempts.length - 1].score : bacaSkorPreDemo(courseId)
      if (!isSupabaseConfigured || attempts.length > 0) return { done: true, skor }
      try {
        return { done: localStorage.getItem(PRETEST_SKIP_KEY) === '1', skor }
      } catch {
        return { done: false, skor }
      }
    },
    initialData: !isSupabaseConfigured ? { done: true, skor: bacaSkorPreDemo(courseId) } : undefined,
  })
}

// Fungsi murni (diuji langsung, lihat topik.test.ts): topik pertama 'open'
// kalau preDone, topik n>1 'open' kalau topik n-1 skor terbaik >= passScore;
// 'done' kalau topik itu sendiri sudah >= passScore. Golongan Mahir
// (antrean #105) membuka semua topik begitu pre-test selesai.
export function hitungStatusTopik(
  modulesUrut: Array<{ id: number }>,
  bestFormatif: Record<number, number>,
  preDone: boolean,
  passScore: number = PASS_SCORE,
  mahir: boolean = false,
): (moduleId: number) => TopikStatus {
  return (moduleId: number) => {
    const idx = modulesUrut.findIndex((m) => m.id === moduleId)
    if (idx === -1) return 'locked'
    const ownScore = bestFormatif[moduleId] ?? 0
    const gateOpen = !preDone ? false : mahir || idx === 0 ? true : (bestFormatif[modulesUrut[idx - 1].id] ?? 0) >= passScore
    if (!gateOpen) return 'locked'
    return ownScore >= passScore ? 'done' : 'open'
  }
}

function bestScoreByModule(attempts: Array<{ moduleId: number; score: number }>): Record<number, number> {
  const best: Record<number, number> = {}
  for (const a of attempts) best[a.moduleId] = Math.max(best[a.moduleId] ?? 0, a.score)
  return best
}

export function useTopikStatus(): TopikState {
  const { data: modules = [], isLoading: modulesLoading } = useModules()
  const { data: attempts = [], isLoading: attemptsLoading } = useAllQuizAttempts()
  const { data: pre, isLoading: preLoading } = useTopikPre()
  const preDone = pre?.done ?? false
  const skorPre = pre?.skor ?? null
  const golongan = golonganDariSkor(skorPre)

  const sorted = useMemo(() => [...modules].sort((a, b) => a.order_num - b.order_num), [modules])
  const bestFormatif = useMemo(() => bestScoreByModule(attempts), [attempts])
  const statusOf = useMemo(
    () => hitungStatusTopik(sorted, bestFormatif, preDone, PASS_SCORE, golongan === 'mahir'),
    [sorted, bestFormatif, preDone, golongan],
  )

  return { statusOf, loading: modulesLoading || attemptsLoading || preLoading, golongan, skorPre }
}
