import { useState } from 'react'

export default function StatCard({ icon, label, desc, count, color, dimColor, delta, onClick, style }) {
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: `1px solid var(--border)`,
        borderRadius: 'var(--radius)',
        padding: '16px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'transform 0.12s, background 0.12s',
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {/* Icon pill */}
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 38,
        height: 38,
        borderRadius: 12,
        background: dimColor || 'var(--surface2)',
        fontSize: 20,
      }}>
        {icon}
      </span>

      {/* Count */}
      <span style={{
        fontSize: 36,
        fontWeight: 700,
        lineHeight: 1,
        color: count > 0 ? (color || 'var(--text)') : 'var(--text)',
        letterSpacing: '-1px',
      }}>
        {count ?? '—'}
      </span>

      {/* Label */}
      <span style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-2)',
        letterSpacing: '0.02em',
        lineHeight: 1.3,
      }}>
        {label}
      </span>

      {/* Description */}
      {desc && (
        <span style={{
          fontSize: 10,
          color: 'var(--text-3)',
          lineHeight: 1.3,
          marginTop: -2,
        }}>
          {desc}
        </span>
      )}

      {/* Delta badge */}
      {delta !== undefined && delta !== null && (
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--danger)' : 'var(--text-3)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}>
          {delta > 0 ? '↑' : delta < 0 ? '↓' : '•'} {Math.abs(delta)} since last
        </span>
      )}
    </button>
  )
}
