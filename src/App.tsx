import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ResetPassword } from './pages/ResetPassword'
import { Dashboard } from './pages/Dashboard'
import { Diagnostik } from './pages/Diagnostik'
import Akun from './pages/Akun'
import { Profil } from './pages/Profil'
import Modul from './pages/Modul'
import ModulList from './pages/ModulList'
import Video from './pages/Video'
import Formatif from './pages/Formatif'
import Workshop from './pages/Workshop'
import Ebook from './pages/Ebook'
import { Vark } from './pages/Vark'
import { Forum } from './pages/Forum'
import { Draf } from './pages/Draf'
import { Feedback } from './pages/Feedback'
import Asesmen from './pages/Asesmen'
import AsesmenMhs from './pages/AsesmenMhs'
import BankSoal from './pages/BankSoal'
import TesKhusus from './pages/TesKhusus'
import Observasi from './pages/Observasi'
import { ProjekAkhir } from './pages/ProjekAkhir'
import { Validasi } from './pages/Validasi'
import { Analitik } from './pages/Analitik'
import { Manajemen } from './pages/Manajemen'
import { Kelas } from './pages/Kelas'
import Changelog from './pages/Changelog'
import { Pengaturan } from './pages/Pengaturan'

const queryClient = new QueryClient()

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
              {/* Form ubah nama/avatar/NIM masih di halaman Profil lama; /profil sendiri dialihkan ke /akun. */}
              <Route path="/akun/profil" element={<ProtectedRoute><Profil /></ProtectedRoute>} />
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
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
