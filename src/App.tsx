import { BrowserRouter, Routes, Route } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LegacyStub } from './pages/LegacyStub'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<LegacyStub legacyFile="register.html" />} />
            <Route path="/reset-password" element={<LegacyStub legacyFile="reset-password.html" />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/profil" element={<ProtectedRoute><LegacyStub legacyFile="profil.html" /></ProtectedRoute>} />
            <Route path="/modul/:id" element={<ProtectedRoute><LegacyStub legacyFile="modul.html" /></ProtectedRoute>} />
            <Route path="/modul/:id/kuis" element={<ProtectedRoute><LegacyStub legacyFile="kuis.html" /></ProtectedRoute>} />
            <Route path="/modul/:id/workshop" element={<ProtectedRoute><LegacyStub legacyFile="workshop.html" /></ProtectedRoute>} />
            <Route path="/ebook" element={<ProtectedRoute><LegacyStub legacyFile="ebook.html" /></ProtectedRoute>} />
            <Route path="/vark" element={<ProtectedRoute><LegacyStub legacyFile="vark.html" /></ProtectedRoute>} />
            <Route path="/forum" element={<ProtectedRoute><LegacyStub legacyFile="forum.html" /></ProtectedRoute>} />
            <Route path="/draf" element={<ProtectedRoute><LegacyStub legacyFile="draf.html" /></ProtectedRoute>} />
            <Route path="/feedback" element={<ProtectedRoute><LegacyStub legacyFile="feedback.html" /></ProtectedRoute>} />
            <Route path="/ngain" element={<ProtectedRoute roles={['dosen']}><LegacyStub legacyFile="ngain.html" /></ProtectedRoute>} />
            <Route path="/validasi" element={<ProtectedRoute roles={['dosen']}><LegacyStub legacyFile="validasi.html" /></ProtectedRoute>} />
            <Route path="/analitik" element={<ProtectedRoute roles={['dosen']}><LegacyStub legacyFile="analitik.html" /></ProtectedRoute>} />
            <Route path="/manajemen" element={<ProtectedRoute roles={['dosen']}><LegacyStub legacyFile="manajemen.html" /></ProtectedRoute>} />
            <Route path="/changelog" element={<LegacyStub legacyFile="changelog.html" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
