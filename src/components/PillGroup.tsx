export interface PillOption {
  value: string
  label: string
}

interface PillGroupProps {
  options: PillOption[]
  value: string
  onChange: (value: string) => void
  size?: 'sm' | 'md'
  ariaLabel?: string
}

// Shared toggle-pill row, replaces the hand-rolled pill <button> maps that
// used to live in each page (BankSoal's jenis filter, TesKhusus's sumber
// soal), so every pill group in the app looks identical.
export function PillGroup({ options, value, onChange, size = 'md', ariaLabel }: PillGroupProps) {
  const minH = size === 'sm' ? 36 : 44
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`rounded-full px-3.5 text-xs font-semibold whitespace-nowrap border ${active ? '' : 'bg-ivory'}`}
            style={{
              minHeight: minH,
              borderColor: active ? 'var(--brown)' : 'var(--border)',
              background: active ? 'var(--brown)' : undefined,
              color: active ? 'var(--cream)' : 'var(--brown2)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
