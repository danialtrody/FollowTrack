export default function EmptyState({ icon, title, sub }) {
  return (
    <div className="empty-state" style={{ flex: 1 }}>
      <div className="empty-icon-wrap">{icon || '🔍'}</div>
      <div>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>
          {title}
        </p>
        {sub && (
          <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6, maxWidth: 260 }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}
