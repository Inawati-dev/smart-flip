import type { ReactNode } from 'react'

// Single 3D flip card for the Login page, replacing AuthShell's permanent
// two-column split there — front shows branding/CTA, back shows the real
// form. Card chrome (radius/shadow/ivory bg) matches AuthShell's card
// exactly; the flip technique (rotateY + preserve-3d + backface-visibility)
// and timing (600ms, cubic-bezier(.4,.1,.2,1)) match the project's existing
// 3D-flip feel from src/index.css's .reader-flip-overlay (used by Ebook.tsx).
//
// `front` is the in-flow face (defines the card's height via min-h below);
// `back` is absolutely matched to it. Both get overflow-y-auto as a safety
// net for short viewports — front should stay short by design (branding +
// a short feature list + one CTA button), but the form on `back` is the
// taller face and is the one that actually needs the escape hatch.
const CARD_STYLE = {
  background: 'var(--ivory)',
  boxShadow: '0 0.5px 2px rgba(62,54,46,.06), 0 8px 28px rgba(62,54,46,.09)',
} as const

const FACE_CLASS =
  'rounded-2xl p-6 sm:p-8 flex flex-col gap-5 overflow-y-auto min-h-[540px] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]'

export function LoginFlipCard({
  flipped,
  front,
  back,
}: {
  flipped: boolean
  front: ReactNode
  back: ReactNode
}) {
  return (
    <div className="relative w-full" style={{ perspective: 1400 }}>
      <div
        className="relative w-full transition-transform duration-[600ms] [transform-style:preserve-3d]"
        style={{
          transitionTimingFunction: 'cubic-bezier(.4,.1,.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div className={FACE_CLASS} style={CARD_STYLE}>
          {front}
        </div>
        <div className={`absolute inset-0 ${FACE_CLASS} [transform:rotateY(180deg)]`} style={CARD_STYLE}>
          {back}
        </div>
      </div>
    </div>
  )
}
