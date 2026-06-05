import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useApp }        from '../AppContext'
import PageHeader        from '../components/PageHeader'
import BottomSheet       from '../components/BottomSheet'
import UserRow           from '../components/UserRow'
import EmptyState        from '../components/EmptyState'
import InactiveChecker   from '../components/InactiveChecker'
import { getNotFollowingBack, getPendingSent,
         getFollowersList, getFollowingList }   from '../lib/analysis'

const CARDS = [
  {
    key:        'not_following_back',
    label:      'Not Following Back',
    desc:       "You follow them · they don't follow back",
    emoji:      '👻',
    color:      'var(--danger)',
    dimColor:   'var(--danger-dim)',
    grad:       'linear-gradient(135deg, rgba(185,28,28,0.12) 0%, rgba(248,113,113,0.06) 100%)',
    borderCol:  'rgba(248,113,113,0.22)',
    badge:      "Doesn't follow back",
    badgeColor: 'var(--danger)',
  },
  {
    key:        'pending_sent',
    label:      'Pending Requests',
    desc:       "You sent a request · not accepted yet",
    emoji:      '⏳',
    color:      'var(--accent)',
    dimColor:   'var(--accent-dim)',
    grad:       'linear-gradient(135deg, rgba(109,40,217,0.12) 0%, rgba(139,92,246,0.06) 100%)',
    borderCol:  'rgba(139,92,246,0.22)',
    badge:      'Pending',
    badgeColor: 'var(--accent)',
    extra:      true,
  },
]

export default function DashboardPage() {
  const { latestSnapshot, statuses } = useApp()
  const [sheet,     setSheet]     = useState(null)
  const [listSheet, setListSheet] = useState(null)
  const [listItems, setListItems] = useState([])

  if (!latestSnapshot) {
    return (
      <div className="page-root">
        <PageHeader title="Dashboard" />
        <EmptyState
          icon="📂"
          title="No data yet"
          sub="Upload your Instagram ZIP export to get started."
        />
      </div>
    )
  }

  const snap    = latestSnapshot
  const nfb     = getNotFollowingBack(snap, statuses)
  const pending = getPendingSent(snap)

  const followersCount = snap.followers_count
  const followingCount = getFollowingList(snap, statuses).length

  function getItems(card) {
    return card.extra ? pending : nfb
  }

  function openCard(card) {
    setSheet({
      title:      `${card.emoji} ${card.label}`,
      color:      card.color,
      badge:      card.badge,
      badgeColor: card.badgeColor,
      items:      getItems(card),
    })
  }

  function openList(type) {
    setListSheet(type)
    setListItems(type === 'followers' ? getFollowersList(snap) : getFollowingList(snap, statuses))
  }

  return (
    <div className="page-root">
      <PageHeader title="Dashboard" />

      <div className="page-scroll scroll-area">
        <div className="page-inner">

          {/* ── Stat bar ── */}
          <div className="stat-bar fade-up">
            <button className="stat-card-btn" onClick={() => openList('followers')}>
              <span className="stat-number" style={{
                background: 'var(--grad-success)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {followersCount.toLocaleString()}
              </span>
              <span className="stat-label">Followers</span>
            </button>

            <button className="stat-card-btn" onClick={() => openList('following')}>
              <span className="stat-number" style={{
                background: 'var(--grad-accent)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {followingCount.toLocaleString()}
              </span>
              <span className="stat-label">Following</span>
            </button>
          </div>

          {/* ── Ghost account scanner ── */}
          <div className="fade-up" style={{ animationDelay: '60ms' }}>
            <InactiveChecker totalFollowing={followingCount} />
          </div>

          {/* ── Feature cards ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CARDS.map((card, idx) => {
              const items = getItems(card)
              const count = items.length
              return (
                <button
                  key={card.key}
                  className="feature-card fade-up"
                  style={{ animationDelay: `${(idx + 2) * 60}ms` }}
                  onClick={() => openCard(card)}
                >
                  {/* Icon */}
                  <div className="feature-icon-box" style={{ background: card.dimColor }}>
                    <span style={{ fontSize: 26 }}>{card.emoji}</span>
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3, color: 'var(--text)' }}>
                      {card.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
                      {card.desc}
                    </div>
                  </div>

                  {/* Count + arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 30, fontWeight: 900,
                      letterSpacing: '-1.5px',
                      color: count > 0 ? card.color : 'var(--text-3)',
                      lineHeight: 1,
                    }}>
                      {count}
                    </span>
                    <ChevronRight size={16} color="var(--text-3)" strokeWidth={2.5} />
                  </div>
                </button>
              )
            })}
          </div>

        </div>
      </div>

      {/* ── Card bottom sheet ── */}
      {sheet && (
        <BottomSheet open onClose={() => setSheet(null)} title={sheet.title} color={sheet.color}>
          {sheet.items.length === 0 ? (
            <EmptyState icon="✨" title="All clear" sub="No users in this category." />
          ) : (
            <>
              {/* Status summary chips */}
              {sheet.items.some(i => i.status) && (
                <div style={{ padding: '10px 20px 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { status: 'active_public',      label: 'Active — chose not to follow', color: 'var(--danger)',  bg: 'var(--danger-dim)'  },
                    { status: 'private_or_inactive', label: 'Private or deactivated',       color: 'var(--warning)', bg: 'var(--warning-dim)' },
                  ].map(({ status, label, color, bg }) => {
                    const n = sheet.items.filter(i => i.status === status).length
                    return n > 0 ? (
                      <span key={status} style={{
                        fontSize: 11, color,
                        background: bg,
                        border: `1px solid ${color}`,
                        padding: '4px 9px', borderRadius: 999, fontWeight: 700, opacity: 0.92,
                      }}>
                        {n} {label}
                      </span>
                    ) : null
                  })}
                </div>
              )}

              {sheet.items.map(item => {
                const b = statusBadge(item.status, sheet.badge, sheet.badgeColor)
                return (
                  <UserRow
                    key={item.username}
                    username={item.username}
                    sub={formatDate(item.followed_at || item.event_ts)}
                    badge={b.label}
                    badgeColor={b.color}
                    onClick={() => {}}
                  />
                )
              })}
            </>
          )}
        </BottomSheet>
      )}

      {/* ── Followers / Following list sheet ── */}
      {listSheet && (
        <BottomSheet
          open
          onClose={() => { setListSheet(null); setListItems([]) }}
          title={listSheet === 'followers' ? '👥 Followers' : '➡️ Following'}
          color={listSheet === 'followers' ? 'var(--success)' : 'var(--accent)'}
        >
          {listItems.length === 0 ? (
            <EmptyState icon="📭" title="No data" sub="Upload a snapshot first." />
          ) : (
            listItems.map(item => (
              <UserRow
                key={item.username}
                username={item.username}
                sub={formatDate(item.followed_at)}
                badge={null}
                badgeColor="var(--text-3)"
                onClick={() => {}}
              />
            ))
          )}
        </BottomSheet>
      )}
    </div>
  )
}

function statusBadge(status, fallbackLabel, fallbackColor) {
  if (status === 'active_public')       return { label: 'Active',             color: 'var(--danger)'  }
  if (status === 'private_or_inactive') return { label: 'Private / Inactive', color: 'var(--warning)' }
  if (status === 'deleted')             return { label: 'Deleted',             color: 'var(--text-3)'  }
  return { label: fallbackLabel, color: fallbackColor }
}

function formatDate(dt) {
  if (!dt) return null
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
