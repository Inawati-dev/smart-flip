export interface PillOption {
  value: string
  label: string
  badge?: number | string
  badgeTone?: 'danger' | 'neutral'
}

interface PillGroupProps {
  options: PillOption[]
  value: string
  onChange: (value: string) => void
  size?: 'sm' | 'md'
  ariaLabel?: string
  /** 'tab' = tab bergaris bawah (tingkat 1), 'pill' = pil (tingkat 2, bawaan). Antrean #102. */
  variant?: 'pill' | 'tab'
}

// Shared toggle-pill row, replaces the hand-rolled pill <button> maps that
// used to live in each page (BankSoal's jenis filter, TesKhusus's sumber
// soal), so every pill group in the app looks identical.
export function PillGroup({ options, value, onChange, size = 'md', ariaLabel, variant = 'pill' }: PillGroupProps) {
  // Tinggi 44 px di telepon (tap target), 36 px untuk ukuran sm di layar sm ke atas.
  const tinggi = size === 'sm' ? 'min-h-11 sm:min-h-9' : 'min-h-11'
  if (variant === 'tab') {
    return (
      <div role="tablist" aria-label={ariaLabel} className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              onClick={() => onChange(opt.value)}
              aria-selected={active}
              className={`min-h-11 px-2.5 sm:px-3.5 -mb-px text-sm whitespace-nowrap border-b-2 transition-colors ${active ? 'font-semibold' : 'hover:text-brown'}`}
              style={{ borderColor: active ? 'var(--terra)' : 'transparent', color: active ? 'var(--terra-d)' : 'var(--brown2)' }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value
        const showBadge = opt.badge != null && opt.badge !== 0 && opt.badge !== ''
        const badgeText = typeof opt.badge === 'number' && opt.badge > 99 ? '99+' : String(opt.badge)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`${tinggi} min-w-[5.5rem] rounded-[var(--radius-control)] px-3.5 text-xs font-semibold whitespace-nowrap border transition-colors inline-flex items-center justify-center gap-1.5 ${active ? '' : 'bg-ivory hover:bg-bg3'}`}
            style={{
              borderColor: active ? 'var(--brown)' : 'var(--border)',
              background: active ? 'var(--brown)' : undefined,
              color: active ? 'var(--cream)' : 'var(--brown2)',
            }}
          >
            {opt.label}
            {showBadge && (
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold rounded-full"
                style={{
                  background: active ? 'var(--ivory)' : opt.badgeTone === 'danger' ? 'var(--danger)' : 'var(--brown3)',
                  color: active ? 'var(--brown)' : opt.badgeTone === 'danger' ? 'var(--btn-text)' : 'var(--ivory)',
                }}
              >
                {badgeText}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
