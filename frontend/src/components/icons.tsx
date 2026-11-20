const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" {...stroke} strokeWidth={2.5}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" {...stroke} strokeWidth={3}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...stroke}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...stroke}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...stroke}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

export function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...stroke} strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z" />
    </svg>
  )
}

export function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...stroke} strokeWidth={1.8}>
      <path d="M12 3l7 3v5.5c0 4.3-2.9 7.7-7 9.5-4.1-1.8-7-5.2-7-9.5V6l7-3z" />
      <path d="M9 12l2.2 2.2L15 10.5" />
    </svg>
  )
}

export function LayoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...stroke} strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18M9.5 9.5V20" />
    </svg>
  )
}

export function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" {...stroke}>
      <path d="M12 8v5M12 16.5v.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

export function SlidesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...stroke}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M12 16v4M8 20h8" />
    </svg>
  )
}
