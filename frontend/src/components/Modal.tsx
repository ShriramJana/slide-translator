import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { CloseIcon } from './icons'

type ModalProps = {
  label: string
  children: ReactNode
  onClose?: () => void
}

export function Modal({ label, children, onClose }: ModalProps) {
  useEffect(() => {
    if (!onClose) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="overlay">
      <div className="modal" role="dialog" aria-modal="true" aria-label={label}>
        {onClose && (
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
