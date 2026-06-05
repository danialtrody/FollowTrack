import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Users } from 'lucide-react'

export default function PageHeader({ title, back, right, showLogo }) {
  const navigate = useNavigate()

  return (
    <header className="page-header">
      {/* Left slot */}
      {back ? (
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text)',
            cursor: 'pointer',
            transition: 'background var(--t-fast)',
            flexShrink: 0,
          }}
          onPointerEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
          onPointerLeave={e => e.currentTarget.style.background = 'var(--surface2)'}
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
      ) : showLogo ? (
        <div className="page-header-logo">
          <div className="page-header-logo-icon">
            <Users size={15} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.4px', background: 'var(--grad-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            FollowTrack
          </span>
        </div>
      ) : (
        <div style={{ width: 38 }} />
      )}

      {/* Center title — hidden when logo is shown */}
      {!showLogo && (
        <h1 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text)' }}>
          {title}
        </h1>
      )}
      {showLogo && <div />}

      {/* Right slot */}
      <div style={{ width: 38, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
        {right || null}
      </div>
    </header>
  )
}
