import { Link } from 'react-router'
import { Layout } from '../components/Layout'
import { IconGear, IconCompass, IconBell } from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const

// Settings scaffold — nav entry + page only, per explicit user request. No
// theme-switching functionality yet (this project deliberately removed dark
// mode earlier; re-adding any theme picker needs its own decision later).
export function Pengaturan() {
  return (
    <Layout>
      <div className="page-fadein p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brown mb-1">Pengaturan</h1>
          <p className="text-brown-3 text-sm">Preferensi tampilan &amp; notifikasi akun kamu</p>
        </div>

        <div className="flex flex-col gap-4 max-w-2xl">
          <div className="bg-ivory rounded-2xl border p-5" style={BORDER}>
            <div className="flex items-center gap-2.5 mb-1">
              <IconCompass size={18} className="text-brown-3" />
              <span className="text-sm font-semibold text-brown">Tema</span>
            </div>
            <p className="text-xs text-brown-3">Segera hadir — pilihan tema akan tersedia di sini.</p>
          </div>

          <div className="bg-ivory rounded-2xl border p-5" style={BORDER}>
            <div className="flex items-center gap-2.5 mb-1">
              <IconBell size={18} className="text-brown-3" />
              <span className="text-sm font-semibold text-brown">Notifikasi</span>
            </div>
            <p className="text-xs text-brown-3">Segera hadir — atur notifikasi email &amp; in-app di sini.</p>
          </div>

          <div className="bg-ivory rounded-2xl border p-5" style={BORDER}>
            <div className="flex items-center gap-2.5 mb-1">
              <IconGear size={18} className="text-brown-3" />
              <span className="text-sm font-semibold text-brown">Akun</span>
            </div>
            <p className="text-xs text-brown-3">
              Kelola data diri di halaman{' '}
              <Link to="/profil" className="text-terra-d font-semibold">
                Profil
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Pengaturan
