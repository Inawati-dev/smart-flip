import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base(size: number, props: IconProps) {
  const { className, ...rest } = props
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    ...rest,
  }
}

export function IconHome({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

export function IconBook({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M20 5.5C20 4.7 19.3 4 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
    </svg>
  )
}

export function IconChat({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5z" />
    </svg>
  )
}

export function IconEdit({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M14.5 4.5 19.5 9.5 8 21H3v-5z" />
      <path d="M12.5 6.5 17.5 11.5" />
    </svg>
  )
}

export function IconStar({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)} fill="currentColor" stroke="none">
      <path d="M12 3.2 14.6 9l6.2.6-4.6 4.2 1.3 6.1L12 16.9 6.5 19.9l1.3-6.1-4.6-4.2L9.4 9z" />
    </svg>
  )
}

export function IconCompass({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m14.8 9.2-2 5.6-5.6 2 2-5.6z" />
    </svg>
  )
}

export function IconUser({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.6 3.1-6.4 7-6.4s7 2.8 7 6.4" />
    </svg>
  )
}

export function IconClipboard({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <rect x="6" y="4.5" width="12" height="16" rx="1.5" />
      <path d="M9 4.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5" />
      <path d="M9 10.5h6M9 14h6M9 17.5h4" />
    </svg>
  )
}

export function IconLogout({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" />
      <path d="M15 16l4-4-4-4" />
      <path d="M19 12H9" />
    </svg>
  )
}

export function IconChart({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M2.5 20h19" />
    </svg>
  )
}

export function IconCheck({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.3 12.3 2.6 2.6 4.8-5.4" />
    </svg>
  )
}

export function IconFolder({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M4 7a1.5 1.5 0 0 1 1.5-1.5h4l2 2h7A1.5 1.5 0 0 1 20 9v8.5A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
    </svg>
  )
}

export function IconGraduationCap({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M2.5 9 12 4.5 21.5 9 12 13.5z" />
      <path d="M6.5 11v4.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V11" />
    </svg>
  )
}

export function IconBell({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M6 9a6 6 0 0 1 12 0c0 4.5 1.5 6 1.5 6h-15S6 13.5 6 9Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function IconTrendingUp({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="m3.5 16 6-6 4 4 7-7.5" />
      <path d="M15.5 6h5v5" />
    </svg>
  )
}

export function IconTarget({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconGear({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.8 6.2l-1.5 1.5M7.7 16.3l-1.5 1.5M17.8 17.8l-1.5-1.5M7.7 7.7 6.2 6.2" />
    </svg>
  )
}

export function IconTrophy({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M7 4h10v6a5 5 0 0 1-10 0z" />
      <path d="M7 5.5H4a1 1 0 0 0-1 1v1a3.5 3.5 0 0 0 3.5 3.5" />
      <path d="M17 5.5h3a1 1 0 0 1 1 1v1a3.5 3.5 0 0 1-3.5 3.5" />
      <path d="M12 15v3M9 20.5h6l-.6-2.5H9.6z" />
    </svg>
  )
}

export function IconClock({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function IconPrinter({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M7 8.5V4h10v4.5" />
      <rect x="4" y="8.5" width="16" height="7" rx="1.2" />
      <path d="M7 13.5h10V20H7z" />
    </svg>
  )
}

export function IconDocument({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 12.5h6M9 15.8h6" />
    </svg>
  )
}

export function IconDownload({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M12 4v11" />
      <path d="m7.5 11 4.5 4.5L16.5 11" />
      <path d="M5 18.5h14" />
    </svg>
  )
}

export function IconVideo({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <rect x="3.5" y="6" width="12" height="12" rx="1.5" />
      <path d="m15.5 10.2 5-2.7v9l-5-2.7Z" />
    </svg>
  )
}

export function IconPlay({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)} fill="currentColor" stroke="none">
      <path d="M8 5.3v13.4a1 1 0 0 0 1.5.9l10.5-6.7a1 1 0 0 0 0-1.7L9.5 4.5A1 1 0 0 0 8 5.3Z" />
    </svg>
  )
}

export function IconWarning({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M12 4 21 19.5H3Z" />
      <path d="M12 10v3.5" />
      <path d="M12 16.6v.1" />
    </svg>
  )
}

export function IconChevronRight({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

// Sidebar collapse/expand toggle — a panel outline with a divider, the same
// visual convention VS Code/Notion use, rather than a bare arrow glyph.
export function IconSidebar({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9.5 4.5v15" />
    </svg>
  )
}

export function IconMenu({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function IconX({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function IconLock({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <rect x="5.5" y="10.5" width="13" height="9" rx="1.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function IconEye({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  )
}

export function IconMail({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="m4 6.5 8 6.5 8-6.5" />
    </svg>
  )
}

export function IconLightbulb({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M9 18.5h6" />
      <path d="M9.5 21h5" />
      <path d="M12 3.5a6 6 0 0 0-3.5 10.9c.6.45 1 1.15 1 1.9v.2h5v-.2c0-.75.4-1.45 1-1.9A6 6 0 0 0 12 3.5Z" />
    </svg>
  )
}

export function IconUsers({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <circle cx="9" cy="8.2" r="3" />
      <path d="M3.5 19c0-3.2 2.5-5.6 5.5-5.6s5.5 2.4 5.5 5.6" />
      <path d="M15.5 8.7a2.6 2.6 0 1 0 0-5.2" />
      <path d="M17.5 13.7c2.4.5 3 2.5 3 5.3" />
    </svg>
  )
}

export function IconTrash({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
      <path d="M6.5 7 7.3 19a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

export function IconHeadphones({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="13.5" width="4" height="6" rx="1.5" />
      <rect x="17" y="13.5" width="4" height="6" rx="1.5" />
    </svg>
  )
}

export function IconLink({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M10 14.5a3.5 3.5 0 0 0 5 .3l2.5-2.5a3.5 3.5 0 0 0-5-5L11 8.8" />
      <path d="M14 9.5a3.5 3.5 0 0 0-5-.3L6.5 11.7a3.5 3.5 0 0 0 5 5L13 15.2" />
    </svg>
  )
}

export function IconRefresh({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M4.5 12a7.5 7.5 0 0 1 13-5.3M20 4v4.5h-4.5" />
      <path d="M19.5 12a7.5 7.5 0 0 1-13 5.3M4 20v-4.5h4.5" />
    </svg>
  )
}

export function IconThumbsUp({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M7 11v9H4.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1H7Z" />
      <path d="M7 11l3.3-6.8a1.8 1.8 0 0 1 3.4 1.1L13 9h5a2 2 0 0 1 1.9 2.7l-2 6A2 2 0 0 1 16 19H9a2 2 0 0 1-2-2v-6Z" />
    </svg>
  )
}

export function IconSkipBack({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M4.5 5v14" />
      <path d="m14 6-6.5 6L14 18" />
      <path d="m19.5 6-6.5 6 6.5 6" />
    </svg>
  )
}

export function IconSkipForward({ size = 18, ...p }: IconProps) {
  return (
    <svg {...base(size, p)}>
      <path d="M19.5 5v14" />
      <path d="m10 6 6.5 6-6.5 6" />
      <path d="m4.5 6 6.5 6-6.5 6" />
    </svg>
  )
}
