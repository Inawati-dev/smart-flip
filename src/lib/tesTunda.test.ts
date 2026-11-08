// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const kirimKetat = vi.fn()
const kirimGrup = vi.fn()
vi.mock('./quizAttempts', () => ({ kirimAttemptKetat: (...a: unknown[]) => kirimKetat(...a) }))
vi.mock('./tesKelompok', () => ({ submitGroupAttempt: (...a: unknown[]) => kirimGrup(...a) }))

import { bacaDraft, tulisDraft, hapusDraft, kunciDraft, MASA_DRAF_MS, daftarKirim, kirimAttempt, kirimKelompok, kirimSemua } from './tesTunda'
import type { AcakSoalResult } from './acak'

const acak: AcakSoalResult = {
  urut: [{ question_id: 1, option_order: [0, 1, 2, 3] }],
  tampil: [{ id: 1, question: 'S?', options: ['a', 'b', 'c', 'd'], kunciTampil: 1 }],
}
const isi = { score: 80, answers: [1], kind: 'formatif' as const }
const putus = () => new TypeError('Failed to fetch')

beforeEach(() => {
  localStorage.clear()
  kirimKetat.mockReset()
  kirimGrup.mockReset()
})

describe('draf pengerjaan', () => {
  it('tulis lalu baca mengembalikan soal, posisi, dan jawaban', () => {
    const k = kunciDraft('u1', 'formatif', 3)
    tulisDraft(k, { acak, currentQ: 2, jawaban: { 0: 1, 1: 3 }, submitted: { 0: true } })
    const d = bacaDraft(k)
    expect(d?.currentQ).toBe(2)
    expect(d?.jawaban).toEqual({ 0: 1, 1: 3 })
    expect(d?.acak.tampil[0].question).toBe('S?')
    hapusDraft(k)
    expect(bacaDraft(k)).toBeNull()
  })

  it('draf lebih tua dari 48 jam dibuang; kunci tiap pengguna dan tes terpisah', () => {
    const k = kunciDraft('u1', 'pre', 7)
    tulisDraft(k, { acak, currentQ: 0, jawaban: {} })
    expect(bacaDraft(k, Date.now() + MASA_DRAF_MS + 1000)).toBeNull()
    expect(localStorage.getItem(k)).toBeNull()
    expect(kunciDraft('u1', 'pre', 7)).not.toBe(kunciDraft('u2', 'pre', 7))
    expect(kunciDraft('u1', 'pre', 7)).not.toBe(kunciDraft('u1', 'formatif', 7))
  })

  it('isi rusak dianggap tidak ada draf', () => {
    const k = kunciDraft('u1', 'pre', 1)
    localStorage.setItem(k, '{bukan json')
    expect(bacaDraft(k)).toBeNull()
  })
})

describe('antrean kirim', () => {
  it('terkirim: tidak masuk antrean', async () => {
    kirimKetat.mockResolvedValue(undefined)
    expect(await kirimAttempt('u1', 3, isi)).toBe('terkirim')
    expect(daftarKirim()).toHaveLength(0)
  })

  it('internet putus: masuk antrean dengan waktu selesai tercatat, lalu terkirim saat internet kembali', async () => {
    kirimKetat.mockRejectedValueOnce(putus())
    expect(await kirimAttempt('u1', 3, isi)).toBe('tunda')
    const [item] = daftarKirim('u1')
    expect(item.jenis === 'attempt' && item.moduleId).toBe(3)
    expect(item.jenis === 'attempt' && item.attempt.completedAt).toBeTruthy()

    kirimKetat.mockResolvedValue(undefined)
    expect(await kirimSemua('u1')).toEqual({ terkirim: 1, sisa: 0 })
    expect(daftarKirim()).toHaveLength(0)
  })

  it('kirim ulang berhenti di kegagalan jaringan pertama dan menyisakan antrean', async () => {
    kirimKetat.mockRejectedValue(putus())
    await kirimAttempt('u1', 1, isi)
    await kirimAttempt('u1', 2, isi)
    expect(await kirimSemua('u1')).toEqual({ terkirim: 0, sisa: 2 })
    expect(kirimKetat).toHaveBeenCalledTimes(3) // 2 kirim awal + 1 percobaan ulang yang berhenti di item pertama
  })

  it('ditolak server dengan kode (bukan jaringan): tidak diantre, hasil "gagal"', async () => {
    kirimKetat.mockRejectedValue({ code: '42501', message: 'ditolak kebijakan' })
    expect(await kirimAttempt('u1', 3, isi)).toBe('gagal')
    expect(daftarKirim()).toHaveLength(0)
  })

  it('item milik pengguna lain tidak dikirim; item yang kemudian ditolak server dibuang', async () => {
    kirimKetat.mockRejectedValueOnce(putus()).mockRejectedValueOnce(putus())
    await kirimAttempt('u1', 1, isi)
    await kirimAttempt('u2', 2, isi)
    kirimKetat.mockReset()
    kirimKetat.mockRejectedValue({ code: '23505', message: 'dobel' })
    expect(await kirimSemua('u1')).toEqual({ terkirim: 0, sisa: 0 })
    expect(daftarKirim('u2')).toHaveLength(1)
  })

  it('tes kelompok: hanya galat jaringan yang diantre', async () => {
    kirimGrup.mockRejectedValueOnce(putus())
    expect(await kirimKelompok('u1', 't1', 90, [1])).toBe('tunda')
    kirimGrup.mockRejectedValueOnce(new Error('Kelompok sudah mengumpulkan'))
    expect(await kirimKelompok('u1', 't2', 90, [1])).toBe('gagal')
    expect(daftarKirim('u1')).toHaveLength(1)
    kirimGrup.mockResolvedValue(undefined)
    expect(await kirimSemua('u1')).toEqual({ terkirim: 1, sisa: 0 })
    expect(kirimGrup).toHaveBeenLastCalledWith('t1', 90, [1])
  })
})
