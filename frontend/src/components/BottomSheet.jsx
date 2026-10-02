import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

function SheetSkeleton() {
  return (
    <div aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} className="skel-row">
          <div className="skel skel-avatar" />
          <div className="skel-lines">
            <div className="skel skel-line" style={{ width: `${55 + (i * 13) % 30}%` }} />
            <div className="skel skel-line skel-line-sm" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function BottomSheet({ open, onClose, title, children, color, compact }) {
  // Content mounts one frame after the panel starts animating, so a long list
  // doesn't block the slide-in; a skeleton holds the space meanwhile.
  const [ready, setReady] = useState(false)

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else      document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) { setReady(false); return }
    let id2
    const id1 = requestAnimationFrame(() => { id2 = requestAnimationFrame(() => setReady(true)) })
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2) }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="sheet-backdrop" onClick={handleBackdrop}>
      <div className={`sheet-panel${compact ? ' sheet-compact' : ''}`}>
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
          <button className="sheet-close-btn" onClick={onClose} aria-label="Close">
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div className="sheet-scroll">
          {ready || compact ? <div className="sheet-content">{children}</div> : <SheetSkeleton />}
        </div>
      </div>
    </div>,
    document.body
  )
}
