import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { CourseProvider } from './contexts/CourseContext'
import { useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ResetPassword } from './pages/ResetPassword'

// Halaman selain Login/Register/ResetPassword dimuat per-route (code
// splitting) supaya index bundle tidak membawa semua 29 halaman sekaligus —
// antrean #21 (optimasi kecepatan akses). Dashboard.tsx tidak punya default
// export, jadi dibungkus .then(); sisanya sudah punya default export.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Akun = lazy(() => import('./pages/Akun'))
const KelolaPdf = lazy(() => import('./pages/KelolaPdf'))
const Modul = lazy(() => import('./pages/Modul'))
const ModulList = lazy(() => import('./pages/ModulList'))
const Video = lazy(() => import('./pages/Video'))
const Formatif = lazy(() => import('./pages/Formatif'))
const Ebook = lazy(() => import('./pages/Ebook'))
const TugasAkhir = lazy(() => import('./pages/TugasAkhir'))
const TesKelompok = lazy(() => import('./pages/TesKelompok'))
const Asesmen = lazy(() => import('./pages/Asesmen'))
const AsesmenMhs = lazy(() => import('./pages/AsesmenMhs'))
const BankSoal = lazy(() => import('./pages/BankSoal'))
const TesKhusus = lazy(() => import('./pages/TesKhusus'))
const Kelas = lazy(() => import('./pages/Kelas'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

// /asesmen: satu route, tampilan bercabang per peran (spec §8 tabel route) —
// dosen melihat hasil kelas (Asesmen.tsx yang ada), mahasiswa melihat daftar
// pre/VARK/formatif/post (AsesmenMhs.tsx, diisi WP6).
function AsesmenRoute() {
  const { role } = useAuth()
  return role === 'dosen' ? <Asesmen /> : <AsesmenMhs />
}

// /modul/:id/kuis (route lama) -> /asesmen/formatif/:id (spec §8 tabel
// pengalihan). Kuis.tsx sudah diganti Formatif.tsx (WP6).
function KuisRedirect() {
  const { id } = useParams()
  return <Navigate to={`/asesmen/formatif/${id}`} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CourseProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<div className="p-8 text-brown-3">Memuat…</div>}>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/modul" element={<ProtectedRoute><ModulList /></ProtectedRoute>} />
              <Route path="/modul/:id" element={<ProtectedRoute><Modul /></ProtectedRoute>} />
              <Route path="/modul/:id/kuis" element={<ProtectedRoute><KuisRedirect /></ProtectedRoute>} />
              {/* Workshop.tsx dihapus (antrean #80, keputusan Johan 16 Sep
                  2026) - tidak ditautkan dari navigasi mana pun. Alias
                  dipertahankan supaya tautan/bookmark lama tidak 404. */}
              <Route path="/modul/:id/workshop" element={<Navigate to="/dashboard" replace />} />
              <Route path="/workshop" element={<Navigate to="/dashboard" replace />} />
              <Route path="/video" element={<ProtectedRoute><Video /></ProtectedRoute>} />
              <Route path="/video/:id" element={<ProtectedRoute><Video /></ProtectedRoute>} />
              <Route path="/akun" element={<ProtectedRoute><Akun /></ProtectedRoute>} />
              {/* Form ubah nama/avatar/NIM sudah dilebur ke modal di /akun
                  (WP-C) — /akun/profil dihapus, Profil.tsx dibiarkan ada
                  tapi tidak ber-route (keputusan Johan #2: sembunyikan,
                  jangan hapus berkasnya). */}
              <Route path="/akun/pdf" element={<ProtectedRoute roles={['dosen']}><KelolaPdf /></ProtectedRoute>} />
              {/* /profil dipertahankan sebagai alias route lama (dipakai
                  beberapa tautan internal), dialihkan ke /akun untuk menu. */}
              <Route path="/profil" element={<Navigate to="/akun" replace />} />
              {/* Diagnostik, Vark, Forum, Draf, Feedback, Observasi,
                  ProjekAkhir dihapus (antrean #80, keputusan Johan 16 Sep
                  2026) — tidak ditautkan dari navigasi mana pun. Alias ke
                  /dashboard dipertahankan supaya tautan/bookmark lama tidak
                  404. */}
              <Route path="/diagnostik" element={<Navigate to="/dashboard" replace />} />
              {/* Ebook.tsx TETAP ADA (beda dari rencana awal) — Modul.tsx
                  masih memakai <Link to={`/ebook?book=${modul.id}`}> (tombol
                  "Buka Ebook"), jadi ini bukan halaman tanpa tautan. */}
              <Route path="/ebook" element={<ProtectedRoute><Ebook /></ProtectedRoute>} />
              <Route path="/asesmen/vark" element={<Navigate to="/dashboard" replace />} />
              <Route path="/vark" element={<Navigate to="/dashboard" replace />} />
              <Route path="/forum" element={<Navigate to="/dashboard" replace />} />
              <Route path="/draf" element={<Navigate to="/dashboard" replace />} />
              <Route path="/feedback" element={<Navigate to="/dashboard" replace />} />
              <Route path="/observasi" element={<Navigate to="/dashboard" replace />} />
              <Route path="/projek-akhir" element={<Navigate to="/dashboard" replace />} />
              <Route path="/asesmen" element={<ProtectedRoute><AsesmenRoute /></ProtectedRoute>} />
              <Route path="/asesmen/pre" element={<ProtectedRoute roles={['mahasiswa']}><AsesmenMhs /></ProtectedRoute>} />
              <Route path="/asesmen/post" element={<ProtectedRoute roles={['mahasiswa']}><AsesmenMhs /></ProtectedRoute>} />
              <Route path="/asesmen/formatif/:id" element={<ProtectedRoute><Formatif /></ProtectedRoute>} />
              <Route path="/asesmen/bank" element={<ProtectedRoute roles={['dosen']}><BankSoal /></ProtectedRoute>} />
              {/* Tanpa roles: TesKhusus bercabang sendiri per peran (spec
                  §9 WP6b) - dosen mengelola sesi, mahasiswa memasukkan
                  kode. */}
              <Route path="/asesmen/tes" element={<ProtectedRoute><TesKhusus /></ProtectedRoute>} />
              <Route path="/asesmen/tes/:code" element={<ProtectedRoute><TesKhusus /></ProtectedRoute>} />
              {/* Tugas akhir (antrean #57): dosen menulis brief dan menilai di sini;
                  mahasiswa mengirim dari kartu di /asesmen. */}
              <Route path="/asesmen/tugas-akhir" element={<ProtectedRoute roles={['dosen']}><TugasAkhir /></ProtectedRoute>} />
              {/* Tes kelompok (antrean #65): bercabang per peran seperti TesKhusus. */}
              <Route path="/asesmen/kelompok" element={<ProtectedRoute><TesKelompok /></ProtectedRoute>} />
              <Route path="/asesmen/kelompok/:code" element={<ProtectedRoute><TesKelompok /></ProtectedRoute>} />
              {/* /ngain, /validasi, /analitik: halaman lama sudah dihapus
                  (antrean #80) — /ngain lebih dulu jadi alias ke Asesmen,
                  sekarang ketiganya alias langsung ke /asesmen supaya
                  tautan/bookmark lama tidak 404. */}
              <Route path="/ngain" element={<Navigate to="/asesmen" replace />} />
              <Route path="/validasi" element={<Navigate to="/asesmen" replace />} />
              <Route path="/analitik" element={<Navigate to="/asesmen" replace />} />
              <Route path="/manajemen" element={<Navigate to="/modul" replace />} />
              <Route path="/kelas" element={<ProtectedRoute roles={['dosen']}><Kelas /></ProtectedRoute>} />
              {/* Changelog.tsx dihapus (antrean #80) — riwayat rilis sudah
                  tidak ditautkan dari mana pun (tautannya di footer AuthShell
                  sudah dicabut sebelumnya). Alias ke /dashboard. */}
              <Route path="/changelog" element={<Navigate to="/dashboard" replace />} />
              {/* Pengaturan.tsx: default export sudah dihapus (isinya cuma
                  Navigate ke /akun) — dipindah langsung ke sini, tanpa lewat
                  ProtectedRoute/lazy chunk. PengaturanSections (dirender di
                  Akun.tsx) tidak tersentuh. */}
              <Route path="/pengaturan" element={<Navigate to="/akun" replace />} />
            </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
        </CourseProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
