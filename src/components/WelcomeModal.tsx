import { useEffect, useState, type ComponentType } from 'react'
import type { OnboardingRole } from '../lib/onboarding'
import { IconBook, IconTarget, IconCompass, IconUsers, IconLightbulb, IconChevronRight } from './icons'

interface Step {
  icon: ComponentType<{ size?: number }>
  title: string
  desc: string
}

const STEPS_MAHASISWA: Step[] = [
  {
    icon: IconBook,
    title: 'Selamat Datang di Smart Flip!',
    desc: 'E-modul adaptif untuk mata kuliah Metode Penelitian & Pengembangan. Sembilan modul, dari konsep dasar R&D sampai diseminasi hasil — semuanya di satu tempat.',
  },
  {
    icon: IconTarget,
    title: 'Cara Belajar',
    desc: 'Tiap modul punya materi, kuis formatif, jurnal & studi kasus. Diskusi di Forum, kumpulkan draf di halaman Draf — progresmu tersimpan otomatis di setiap langkah.',
  },
  {
    icon: IconCompass,
    title: 'Jalur Belajar Adaptif',
    desc: 'Kerjakan Tes Diagnostik sekali di awal — hasilnya menentukan Jalur Cepat atau Jalur Mendalam, menyesuaikan urutan materi tiap modul dengan gaya belajarmu.',
  },
]

const STEPS_DOSEN: Step[] = [
  {
    icon: IconUsers,
    title: 'Selamat Datang!',
    desc: 'Panel pengelolaan kelas untuk mata kuliah Metode Penelitian & Pengembangan — pantau progres mahasiswa, kelola modul, dan validasi materi dari satu dashboard.',
  },
  {
    icon: IconLightbulb,
    title: 'Panduan Mulai',
    desc: 'Kelola Modul untuk atur materi & soal diagnostik, Analitik Kelas untuk pantau progres mahasiswa, Validasi Ahli untuk menilai kelayakan modul. Semua ada di sidebar.',
  },
]

// Per-step minimum dwell time before "Lanjut" activates — replaces a manual
// skip button. Progress bar fill is a CSS animation keyed by `step`, not a
// JS interval, so it restarts cleanly every step change for free.
const STEP_DELAY_MS = 2000

export function WelcomeModal({
  role,
  userName,
  onClose,
}: {
  role: OnboardingRole
  userName?: string
  onClose: () => void
}) {
  const [step, setStep] = useState(0)
  const [ready, setReady] = useState(false)
  const steps = role === 'dosen' ? STEPS_DOSEN : STEPS_MAHASISWA
  const isLast = step === steps.length - 1
  const current = steps[step]
  const Icon = current.icon
  const title = step === 0 && userName ? `Selamat Datang, ${userName}!` : current.title

  // Countdown doubles as auto-advance — once the bar fills, move on by
  // itself (auto-close on the last step) instead of just sitting there
  // waiting for a click. "Lanjut"/"Kembali" still work immediately for
  // anyone who doesn't want to wait.
  useEffect(() => {
    setReady(false)
    const t = setTimeout(() => {
      setReady(true)
      if (isLast) onClose()
      else setStep((s) => s + 1)
    }, STEP_DELAY_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      style={{ background: 'rgba(62,54,46,.52)', backdropFilter: 'blur(4px)', animation: 'fadeInBg 0.18s ease' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="rounded-2xl p-7 md:p-8 max-w-md w-full text-center relative"
        style={{
          background: 'var(--ivory)',
          boxShadow: '0 8px 40px rgba(62,54,46,.22)',
          animation: 'slideUpModal 0.22s ease',
        }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-terra"
          style={{ background: 'var(--brown)' }}
        >
          <Icon size={30} />
        </div>

        <h3 className="font-display text-xl font-bold text-brown mb-2">{title}</h3>
        <p className="text-sm text-brown-2 leading-relaxed mb-6">{current.desc}</p>

        <div className="flex items-center justify-center gap-1.5 mb-6">
          {steps.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === step ? '20px' : '6px',
                background: i === step ? 'var(--terra)' : 'var(--border2, rgba(62,54,46,.15))',
              }}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 min-h-11 rounded-lg font-medium text-sm cursor-pointer"
              style={{ border: '1.5px solid var(--border)', background: 'transparent' }}
            >
              Kembali
            </button>
          )}
          <button
            onClick={() => ready && (isLast ? onClose() : setStep((s) => s + 1))}
            disabled={!ready}
            className="flex-1 min-h-11 rounded-lg bg-terra text-white font-semibold text-sm cursor-pointer inline-flex items-center justify-center gap-1 disabled:cursor-not-allowed"
          >
            {isLast ? (role === 'dosen' ? 'Mulai Mengajar' : 'Mulai Belajar') : 'Lanjut'}
            {!isLast && <IconChevronRight size={15} />}
          </button>
        </div>

        <div className="h-1 rounded-full overflow-hidden mt-2.5" style={{ background: 'var(--border2, rgba(62,54,46,.12))' }}>
          <div
            key={step}
            className="h-full rounded-full"
            style={{ background: 'var(--terra)', animation: `welcomeCountdown ${STEP_DELAY_MS}ms linear forwards` }}
          />
        </div>
      </div>
    </div>
  )
}
