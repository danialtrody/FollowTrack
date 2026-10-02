import { useState, useMemo } from 'react'
import { ChevronRight, Users, UserCheck, TrendingUp, TrendingDown } from 'lucide-react'
import { useApp }        from '../AppContext'
import PageHeader        from '../components/PageHeader'
import BottomSheet       from '../components/BottomSheet'
import UserRow           from '../components/UserRow'
import EmptyState        from '../components/EmptyState'
import CountUp           from '../components/CountUp'
import Donut             from '../components/Donut'
import { getNotFollowingBack, getPendingSent,
         getFollowersList, getFollowingList,
         getLostFollowers,
         getNewFollowers, getBlocked, getMutuals, getFans,
         getNetChange, formatDate } from '../lib/analysis'

const CARDS = [
  {
    key:        'mutuals',
    group:      'people',
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
    group:      'people',
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
    group:      'people',
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
    group:      'changes',
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
    group:      'changes',
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
    group:      'other',
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
    group:      'other',
    label:      'Blocked',
    desc:       "Accounts you've blocked",
    emoji:      '🚫',
    color:      'var(--text-2)',
    dimColor:   'var(--surface2)',
    badge:      'Blocked',
    badgeColor: 'var(--text-2)',
  }
]

const GROUPS = [
  { key: 'people',  title: 'Your people' },
  { key: 'changes', title: 'Changes since last export' },
  { key: 'other',   title: 'Other' },
]

export default function DashboardPage() {
  const { snapshots, latestSnapshot, statuses, dismissed, dismiss, restore } = useApp()
  const [sheet,     setSheet]     = useState(null)
  const [listSheet, setListSheet] = useState(null)
  const [listItems, setListItems] = useState([])
  const [showHidden, setShowHidden] = useState(false)

  const computed = useMemo(() => {
    if (!latestSnapshot) return null
    const snap = latestSnapshot
    const nfb  = getNotFollowingBack(snap, statuses)
    return {
      nfb,
      itemsByCard: {
        not_following_back: nfb,
        pending_sent:       getPendingSent(snap),
        lost_followers:     getLostFollowers(snapshots, statuses),
        new_followers:      getNewFollowers(snapshots),
        blocked:            getBlocked(snap),
        mutuals:            getMutuals(snap),
        fans:               getFans(snap),
      },
      net:            getNetChange(snapshots, statuses),
      followingCount: getFollowingList(snap, statuses).length,
    }
  }, [snapshots, latestSnapshot, statuses])

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

  const snap = latestSnapshot
  const { nfb, itemsByCard, net, followingCount } = computed

  const keyOf = (card, item) => `${card.key}:${item.username}`


  const followersCount = snap.followers_count

  const mutualCount = itemsByCard.mutuals.length
  const fanCount    = itemsByCard.fans.length
  const nfbCount    = nfb.length
  const followBackRate = mutualCount + nfbCount
    ? Math.round((mutualCount / (mutualCount + nfbCount)) * 100) : 0
  const breakdown = [
    { label: 'Mutuals',            value: mutualCount, color: 'var(--success)' },
    { label: 'Not following back', value: nfbCount,    color: 'var(--danger)'  },
    { label: 'Fans',               value: fanCount,    color: 'var(--warning)' },
  ]

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
        <div className="page-inner dash-wide">

          <div className="dash-stats fade-up">
            <button className="dash-stat" onClick={() => openList('followers')}>
              <span className="dash-stat-icon" style={{ background: 'var(--success-dim)', color: 'var(--success)' }}>
                <Users size={18} strokeWidth={2.2} />
              </span>
              <span className="dash-stat-number" style={{ background: 'var(--grad-success)' }}>
                <CountUp value={followersCount} />
              </span>
              <span className="stat-label">Followers</span>
              <ChevronRight className="dash-stat-chev" size={16} strokeWidth={2.5} />
            </button>

            <button className="dash-stat" onClick={() => openList('following')}>
              <span className="dash-stat-icon" style={{ background: 'var(--accent-dim)', color: 'var(--accent-2)' }}>
                <UserCheck size={18} strokeWidth={2.2} />
              </span>
              <span className="dash-stat-number" style={{ background: 'var(--grad-accent)' }}>
                <CountUp value={followingCount} />
              </span>
              <span className="stat-label">Following</span>
              <ChevronRight className="dash-stat-chev" size={16} strokeWidth={2.5} />
            </button>

            {net && (
              <div className="dash-net" data-dir={net.net > 0 ? 'up' : net.net < 0 ? 'down' : 'flat'}>
                <span className="dash-stat-icon dash-net-icon">
                  {net.net < 0 ? <TrendingDown size={18} strokeWidth={2.2} /> : <TrendingUp size={18} strokeWidth={2.2} />}
                </span>
                <span className="dash-net-value">
                  {net.net > 0 ? '+' : net.net < 0 ? '−' : ''}<CountUp value={Math.abs(net.net)} />
                </span>
                <span className="stat-label">Net followers</span>
                <span className="dash-net-split">
                  <b className="gain">+{net.gained}</b>
                  <b className="loss">−{net.lost}</b>
                  <span>since {formatDate(net.since)}</span>
                </span>
              </div>
            )}
          </div>

          <div className="dash-overview fade-up" style={{ animationDelay: '80ms' }}>
            <Donut segments={breakdown} centerValue={`${followBackRate}%`} centerLabel="follow back" />
            <div className="dash-overview-text">
              <h2 className="dash-section-title">Audience breakdown</h2>
              <ul className="dash-legend">
                {breakdown.map(b => (
                  <li key={b.label}>
                    <span className="dash-legend-dot" style={{ background: b.color }} />
                    <span className="dash-legend-label">{b.label}</span>
                    <b><CountUp value={b.value} /></b>
                  </li>
                ))}
              </ul>
              <p className="dash-overview-note">
                {followBackRate}% of the accounts you follow follow you back.
              </p>
            </div>
          </div>

          {GROUPS.map(group => (
            <section key={group.key} className="dash-section">
              <h2 className="dash-section-title">{group.title}</h2>
              <div className="dash-grid">
                {CARDS.filter(c => c.group === group.key).map(card => {
                  const count = getItems(card).length
                  return (
                    <button
                      key={card.key}
                      className="dash-tile fade-up"
                      style={{ '--c': card.color, animationDelay: `${(CARDS.indexOf(card) + 2) * 50}ms` }}
                      onClick={() => openCard(card)}
                    >
                      <span className="dash-tile-icon" style={{ background: card.dimColor }}>{card.emoji}</span>
                      <span className="dash-tile-body">
                        <span className="dash-tile-label">{card.label}</span>
                        <span className="dash-tile-desc">{card.desc}</span>
                      </span>
                      <span className="dash-tile-count" data-zero={count === 0}>
                        <CountUp value={count} />
                        <ChevronRight size={16} strokeWidth={2.5} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}

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
