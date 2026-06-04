import { useNavigate } from 'react-router-dom'

function avatarColor(username) {
  const colors = ['#6C63FF','#FF453A','#30D158','#FFD60A','#64D2FF','#BF5AF2','#FF9F0A','#FF6B6B']
  let hash = 0
  for (let c of username) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function UserRow({ username, sub, badge, badgeColor, onClick }) {
  const navigate = useNavigate()
  const initial  = username?.[0]?.toUpperCase() || '?'
  const color    = avatarColor(username || '')

  function handleClick() {
    if (onClick) { onClick(); return }
    navigate(`/history/${username}`)
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        width: '100%',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.1s',
      }}
      onPointerDown={e => e.currentTarget.style.background = 'var(--surface2)'}
      onPointerUp={e   => e.currentTarget.style.background = 'none'}
      onPointerLeave={e => e.currentTarget.style.background = 'none'}
    >
      {/* Avatar */}
      <div style={{
        width: 40, height: 40,
        borderRadius: '50%',
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700, color: '#fff',
        flexShrink: 0,
      }}>
        {initial}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          @{username}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{sub}</div>
        )}
      </div>

      {/* Badge */}
      {badge && (
        <span style={{
          fontSize: 11, fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 999,
          background: `${badgeColor || 'var(--accent)'}22`,
          color: badgeColor || 'var(--accent)',
          flexShrink: 0,
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}
