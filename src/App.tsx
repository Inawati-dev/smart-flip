import { BrowserRouter, Routes, Route } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ResetPassword } from './pages/ResetPassword'
import { Dashboard } from './pages/Dashboard'
import { Diagnostik } from './pages/Diagnostik'
import { Profil } from './pages/Profil'
import Modul from './pages/Modul'
import Kuis from './pages/Kuis'
import Workshop from './pages/Workshop'
import Ebook from './pages/Ebook'
import { Vark } from './pages/Vark'
import { Forum } from './pages/Forum'
import { Draf } from './pages/Draf'
import { Feedback } from './pages/Feedback'
import Ngain from './pages/Ngain'
import { Validasi } from './pages/Validasi'
import { Analitik } from './pages/Analitik'
import { Manajemen } from './pages/Manajemen'
import Changelog from './pages/Changelog'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
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
            <Route path="/profil" element={<ProtectedRoute><Profil /></ProtectedRoute>} />
            <Route
              path="/diagnostik"
              element={
                <ProtectedRoute roles={['mahasiswa']}>
                  <Diagnostik />
                </ProtectedRoute>
              }
            />
            <Route path="/modul/:id" element={<ProtectedRoute><Modul /></ProtectedRoute>} />
            <Route path="/modul/:id/kuis" element={<ProtectedRoute><Kuis /></ProtectedRoute>} />
            <Route path="/modul/:id/workshop" element={<ProtectedRoute><Workshop /></ProtectedRoute>} />
            <Route path="/ebook" element={<ProtectedRoute><Ebook /></ProtectedRoute>} />
            <Route path="/vark" element={<ProtectedRoute><Vark /></ProtectedRoute>} />
            <Route path="/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
            <Route path="/draf" element={<ProtectedRoute><Draf /></ProtectedRoute>} />
            <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
            <Route path="/ngain" element={<ProtectedRoute roles={['dosen']}><Ngain /></ProtectedRoute>} />
            <Route path="/validasi" element={<ProtectedRoute roles={['dosen']}><Validasi /></ProtectedRoute>} />
            <Route path="/analitik" element={<ProtectedRoute roles={['dosen']}><Analitik /></ProtectedRoute>} />
            <Route path="/manajemen" element={<ProtectedRoute roles={['dosen']}><Manajemen /></ProtectedRoute>} />
            <Route path="/changelog" element={<Changelog />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
