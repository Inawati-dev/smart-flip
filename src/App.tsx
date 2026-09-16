import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
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
const Diagnostik = lazy(() => import('./pages/Diagnostik'))
const Akun = lazy(() => import('./pages/Akun'))
const KelolaPdf = lazy(() => import('./pages/KelolaPdf'))
const Modul = lazy(() => import('./pages/Modul'))
const ModulList = lazy(() => import('./pages/ModulList'))
const Video = lazy(() => import('./pages/Video'))
const Formatif = lazy(() => import('./pages/Formatif'))
const Workshop = lazy(() => import('./pages/Workshop'))
const Ebook = lazy(() => import('./pages/Ebook'))
const Vark = lazy(() => import('./pages/Vark'))
const TugasAkhir = lazy(() => import('./pages/TugasAkhir'))
const TesKelompok = lazy(() => import('./pages/TesKelompok'))
const Forum = lazy(() => import('./pages/Forum'))
const Draf = lazy(() => import('./pages/Draf'))
const Feedback = lazy(() => import('./pages/Feedback'))
const Asesmen = lazy(() => import('./pages/Asesmen'))
const AsesmenMhs = lazy(() => import('./pages/AsesmenMhs'))
const BankSoal = lazy(() => import('./pages/BankSoal'))
const TesKhusus = lazy(() => import('./pages/TesKhusus'))
const Observasi = lazy(() => import('./pages/Observasi'))
const ProjekAkhir = lazy(() => import('./pages/ProjekAkhir'))
const Validasi = lazy(() => import('./pages/Validasi'))
const Analitik = lazy(() => import('./pages/Analitik'))
const Manajemen = lazy(() => import('./pages/Manajemen'))
const Kelas = lazy(() => import('./pages/Kelas'))
const Changelog = lazy(() => import('./pages/Changelog'))
const Pengaturan = lazy(() => import('./pages/Pengaturan'))

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
              <Route path="/modul/:id/workshop" element={<ProtectedRoute><Workshop /></ProtectedRoute>} />
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
              <Route
                path="/diagnostik"
                element={
                  <ProtectedRoute roles={['mahasiswa']}>
                    <Diagnostik />
                  </ProtectedRoute>
                }
              />
              <Route path="/ebook" element={<ProtectedRoute><Ebook /></ProtectedRoute>} />
              <Route path="/asesmen/vark" element={<ProtectedRoute><Vark /></ProtectedRoute>} />
              <Route path="/vark" element={<ProtectedRoute><Vark /></ProtectedRoute>} />
              <Route path="/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
              <Route path="/draf" element={<ProtectedRoute><Draf /></ProtectedRoute>} />
              <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
              {/* Sisi mahasiswa dari Aktivitas Mandiri — /asesmen dosen-only,
                  jadi pengumpulan observasi butuh rutenya sendiri. */}
              <Route path="/observasi" element={<ProtectedRoute roles={['mahasiswa']}><Observasi /></ProtectedRoute>} />
              {/* Satu rute, dua tampilan: mahasiswa mengerjakan proposal,
                  dosen memantau & menilai (bercabang di dalam komponennya). */}
              <Route path="/projek-akhir" element={<ProtectedRoute><ProjekAkhir /></ProtectedRoute>} />
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
              {/* /ngain dipertahankan sebagai alias — tautan/bookmark lama ke
                  halaman ini masih ada sebelum namanya berubah jadi Asesmen. */}
              <Route path="/ngain" element={<ProtectedRoute roles={['dosen']}><Asesmen /></ProtectedRoute>} />
              <Route path="/validasi" element={<ProtectedRoute roles={['dosen']}><Validasi /></ProtectedRoute>} />
              <Route path="/analitik" element={<ProtectedRoute roles={['dosen']}><Analitik /></ProtectedRoute>} />
              <Route path="/manajemen" element={<ProtectedRoute roles={['dosen']}><Manajemen /></ProtectedRoute>} />
              <Route path="/kelas" element={<ProtectedRoute roles={['dosen']}><Kelas /></ProtectedRoute>} />
              {/* Dosen-only: riwayat rilis memuat catatan teknis & temuan
                  keamanan yang tidak perlu dibaca mahasiswa maupun pengunjung
                  anonim. Sempat publik sebelumnya (dan tautannya dulu ada di
                  footer AuthShell) — tautan itu sudah dicabut bersamaan dengan
                  perubahan ini, jadi tidak ada lagi jalan masuk yang menggantung. */}
              <Route path="/changelog" element={<ProtectedRoute roles={['dosen']}><Changelog /></ProtectedRoute>} />
              <Route path="/pengaturan" element={<ProtectedRoute><Pengaturan /></ProtectedRoute>} />
            </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
