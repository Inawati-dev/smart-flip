import type { ReactNode } from 'react'

// Pure 3D-flip mechanic (perspective + rotateY + backface-visibility), no
// visual chrome -- reused both by LoginFlipCard's outer front/back card and,
// nested inside its back face, by Login.tsx's login/forgot-password
// sub-transition, so switching to "Lupa kata sandi?" flips instead of
// silently swapping content. Timing (600ms, cubic-bezier(.4,.1,.2,1)) matches
// the project's existing 3D-flip feel from src/index.css's
// .reader-flip-overlay (used by Ebook.tsx).
export function FlipPanel({
  flipped,
  front,
  back,
  faceClassName = '',
  faceStyle,
}: {
  flipped: boolean
  front: ReactNode
  back: ReactNode
  faceClassName?: string
  faceStyle?: React.CSSProperties
}) {
  const faceBase = `${faceClassName} [backface-visibility:hidden] [-webkit-backface-visibility:hidden]`
  return (
    <div className="relative w-full" style={{ perspective: 1400 }}>
      <div
        className="relative w-full transition-transform duration-[600ms] [transform-style:preserve-3d]"
        style={{
          transitionTimingFunction: 'cubic-bezier(.4,.1,.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div className={faceBase} style={faceStyle}>
          {front}
        </div>
        <div className={`absolute inset-0 ${faceBase} [transform:rotateY(180deg)]`} style={faceStyle}>
          {back}
        </div>
      </div>
    </div>
  )
}

// Single 3D flip card for the Login page, replacing AuthShell's permanent
// two-column split there — front shows branding/CTA, back shows the real
// form. Card chrome (radius/shadow/ivory bg) matches AuthShell's card
// exactly.
//
// `front` is the in-flow face (defines the card's height via min-h below);
// `back` is absolutely matched to it. Both get overflow-y-auto as a safety
// net for short viewports — front should stay short by design (branding +
// a short feature list + one CTA button), but the form on `back` is the
// taller face; min-h is sized to the login form's real content height
// (~585px at 1280px wide) so overflow-y-auto never kicks in during normal
// use, only on genuinely short viewports.
const CARD_STYLE = {
  background: 'var(--ivory)',
  boxShadow: '0 0.5px 2px rgba(62,54,46,.06), 0 8px 28px rgba(62,54,46,.09)',
} as const

const FACE_CLASS = 'rounded-2xl p-6 sm:p-8 flex flex-col gap-5 overflow-y-auto min-h-[600px]'

export function LoginFlipCard({
  flipped,
  front,
  back,
}: {
  flipped: boolean
  front: ReactNode
  back: ReactNode
}) {
  return <FlipPanel flipped={flipped} front={front} back={back} faceClassName={FACE_CLASS} faceStyle={CARD_STYLE} />
}
