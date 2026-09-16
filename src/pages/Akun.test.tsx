// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { Akun } from './Akun'

afterEach(cleanup)

const mockAuth = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  profile: null as { full_name: string; role: string; nim_nidn: string | null; avatar_url: string | null } | null,
  role: null as 'mahasiswa' | 'dosen' | null,
  loading: false,
  refreshProfile: vi.fn(async () => {}),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: async () => ({}),
      getUser: async () => ({ data: { user: mockAuth.user } }),
    },
  },
  isSupabaseConfigured: false,
}))

// Tab Kelas (KelasPanel, dari Kelas.tsx) memanggil hook nyata ini lewat
// react-query -- dimock di sini biar tes tab tidak bergantung pada
// getKelasByDosen/Supabase sungguhan (lihat CLAUDE.md worktree ini §A.3).
vi.mock('../hooks/useKelas', () => ({
  useKelasByDosen: () => ({ data: [], isLoading: false }),
}))

function renderAkun(queryClient: QueryClient, initialEntries: string[] = ['/akun']) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Akun />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function seedQueryCache(queryClient: QueryClient) {
  queryClient.setQueryData(['modules'], [])
  queryClient.setQueryData(['progress', 'all'], {})
  queryClient.setQueryData(['quizAttempts', 'all'], [])
  queryClient.setQueryData(['analitik', 'studentStats'], [])
}

describe('Akun', () => {
  beforeEach(() => {
    mockAuth.user = { id: 'u1', email: 'ahmad.rizki@student.um.ac.id' }
    mockAuth.profile = { full_name: 'Ahmad Rizki', role: 'mahasiswa', nim_nidn: '220341600001', avatar_url: null }
    mockAuth.role = 'mahasiswa'
    mockAuth.loading = false
  })

  it('tombol Ubah membuka modal ubah profil', () => {
    const queryClient = new QueryClient()
    seedQueryCache(queryClient)
    renderAkun(queryClient)

    expect(screen.queryByText('Ubah profil')).toBeNull()
    fireEvent.click(screen.getByText('Ubah'))
    expect(screen.getByText('Ubah profil')).toBeTruthy()
    expect(screen.getByDisplayValue('Ahmad Rizki')).toBeTruthy()
  })

  it('tidak ada teks kode undangan di halaman Akun', () => {
    const queryClient = new QueryClient()
    seedQueryCache(queryClient)
    const { container } = renderAkun(queryClient)
    expect(container.textContent).not.toContain('kode undangan')
    expect(container.textContent).not.toContain('Kode Undangan')
  })

  // Koreksi Johan 16 Sep 2026: Kelola PDF pindah ke rel navigasi (Layout.tsx,
  // dosen saja) — tidak lagi ada tautannya di halaman Akun, untuk peran mana pun.
  it('tidak ada tautan Kelola PDF di halaman Akun', () => {
    mockAuth.profile = { full_name: 'Dr. Ahmad Fauzi', role: 'dosen', nim_nidn: '0012345678', avatar_url: null }
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    seedQueryCache(queryClient)
    renderAkun(queryClient)
    expect(screen.queryByText('Kelola PDF')).toBeNull()
  })

  // Pengaturan.tsx dilebur ke sini (PengaturanSections), sekarang di balik
  // tab "Pengaturan" (koreksi Johan 16 Sep 2026 — Kelas & Pengaturan jadi
  // tab, bukan kartu tautan) — tidak ada lagi tautan terpisah ke /pengaturan
  // atau tombol Keluar sendiri (Keluar sudah ada di rel/bilah bawah Layout).
  it('tab Pengaturan memuat Notifikasi, tanpa tautan Pengaturan atau tombol Keluar', () => {
    const queryClient = new QueryClient()
    seedQueryCache(queryClient)
    const { container } = renderAkun(queryClient, ['/akun?tab=pengaturan'])
    expect(screen.getByText('Notifikasi')).toBeTruthy()
    expect(container.querySelector('a[href="/pengaturan"]')).toBeNull()
    expect(screen.queryByText('Keluar')).toBeNull()
  })

  // Kelas jadi tab di Akun (koreksi Johan 16 Sep 2026 "jadikan tab saja biar
  // gak buka menu baru lagi") — dosen di /akun?tab=kelas melihat KelasPanel.
  it('dosen di /akun?tab=kelas melihat isi KelasPanel', () => {
    mockAuth.profile = { full_name: 'Dr. Ahmad Fauzi', role: 'dosen', nim_nidn: '0012345678', avatar_url: null }
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    seedQueryCache(queryClient)
    renderAkun(queryClient, ['/akun?tab=kelas'])
    expect(screen.getByText(/Buat kelas, bagikan kode kelas/)).toBeTruthy()
  })

  // Mahasiswa tidak punya tab Kelas — memaksa ?tab=kelas harus jatuh ke profil.
  it('mahasiswa memaksa ?tab=kelas jatuh ke tab profil', () => {
    const queryClient = new QueryClient()
    seedQueryCache(queryClient)
    renderAkun(queryClient, ['/akun?tab=kelas'])
    expect(screen.queryByText(/Buat kelas, bagikan kode kelas/)).toBeNull()
    expect(screen.getByText('Ahmad Rizki')).toBeTruthy()
  })
})
