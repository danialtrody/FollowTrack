import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useApp }        from '../AppContext'
import PageHeader        from '../components/PageHeader'
import BottomSheet       from '../components/BottomSheet'
import UserRow           from '../components/UserRow'
import EmptyState        from '../components/EmptyState'
import { getNotFollowingBack, getPendingSent,
         getFollowersList, getFollowingList,
         getLostFollowers,
         getNewFollowers, getBlocked, getMutuals, getFans,
         getNetChange, formatDate } from '../lib/analysis'

const CARDS = [
  {
    key:        'mutuals',
    label:      'Mutuals',
    desc:       'You follow them · they follow you back',
    emoji:      '🤝',
    color:      'var(--success)',
    dimColor:   'var(--success-dim)',
    badge:      'Mutual',
    badgeColor: 'var(--success)',
  },
  {
    key:        'fans',
    label:      'Fans',
    desc:       "They follow you · you don't follow them",
    emoji:      '⭐',
    color:      'var(--warning)',
    dimColor:   'var(--warning-dim)',
    badge:      'Fan',
    badgeColor: 'var(--warning)',
  },
  {
    key:        'not_following_back',
    label:      'Not Following Back',
    desc:       "You follow them · they don't follow back",
    emoji:      '👻',
    color:      'var(--danger)',
    dimColor:   'var(--danger-dim)',
    badge:      "Doesn't follow back",
    badgeColor: 'var(--danger)',
  },
  {
    key:        'new_followers',
    label:      'New Followers',
    desc:       'Not in your previous export',
    emoji:      '🌱',
    color:      'var(--success)',
    dimColor:   'var(--success-dim)',
    badge:      'New',
    badgeColor: 'var(--success)',
    compare:    true,
  },
  {
    key:        'lost_followers',
    label:      'Removed Me',
    desc:       'Followed you in an earlier export · gone now',
    emoji:      '💔',
    color:      'var(--danger)',
    dimColor:   'var(--danger-dim)',
    badge:      'Removed you',
    badgeColor: 'var(--danger)',
    compare:    true,
  },
  {
    key:        'pending_sent',
    label:      'Pending Requests',
    desc:       "You sent a request · not accepted yet",
    emoji:      '⏳',
    color:      'var(--accent)',
    dimColor:   'var(--accent-dim)',
    badge:      'Pending',
    badgeColor: 'var(--accent)',
  },
  {
    key:        'blocked',
    label:      'Blocked',
    desc:       "Accounts you've blocked",
    emoji:      '🚫',
    color:      'var(--text-2)',
    dimColor:   'var(--surface2)',
    badge:      'Blocked',
    badgeColor: 'var(--text-2)',
  }
]

export default function DashboardPage() {
  const { snapshots, latestSnapshot, statuses, dismissed, dismiss, restore } = useApp()
  const [sheet,     setSheet]     = useState(null)
  const [listSheet, setListSheet] = useState(null)
  const [listItems, setListItems] = useState([])
  const [showHidden, setShowHidden] = useState(false)

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
  const itemsByCard = {
    not_following_back: nfb,
    pending_sent:       getPendingSent(snap),
    lost_followers:     getLostFollowers(snapshots, statuses),
    new_followers:      getNewFollowers(snapshots),
    blocked:            getBlocked(snap),
    mutuals:            getMutuals(snap),
    fans:               getFans(snap),
  }
  const net = getNetChange(snapshots, statuses)

  const keyOf = (card, item) => `${card.key}:${item.username}`


  const followersCount = snap.followers_count
  const followingCount = getFollowingList(snap, statuses).length

  function getItems(card) {
    return itemsByCard[card.key].filter(i => !dismissed.has(keyOf(card, i)))
  }

  function openCard(card) {
    setShowHidden(false)
    setSheet({
      title:      `${card.emoji} ${card.label}`,
      color:      card.color,
      badge:      card.badge,
      badgeColor: card.badgeColor,
      card,
      needsMore:  card.compare && snapshots.length < 2,
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

          {net && (
            <div className="fade-up" style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              padding: '12px 16px', marginBottom: 10, fontSize: 13, fontWeight: 700,
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            }}>
              <span style={{ color: 'var(--success)' }}>+{net.gained}</span>
              <span style={{ color: 'var(--danger)' }}>−{net.lost}</span>
              <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>
                followers · net {net.net > 0 ? '+' : net.net < 0 ? '−' : ''}{Math.abs(net.net)} since {formatDate(net.since)}
              </span>
            </div>
          )}

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
                  <div className="feature-icon-box" style={{ background: card.dimColor }}>
                    <span style={{ fontSize: 26 }}>{card.emoji}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3, color: 'var(--text)' }}>
                      {card.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
                      {card.desc}
                    </div>
                  </div>

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

      {sheet && (() => {
        const all     = itemsByCard[sheet.card.key]
        const hidden  = all.filter(i => dismissed.has(keyOf(sheet.card, i)))
        const visible = getItems(sheet.card)
        const shown   = showHidden ? hidden : visible
        return (
        <BottomSheet open onClose={() => setSheet(null)} title={sheet.title} color={sheet.color}>
          {shown.length === 0 ? (
            sheet.needsMore
              ? <EmptyState icon="📂" title="Need another export" sub="Upload an older or newer export to compare." />
              : <EmptyState icon="✨" title="All clear" sub={showHidden ? 'Nothing hidden.' : 'No users in this category.'} />
          ) : (
            <>
              {shown.some(i => i.status) && (
                <div style={{ padding: '10px 20px 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { status: 'active_public',      label: 'Active — chose not to follow', color: 'var(--danger)',  bg: 'var(--danger-dim)'  },
                    { status: 'private_or_inactive', label: 'Private or deactivated',       color: 'var(--warning)', bg: 'var(--warning-dim)' },
                  ].map(({ status, label, color, bg }) => {
                    const n = shown.filter(i => i.status === status).length
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

              {shown.map(item => {
                const b   = item.tag ?? statusBadge(item.status, sheet.badge, sheet.badgeColor)
                const key = keyOf(sheet.card, item)
                return (
                  <UserRow
                    key={item.username}
                    username={item.username}
                    sub={item.sub ?? formatDate(item.followed_at || item.event_ts)}
                    badge={b.label}
                    badgeColor={b.color}
                    action={showHidden
                      ? { label: 'Restore', onClick: () => restore([key]) }
                      : { label: 'Seen',    onClick: () => dismiss([key]) }}
                  />
                )
              })}
            </>
          )}

          {(hidden.length > 0 || visible.length > 1) && (
            <div style={{ padding: '12px 20px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!showHidden && visible.length > 1 && (
                <button className="btn btn-ghost" onClick={() => dismiss(visible.map(i => keyOf(sheet.card, i)))}>
                  Mark all as seen
                </button>
              )}
              {hidden.length > 0 && (
                <button className="btn btn-ghost" onClick={() => setShowHidden(h => !h)}>
                  {showHidden ? 'Back to list' : `Show ${hidden.length} hidden`}
                </button>
              )}
            </div>
          )}
        </BottomSheet>
        )
      })()}

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
