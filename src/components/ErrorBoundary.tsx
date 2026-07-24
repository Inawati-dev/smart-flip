import { Component, type ErrorInfo, type ReactNode } from 'react'
import { IconGear } from './icons'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

// Class component is required here — React error boundaries have no hooks
// equivalent (componentDidCatch / getDerivedStateFromError only exist on
// class components). Wraps the app's router tree in App.tsx so a render
// crash anywhere shows this fallback instead of a blank white screen.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught a render error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-ivory rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--border)' }}>
            <div className="w-11 h-11 rounded-xl bg-[rgba(212,163,115,.15)] text-terra-d flex items-center justify-center mx-auto mb-4">
              <IconGear size={20} />
            </div>
            <h1 className="font-display text-xl font-bold text-brown mb-1.5">Terjadi kesalahan</h1>
            <p className="text-sm text-brown-3 mb-5">
              Maaf, ada yang tidak berjalan sebagaimana mestinya. Coba muat ulang halaman.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full h-11 rounded-xl bg-terra-d text-ivory text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
