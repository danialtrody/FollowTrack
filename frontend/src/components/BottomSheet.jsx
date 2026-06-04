import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function BottomSheet({ open, onClose, title, children, color }) {
  const sheetRef = useRef(null)

  // Close on backdrop click
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  // Prevent body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-end',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        ref={sheetRef}
        style={{
          width: '100%',
          maxHeight: '90dvh',
          background: 'var(--surface)',
          borderRadius: '24px 24px 0 0',
          borderTop: `2px solid ${color || 'var(--border-light)'}`,
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'var(--sab)',
          animation: 'slideUp 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4,
          background: 'var(--surface3)',
          borderRadius: 2,
          margin: '12px auto 0',
          flexShrink: 0,
        }} />

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px 12px',
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: color || 'var(--text)' }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface2)',
              border: 'none',
              borderRadius: '50%',
              width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-2)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          flex: 1,
          padding: '8px 0',
        }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  )
}
