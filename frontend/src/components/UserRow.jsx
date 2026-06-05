const AVATAR_GRADS = [
  'linear-gradient(135deg, #8B5CF6, #EC4899)',
  'linear-gradient(135deg, #F43F5E, #FB923C)',
  'linear-gradient(135deg, #059669, #34D399)',
  'linear-gradient(135deg, #D97706, #FBBF24)',
  'linear-gradient(135deg, #1D4ED8, #60A5FA)',
  'linear-gradient(135deg, #7C3AED, #C084FC)',
  'linear-gradient(135deg, #B91C1C, #F87171)',
  'linear-gradient(135deg, #0E7490, #22D3EE)',
]

// Map CSS variable color names to their pre-defined dim variants.
// This avoids invalid CSS like "var(--danger)1A".
const DIM_COLOR = {
  'var(--danger)':  'var(--danger-dim)',
  'var(--warning)': 'var(--warning-dim)',
  'var(--success)': 'var(--success-dim)',
  'var(--accent)':  'var(--accent-dim)',
  'var(--info)':    'var(--info-dim)',
  'var(--text-3)':  'var(--surface2)',
}
function dimOf(color) {
  return DIM_COLOR[color] ?? 'var(--surface2)'
}

function avatarGrad(username) {
  let hash = 0
  for (const c of username) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return AVATAR_GRADS[Math.abs(hash) % AVATAR_GRADS.length]
}

export default function UserRow({ username, sub, badge, badgeColor, onClick }) {
  const initial = username?.[0]?.toUpperCase() || '?'
  const grad    = avatarGrad(username || '')

  return (
    <button
      onClick={onClick}
      className="user-row"
    >
      {/* Avatar */}
      <div
        className="user-avatar"
        style={{ background: grad, boxShadow: `0 4px 12px ${grad.match(/#[A-Fa-f0-9]{6}/)?.[0] ?? '#8B5CF6'}44` }}
      >
        {initial}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          @{username}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>

      {/* Badge */}
      {badge && (
        <span style={{
          fontSize: 10, fontWeight: 700,
          padding: '4px 9px',
          borderRadius: 999,
          background: dimOf(badgeColor || 'var(--accent)'),
          color: badgeColor || 'var(--accent)',
          border: `1px solid ${badgeColor || 'var(--accent)'}`,
          flexShrink: 0,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          opacity: 0.92,
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}
