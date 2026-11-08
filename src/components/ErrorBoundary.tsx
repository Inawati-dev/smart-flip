import { Component, type ErrorInfo, type ReactNode } from 'react'
import { IconGear } from './icons'
import { galatMuatPaket } from '../lib/lazyRetry'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  koneksi: boolean
}

// Class component is required here — React error boundaries have no hooks
// equivalent (componentDidCatch / getDerivedStateFromError only exist on
// class components). Wraps the app's router tree in App.tsx so a render
// crash anywhere shows this fallback instead of a blank white screen.
//
// Antrean #356 (Johan, 8 Nov 2026): galat saat internet tidak stabil tampil sebagai modal (bukan
// halaman error penuh), dan halaman dimuat ulang sendiri begitu internet kembali. Galat unduh paket
// halaman sudah diulang dulu oleh lib/lazyRetry.ts sebelum sampai ke sini.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, koneksi: false }
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, koneksi: galatMuatPaket(error) || (typeof navigator !== 'undefined' && navigator.onLine === false) }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught a render error:', error, errorInfo)
  }

  componentDidUpdate(_: ErrorBoundaryProps, awal: ErrorBoundaryState) {
    if (this.state.hasError && this.state.koneksi && !awal.hasError) window.addEventListener('online', this.muatUlang)
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.muatUlang)
  }

  muatUlang = () => window.location.reload()

  render() {
    if (this.state.hasError) {
      const { koneksi } = this.state
      return (
        <div
          className="fixed inset-0 z-[900] bg-cream flex items-center justify-center p-4"
          style={{ animation: 'fadeInBg 0.18s ease' }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="judul-galat"
            className="max-w-sm w-full bg-ivory rounded-2xl border p-6 text-center"
            style={{ borderColor: 'var(--border)', boxShadow: '0 8px 40px color-mix(in srgb, var(--shadow-color) 22%, transparent)', animation: 'slideUpModal 0.22s ease' }}
          >
            <div className="w-11 h-11 rounded-xl bg-[color:var(--accent-soft)] text-terra-d flex items-center justify-center mx-auto mb-4">
              <IconGear size={20} />
            </div>
            <h1 id="judul-galat" className="font-display text-xl font-bold text-brown mb-1.5">
              {koneksi ? 'Koneksi Internet Tidak Stabil' : 'Terjadi Kesalahan'}
            </h1>
            <p className="text-sm text-brown-3 mb-5">
              {koneksi
                ? 'Halaman belum selesai dimuat. Jawaban tes yang sedang dikerjakan tersimpan di perangkat ini. Halaman dimuat ulang otomatis saat internet kembali, atau tekan Coba Lagi.'
                : 'Maaf, ada yang tidak berjalan sebagaimana mestinya. Coba muat ulang halaman.'}
            </p>
            <button
              onClick={this.muatUlang}
              className="w-full h-11 rounded-xl bg-terra-d text-ivory text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {koneksi ? 'Coba Lagi' : 'Muat Ulang'}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
