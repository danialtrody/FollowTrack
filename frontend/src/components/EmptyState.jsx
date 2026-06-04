export default function EmptyState({ icon, title, sub }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      gap: 12,
      color: 'var(--text-3)',
    }}>
      <span style={{ fontSize: 48 }}>{icon || '🔍'}</span>
      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-2)' }}>{title}</span>
      {sub && <span style={{ fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>{sub}</span>}
    </div>
  )
}
