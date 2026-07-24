import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { IconChevronDown } from './icons'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  id?: string
  name?: string
  className?: string
  style?: CSSProperties
  'aria-label'?: string
}

// Listbox sizing — 260px comfortably shows ~5 rows of the 44px-min-height
// options (mobile tap target, per CLAUDE.md) before it needs its own
// internal scroll, and leaves the gap used to flip the popup above the
// trigger when there isn't 260px of room below it.
const POPUP_MAX_HEIGHT = 260
const POPUP_GAP = 6

interface Pos {
  left: number
  width: number
  top?: number
  bottom?: number
}

// Custom dropdown replacing native <select> app-wide (see index.css's
// `select{}` / `.select-trigger` rule pair) — the OPEN listbox on a native
// <select> is OS/browser chrome that CSS can never restyle, so getting a
// rounded/on-theme popup at all requires swapping to a fully custom
// listbox like this one instead of trying to style <select> further.
//
// The trigger below intentionally mirrors the native <select> rule
// (`.select-trigger` in index.css) property-for-property instead of
// leaning on each page's own className for the closed-state look — that
// mirrors how the native rule already behaves today (it's unlayered plain
// CSS, so it already wins over every page's own Tailwind utility classes
// for the properties it sets — see the CSS comment above `.select-trigger`
// for why). Swapping to this component keeps that exact rendered result.
export function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  id,
  name,
  className,
  style,
  'aria-label': ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [pos, setPos] = useState<Pos>({ left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)
  const listboxId = useId()

  const selectedIndex = options.findIndex((o) => o.value === value)
  const displayLabel = selectedIndex >= 0 ? options[selectedIndex].label : (placeholder ?? '')

  function computePosition() {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    // Flip upward only when there's genuinely more room above than below —
    // otherwise a trigger near the top of a short viewport would flip into
    // an even smaller space instead of just staying below with its own
    // internal scroll handling the overflow.
    const openUp = spaceBelow < POPUP_MAX_HEIGHT + POPUP_GAP && rect.top > spaceBelow
    setPos({
      left: rect.left,
      width: rect.width,
      top: openUp ? undefined : rect.bottom + POPUP_GAP,
      bottom: openUp ? window.innerHeight - rect.top + POPUP_GAP : undefined,
    })
  }

  function openPopup() {
    if (disabled) return
    computePosition()
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function closePopup(refocusTrigger: boolean) {
    setOpen(false)
    if (refocusTrigger) triggerRef.current?.focus()
  }

  function commit(index: number) {
    const opt = options[index]
    if (!opt) return
    onChange(opt.value)
    closePopup(true)
  }

  // Position:fixed (viewport-relative), computed from the trigger's own
  // getBoundingClientRect() — same fix already used for the sidebar's
  // collapsed-rail flyout label in src/components/Layout.tsx, after that
  // label used to get clipped by an ancestor's overflow when it was
  // position:absolute. This component can end up inside a scrollable
  // modal (Draf.tsx's "Kirim Draf Baru" dialog uses overflow-y-auto), so
  // the same class of bug applies here and the same fix is used.
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (listboxRef.current?.contains(target)) return
      closePopup(false)
    }
    function reposition() {
      computePosition()
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const el = listboxRef.current?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)
    // jsdom (unit tests) doesn't implement scrollIntoView at all — guard
    // its existence rather than assuming a real browser.
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [open, highlighted])

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) openPopup()
        else setHighlighted((h) => Math.min(h + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) openPopup()
        else setHighlighted((h) => Math.max(h - 1, 0))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!open) openPopup()
        else commit(highlighted)
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          closePopup(true)
        }
        break
      case 'Tab':
        if (open) closePopup(false)
        break
      default:
        break
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        name={name}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? closePopup(false) : openPopup())}
        onKeyDown={handleTriggerKeyDown}
        className={`select-trigger${className ? ` ${className}` : ''}`}
        style={style}
      >
        <span
          className="select-trigger-label"
          style={selectedIndex < 0 && placeholder ? { color: 'var(--brown3)', fontWeight: 400 } : undefined}
        >
          {displayLabel}
        </span>
        <IconChevronDown
          size={15}
          className="select-trigger-chevron"
          style={{ transform: open ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%) rotate(0deg)' }}
        />
      </button>

      {open && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-activedescendant={options[highlighted] ? `${listboxId}-opt-${highlighted}` : undefined}
          className="fixed overflow-y-auto py-1.5"
          style={{
            left: pos.left,
            width: pos.width,
            top: pos.top,
            bottom: pos.bottom,
            maxHeight: POPUP_MAX_HEIGHT,
            zIndex: 650,
            background: 'var(--ivory)',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--r)',
            boxShadow: 'var(--shadow-md)',
            animation: 'selectPopIn 0.14s ease',
          }}
        >
          {options.length === 0 ? (
            <li className="px-3.5 py-2.5 text-sm" style={{ color: 'var(--brown3)' }}>
              Tidak ada opsi
            </li>
          ) : (
            options.map((opt, i) => {
              const selected = opt.value === value
              const active = i === highlighted
              return (
                <li
                  key={opt.value}
                  id={`${listboxId}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => commit(i)}
                  className="flex items-center px-3.5 text-sm cursor-pointer truncate"
                  style={{
                    minHeight: 44,
                    color: selected ? 'var(--brown)' : 'var(--brown2)',
                    fontWeight: selected ? 600 : 500,
                    background: active ? 'var(--accent-soft)' : 'transparent',
                  }}
                >
                  {opt.label}
                </li>
              )
            })
          )}
        </ul>
      )}
    </>
  )
}
