// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchProfilExtra, saveProfilExtra } from './profil'

vi.mock('./supabase', () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
  isSupabaseConfigured: false,
}))

describe('profil extra fields (prodi/angkatan/jabatan/fakultas)', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when nothing has been saved yet', async () => {
    expect(await fetchProfilExtra()).toBeNull()
  })

  it('round-trips through the legacy sfp_profil localStorage key', async () => {
    await saveProfilExtra({ nama: 'Ahmad Rizki', prodi: 'Pendidikan Biologi', angkatan: '2022' })
    const result = await fetchProfilExtra()
    expect(result).toMatchObject({ nama: 'Ahmad Rizki', prodi: 'Pendidikan Biologi', angkatan: '2022' })
    expect(JSON.parse(localStorage.getItem('sfp_profil')!)).toMatchObject({
      nama: 'Ahmad Rizki',
      prodi: 'Pendidikan Biologi',
      angkatan: '2022',
    })
  })

  it('merges successive saves instead of overwriting the whole record', async () => {
    await saveProfilExtra({ nama: 'Dr. Fauzi', jabatan: 'Lektor', fakultas: 'Fakultas Vokasi' })
    await saveProfilExtra({ nama: 'Dr. Fauzi', prodi: 'Teknik Elektro' })
    const result = await fetchProfilExtra()
    expect(result).toMatchObject({
      jabatan: 'Lektor',
      fakultas: 'Fakultas Vokasi',
      prodi: 'Teknik Elektro',
    })
  })
})
