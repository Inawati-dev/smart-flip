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
    desc: 'E-modul adaptif untuk mata kuliah Metode Penelitian & Pengembangan. Sembilan topik, dari konsep dasar R&D sampai diseminasi hasil, semuanya di satu tempat.',
  },
  {
    icon: IconTarget,
    title: 'Cara Belajar',
    desc: 'Tiap topik punya modul PDF, video, dan tes formatif. Urutannya: baca modul, tonton video, lalu kerjakan tes. Skor 80 membuka topik berikutnya; di bawah itu kerjakan ulang.',
  },
  {
    icon: IconCompass,
    title: 'Pre-test Sekali di Awal',
    desc: 'Kerjakan pre-test satu kali sebelum materi terbuka. Di akhir mata kuliah ada post-test lewat kode dari dosen; selisih keduanya menjadi peningkatan skormu.',
  },
]

const STEPS_DOSEN: Step[] = [
  {
    icon: IconUsers,
    title: 'Selamat Datang!',
    desc: 'Panel kelas untuk mata kuliah Metode Penelitian & Pengembangan. Dashboard menampilkan seluruh aktivitas kelas: pre-test, tes formatif, modul dibaca, video ditonton.',
  },
  {
    icon: IconLightbulb,
    title: 'Panduan Mulai',
    desc: 'Menu Modul untuk PDF, menu Video untuk tautan video, menu Asesmen untuk hasil kelas, bank soal, dan tes khusus berkode. Kelas dan kode undangan ada di menu Akun.',
  },
]

// Per-step auto-advance delay, matches SAKTI's Welcome Modal timing
// (App.tsx, 5000ms). Progress bar fill is a CSS animation keyed by `step`,
// not a JS interval, so it restarts cleanly every step change for free.
// "Lanjut"/"Kembali"/dots are NEVER disabled while this counts down — SAKTI's
// pattern is "user sees a countdown they can act on", not "user is blocked
// until it finishes" (that was a prior iteration here, reverted — see
// Changelog).
const STEP_DELAY_MS = 5000

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
  const steps = role === 'dosen' ? STEPS_DOSEN : STEPS_MAHASISWA
  const isLast = step === steps.length - 1
  const current = steps[step]
  const Icon = current.icon

  // Countdown doubles as auto-advance — once the bar fills, move on by
  // itself (auto-close on the last step) instead of just sitting there
  // waiting for a click. "Lanjut"/"Kembali" always work immediately
  // regardless of countdown state — never gated behind it.
  useEffect(() => {
    const t = setTimeout(() => {
      if (isLast) onClose()
      else setStep((s) => s + 1)
    }, STEP_DELAY_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)', animation: 'fadeInBg 0.18s ease' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="rounded-2xl p-7 md:p-8 max-w-md w-full text-center relative"
        style={{
          background: 'var(--ivory)',
          boxShadow: '0 8px 40px color-mix(in srgb, var(--shadow-color) 22%, transparent)',
          animation: 'slideUpModal 0.22s ease',
        }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--accent-soft)', color: 'var(--terra)' }}
        >
          <Icon size={30} />
        </div>

        <h3 className="font-display text-xl font-bold text-brown mb-2">
          {step === 0 && userName ? (
            <>
              Selamat Datang,
              <br />
              {userName}!
            </>
          ) : (
            current.title
          )}
        </h3>
        <p className="text-sm text-brown-2 leading-relaxed mb-6">{current.desc}</p>

        <div className="flex items-center justify-center mb-6">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`Ke langkah ${i + 1}`}
              className="min-w-11 min-h-11 flex items-center justify-center cursor-pointer bg-transparent border-0"
            >
              <span
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === step ? '20px' : '6px',
                  background: i === step ? 'var(--terra)' : 'var(--border2)',
                }}
              />
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} className="btn btn-secondary flex-1">
              Kembali
            </button>
          )}
          <button
            onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
            className="btn btn-primary flex-1"
          >
            {isLast ? (role === 'dosen' ? 'Mulai Mengajar' : 'Mulai Belajar') : 'Lanjut'}
            {!isLast && <IconChevronRight size={15} />}
          </button>
        </div>

        <div className="h-1 rounded-full overflow-hidden mt-2.5" style={{ background: 'var(--border2)' }}>
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
