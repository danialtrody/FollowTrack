import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
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
  const [menuOpen, setMenuOpen] = useState(false)

  if (snapshots.length < 2) {
    return (
      <div className="page-root">
        <PageHeader title="Timeline" />
        <EmptyState icon="🕒" title="Need two exports" sub="Upload at least two exports to see what changed between them." />
      </div>
    )
  }

  const allGroups = getTimeline(snapshots, statuses)
  const counts = { all: 0, joined: 0, left: 0, blocked: 0 }
  for (const g of allGroups) for (const e of g.events) { counts.all++; counts[e.type] = (counts[e.type] ?? 0) + 1 }

  const groups = allGroups
    .map(g => ({ ...g, events: g.events.filter(e => filter === 'all' || e.type === filter) }))
    .filter(g => g.events.length)

  const filters = [{ key: 'all', label: 'All', color: 'var(--accent-2)' },
                   ...Object.entries(TYPES).map(([key, t]) => ({ key, ...t }))]

  return (
    <div className="page-root">
      <PageHeader title="Timeline" />
      <div className="page-scroll scroll-area">
        <div className="page-inner tl-wide">
          <div className="tl-layout">

            <aside className="tl-filters">
              <p className="up-eyebrow tl-eyebrow">Filter changes</p>
              {/* Mobile: dropdown */}
              {(() => {
                const cur = filters.find(f => f.key === filter)
                return (
                  <div className="tl-select" onKeyDown={e => e.key === 'Escape' && setMenuOpen(false)}>
                    <button
                      className="tl-select-btn"
                      style={{ '--c': cur.color }}
                      aria-haspopup="listbox"
                      aria-expanded={menuOpen}
                      onClick={() => setMenuOpen(o => !o)}
                    >
                      <span className="tl-dot" />
                      <span className="tl-select-label">{cur.label}</span>
                      <span className="tl-count">{counts[cur.key] ?? 0}</span>
                      <ChevronDown className="tl-select-chev" size={18} strokeWidth={2.5} />
                    </button>
                    {menuOpen && (
                      <>
                        <div className="tl-menu-backdrop" onClick={() => setMenuOpen(false)} />
                        <div className="tl-menu" role="listbox">
                          {filters.map(f => (
                            <button
                              key={f.key}
                              role="option"
                              aria-selected={filter === f.key}
                              className={`tl-option${filter === f.key ? ' active' : ''}`}
                              style={{ '--c': f.color }}
                              onClick={() => { setFilter(f.key); setMenuOpen(false) }}
                            >
                              <span className="tl-dot" />
                              <span className="tl-select-label">{f.label}</span>
                              <span className="tl-count">{counts[f.key] ?? 0}</span>
                              {filter === f.key && <Check size={16} strokeWidth={2.5} />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}

              {/* Desktop: side list */}
              <div className="tl-chips">
                {filters.map(f => (
                  <button
                    key={f.key}
                    className={`tl-chip${filter === f.key ? ' active' : ''}`}
                    style={{ '--c': f.color }}
                    aria-pressed={filter === f.key}
                    onClick={() => setFilter(f.key)}
                  >
                    <span className="tl-dot" />
                    <span className="tl-chip-label">{f.label}</span>
                    <span className="tl-count">{counts[f.key] ?? 0}</span>
                  </button>
                ))}
              </div>
            </aside>

            <div className="tl-feed">
              {groups.length === 0 ? (
                <EmptyState icon="✨" title="Nothing here" sub="No changes of this type." />
              ) : groups.map((g, i) => (
                <section key={g.date} className="tl-group fade-up" style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
                  <span className="tl-node" />
                  <div className="tl-group-head">
                    <h3 className="tl-date">{formatDate(g.date)}</h3>
                    <span className="tl-since">since {formatDate(g.from)} · {g.events.length} change{g.events.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="tl-card">
                    {g.events.map(e => (
                      <UserRow
                        key={e.type + e.username}
                        username={e.username}
                        badge={TYPES[e.type].label}
                        badgeColor={TYPES[e.type].color}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
