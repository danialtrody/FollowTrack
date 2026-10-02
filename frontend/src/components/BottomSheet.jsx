import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function BottomSheet({ open, onClose, title, children, color }) {
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else      document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="sheet-backdrop" onClick={handleBackdrop}>
      <div className="sheet-panel">
        <div className="sheet-handle" />

        <div style={{
          height: 3,
          background: color || 'var(--grad-accent)',
          margin: '10px 20px 0',
          borderRadius: 999,
          opacity: 0.7,
          flexShrink: 0,
        }} />

        <div className="sheet-header">
          <span style={{
            fontSize: 17, fontWeight: 800,
            color: color || 'var(--text)',
            letterSpacing: '-0.3px',
          }}>
            {title}
          </span>
          <button className="sheet-close-btn" onClick={onClose}>
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div className="sheet-scroll">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
