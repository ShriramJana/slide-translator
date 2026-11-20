import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { LANGUAGES } from '../api'
import { CheckIcon, ChevronIcon, GlobeIcon, SearchIcon } from './icons'

type LanguageSelectProps = {
  value: string
  onChange: (code: string) => void
}

export function LanguageSelect({ value, onChange }: LanguageSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = LANGUAGES.find((l) => l.code === value)
  const term = query.trim().toLowerCase()
  const matches = LANGUAGES.filter((l) => `${l.name} ${l.native}`.toLowerCase().includes(term))

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function pick(code: string) {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!open) return
    if (e.key === 'Escape') {
      // keep the surrounding dialog open
      e.stopPropagation()
      setOpen(false)
    }
    if (e.key === 'Enter' && matches.length > 0) {
      e.preventDefault()
      pick(matches[0].code)
    }
  }

  return (
    <div className="lang-select" ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="lang-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <GlobeIcon />
        <span className="lang-trigger-label">{selected ? selected.name : 'Select a language'}</span>
        <ChevronIcon />
      </button>

      {open && (
        <div className="lang-menu">
          <div className="lang-search">
            <SearchIcon />
            <input
              autoFocus
              type="text"
              placeholder="Search"
              aria-label="Search languages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul role="listbox">
            {matches.map((l) => (
              <li key={l.code} role="option" aria-selected={l.code === value}>
                <button type="button" onClick={() => pick(l.code)}>
                  <span>{l.name}</span>
                  <span className="lang-native">{l.native}</span>
                  {l.code === value && <CheckIcon />}
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="lang-empty">No languages match "{query}"</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
