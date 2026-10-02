import { useState } from 'react'
import { useApp }     from '../AppContext'
import PageHeader     from '../components/PageHeader'
import UserRow        from '../components/UserRow'
import EmptyState     from '../components/EmptyState'
import { getTimeline, formatDate } from '../lib/analysis'

const TYPES = {
  joined:  { label: 'Followed you',   color: 'var(--success)' },
  left:    { label: 'Removed you',    color: 'var(--danger)'  },
  blocked: { label: 'You blocked',    color: 'var(--text-3)'  },
}

export default function TimelinePage() {
  const { snapshots, statuses } = useApp()
  const [filter, setFilter] = useState('all')

  if (snapshots.length < 2) {
    return (
      <div className="page-root">
        <PageHeader title="Timeline" />
        <EmptyState icon="🕒" title="Need two exports" sub="Upload at least two exports to see what changed between them." />
      </div>
    )
  }

  const groups = getTimeline(snapshots, statuses)
    .map(g => ({ ...g, events: g.events.filter(e => filter === 'all' || e.type === filter) }))
    .filter(g => g.events.length)

  return (
    <div className="page-root">
      <PageHeader title="Timeline" />
      <div className="page-scroll scroll-area">
        <div className="page-inner">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {['all', ...Object.keys(TYPES)].map(t => (
              <button
                key={t}
                className={`btn ${filter === t ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(t)}
              >
                {t === 'all' ? 'All' : TYPES[t].label}
              </button>
            ))}
          </div>

          {groups.length === 0 ? (
            <EmptyState icon="✨" title="Nothing here" sub="No changes of this type." />
          ) : groups.map(g => (
            <div key={g.date} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)', padding: '0 20px 6px' }}>
                {formatDate(g.date)} <span style={{ fontWeight: 600, color: 'var(--text-3)' }}>· since {formatDate(g.from)}</span>
              </div>
              {g.events.map(e => (
                <UserRow
                  key={e.type + e.username}
                  username={e.username}
                  badge={TYPES[e.type].label}
                  badgeColor={TYPES[e.type].color}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
