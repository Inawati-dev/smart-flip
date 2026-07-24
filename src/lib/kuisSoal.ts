import { supabase, isSupabaseConfigured } from './supabase'

// Soal kuis formatif per modul — reads/writes the REAL `quiz_questions` table
// (schema.sql), which was sitting completely unused in production: Kuis.tsx
// used to read from `modules.kuis`, a JSON field that doesn't exist as a
// column anywhere in schema.sql, so every module's quiz silently rendered
// "Soal kuis untuk modul ini belum tersedia" regardless of account. This file
// is the fix — same dual-mode (Supabase when configured, else per-module
// localStorage) pattern as lib/diagnostic.ts's diagnostic_questions CRUD.

export interface KuisSoal {
  id: number
  module_id: number
  question: string
  options: string[]
  answer_idx: number
  explanation: string | null
  order_num: number
}

function demoKey(moduleId: number): string {
  return `sfp_kuis_soal_demo_${moduleId}`
}

function demoReadAll(moduleId: number): KuisSoal[] {
  try {
    const raw = localStorage.getItem(demoKey(moduleId))
    if (raw) return JSON.parse(raw) as KuisSoal[]
  } catch {
    // ignore, fall through to empty bank
  }
  return []
}

function demoWriteAll(moduleId: number, soal: KuisSoal[]): void {
  try {
    localStorage.setItem(demoKey(moduleId), JSON.stringify(soal))
  } catch {
    // ignore quota/serialization errors, matches lib/diagnostic.ts demoWriteAll
  }
}

export async function fetchKuisSoal(moduleId: number): Promise<KuisSoal[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('id, module_id, question, options, answer_idx, explanation, order_num')
        .eq('module_id', moduleId)
        .order('order_num')
      if (error) throw error
      if (data) return data as KuisSoal[]
    } catch (e) {
      console.warn('[kuisSoal] fetchKuisSoal → Supabase gagal, fallback demo bank:', e)
    }
  }
  return demoReadAll(moduleId)
}

// Dosen-only CRUD for /manajemen's "Soal Kuis" section. Same rethrow-on-write
// behavior as lib/diagnostic.ts's diagnostic question CRUD: a fallback write
// would only ever land in the dosen's own browser, silently hiding a real
// Supabase failure behind a false "success" toast.
export async function createKuisSoal(data: Omit<KuisSoal, 'id'>): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('quiz_questions').insert(data)
    if (error) throw error
    return
  }
  const all = demoReadAll(data.module_id)
  const nextId = all.reduce((max, q) => Math.max(max, q.id), 0) + 1
  demoWriteAll(data.module_id, [...all, { ...data, id: nextId }])
}

export async function updateKuisSoal(id: number, data: Partial<Omit<KuisSoal, 'id'>>): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('quiz_questions').update(data).eq('id', id)
    if (error) throw error
    return
  }
  if (data.module_id == null) return
  const all = demoReadAll(data.module_id)
  demoWriteAll(data.module_id, all.map((q) => (q.id === id ? { ...q, ...data } : q)))
}

export async function deleteKuisSoal(id: number, moduleId: number): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('quiz_questions').delete().eq('id', id)
    if (error) throw error
    return
  }
  const all = demoReadAll(moduleId)
  demoWriteAll(moduleId, all.filter((q) => q.id !== id))
}
