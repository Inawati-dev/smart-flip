import type { ReactNode } from 'react'

// Pure 3D-flip mechanic (perspective + rotateY + backface-visibility), no
// visual chrome -- reused both by LoginFlipCard's outer front/back card and,
// nested inside its back face, by Login.tsx's login/forgot-password
// sub-transition, so switching to "Lupa kata sandi?" flips instead of
// silently swapping content. Timing (600ms, cubic-bezier(.4,.1,.2,1)) matches
// the project's existing 3D-flip feel from src/index.css's
// .reader-flip-overlay (used by Ebook.tsx).
//
// Both faces sit in the SAME grid cell ([grid-area:1/1]) instead of the more
// common absolute-overlay technique -- a fixed/min height on one face broke
// as soon as the other face's content changed at runtime (e.g. a role-
// mismatch error banner appearing on the login form), forcing an internal
// scrollbar. Grid auto-sizing takes the max of both faces' intrinsic height
// on every reflow, so the card always grows to fit whichever face is
// currently taller, with no manual height bookkeeping.
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
  const faceBase = `${faceClassName} [grid-area:1/1] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]`
  return (
    <div className="relative w-full" style={{ perspective: 1400 }}>
      <div
        className="grid w-full transition-transform duration-[600ms] [transform-style:preserve-3d]"
        style={{
          transitionTimingFunction: 'cubic-bezier(.4,.1,.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div className={faceBase} style={faceStyle}>
          {front}
        </div>
        <div className={`${faceBase} [transform:rotateY(180deg)]`} style={faceStyle}>
          {back}
        </div>
      </div>
    </div>
  )
}

// Single 3D flip card for the Login page, replacing AuthShell's permanent
// two-column split there — front shows branding/CTA, back shows the real
// form. Card chrome (radius/shadow/ivory bg) matches AuthShell's card
// exactly. max-h/overflow-y-auto is a safety net only, for viewports too
// short to fit either face at all -- normal-size viewports never hit it
// since the grid cell itself grows to fit the content (see FlipPanel).
const CARD_STYLE = {
  background: 'var(--ivory)',
  boxShadow: '0 0.5px 2px rgba(62,54,46,.06), 0 8px 28px rgba(62,54,46,.09)',
} as const

const FACE_CLASS = 'rounded-2xl p-6 sm:p-8 flex flex-col gap-5 max-h-[92vh] overflow-y-auto'

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
