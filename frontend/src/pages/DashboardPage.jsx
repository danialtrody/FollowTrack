import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import PageHeader      from '../components/PageHeader'
import BottomSheet     from '../components/BottomSheet'
import UserRow         from '../components/UserRow'
import EmptyState      from '../components/EmptyState'
import InactiveChecker from '../components/InactiveChecker'
import { getLatestSnapshot, getPreviousSnapshot, listSnapshots, getUserStatuses } from '../lib/db'
import { computeDiff, getNotFollowingBack, getPendingSent,
         getFollowersList, getFollowingList }                                      from '../lib/analysis'

const CARDS = [
  {
    key: 'not_following_back',
    label: 'Not Following Back',
    desc: 'You follow them · they don\'t follow you',
    icon: '👻',
    color: 'var(--danger)',
    dimColor: 'var(--danger-dim)',
    badge: "Doesn't follow back",
    badgeColor: 'var(--danger)',
    dataKey: 'not_following_back',
  },
  {
    key: 'unfollowers',
    label: 'Lost Followers',
    desc: 'Removed you since last upload',
    icon: '💔',
    color: 'var(--warning)',
    dimColor: 'var(--warning-dim)',
    badge: 'Unfollowed you',
    badgeColor: 'var(--warning)',
    dataKey: 'unfollowers',
  },
  {
    key: 'pending_sent',
    label: 'Pending Requests',
    desc: 'You sent a request · not accepted yet',
    icon: '⏳',
    color: 'var(--accent)',
    dimColor: 'var(--accent-dim)',
    badge: 'Pending',
    badgeColor: 'var(--accent)',
    extra: true,
  },
]

export default function DashboardPage() {
  const [diff,        setDiff]        = useState(null)
  const [stats,       setStats]       = useState(null)
  const [pending,     setPending]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [sheet,       setSheet]       = useState(null)
  const [listSheet,   setListSheet]   = useState(null)
  const [listItems,   setListItems]   = useState([])
  const [listLoading, setListLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [snap, allSnaps, statuses] = await Promise.all([
        getLatestSnapshot(),
        listSnapshots(),
        getUserStatuses(),
      ])

      if (!snap) {
        setStats(null); setDiff(null); setPending([])
        return
      }

      const prevSnap = await getPreviousSnapshot(snap.id)
      const diffResult = prevSnap
        ? computeDiff(prevSnap, snap, statuses)
        : { new_followers: [], unfollowers: [], not_following_back: getNotFollowingBack(snap, statuses) }

      setDiff(diffResult)
      setStats({
        latest_followers:    snap.followers_count,
        latest_following:    getFollowingList(snap, statuses).length,
        latest_snapshot_at:  snap.uploaded_at,
        total_snapshots:     allSnaps.length,
      })
      setPending(getPendingSent(snap))
    } catch {
      /* no data */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function getItems(card) {
    if (card.extra) return pending
    return diff?.[card.dataKey] ?? []
  }

  function openCard(card) {
    setSheet({
      title: `${card.icon} ${card.label}`,
      color: card.color,
      badge: card.badge,
      badgeColor: card.badgeColor,
      items: getItems(card),
    })
  }

  async function openList(type) {
    setListSheet(type)
    setListLoading(true)
    setListItems([])
    try {
      const [snap, statuses] = await Promise.all([getLatestSnapshot(), getUserStatuses()])
      if (snap) {
        setListItems(type === 'followers' ? getFollowersList(snap) : getFollowingList(snap, statuses))
      }
    } catch { setListItems([]) }
    finally  { setListLoading(false) }
  }

  if (loading) return <Skeleton />

  if (!stats?.latest_snapshot_at) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
        <PageHeader title="Dashboard" />
        <EmptyState icon="📂" title="No data yet" sub="Upload your Instagram ZIP export to get started." />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader
        title="Dashboard"
        right={
          <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 4 }}>
            <RefreshCw size={18} />
          </button>
        }
      />

      <div className="scroll-area" style={{
        flex: 1, padding: '16px',
        paddingBottom: 'calc(var(--nav-height) + var(--sab) + 16px)',
        overflowY: 'auto',
      }}>

        {/* Stats strip */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', marginBottom: 16, overflow: 'hidden',
        }}>
          <div style={{ display: 'flex' }}>
            <StatBtn label="Followers" value={stats.latest_followers} color="var(--success)" onClick={() => openList('followers')} />
            <div style={{ width: 1, background: 'var(--border)' }} />
            <StatBtn label="Following" value={stats.latest_following} color="var(--accent)"  onClick={() => openList('following')} />
          </div>
        </div>

        {/* Ghost account scanner */}
        <InactiveChecker totalFollowing={stats.latest_following} onScanDone={load} />

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CARDS.map(card => {
            const items = getItems(card)
            const count = items.length
            return (
              <button
                key={card.key}
                onClick={() => openCard(card)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '18px 16px',
                  cursor: 'pointer', textAlign: 'left',
                  WebkitTapHighlightColor: 'transparent', width: '100%',
                }}
                onPointerDown={e => e.currentTarget.style.background = 'var(--surface2)'}
                onPointerUp={e   => e.currentTarget.style.background = 'var(--surface)'}
                onPointerLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                <span style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: card.dimColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, flexShrink: 0,
                }}>
                  {card.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{card.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{card.desc}</div>
                </div>
                <span style={{
                  fontSize: 28, fontWeight: 800,
                  color: count > 0 ? card.color : 'var(--text-3)',
                  letterSpacing: '-1px', flexShrink: 0,
                }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Card bottom sheet */}
      {sheet && (
        <BottomSheet open onClose={() => setSheet(null)} title={sheet.title} color={sheet.color}>
          {sheet.items.length === 0 ? (
            <EmptyState icon="✨" title="All clear" sub="No users in this category." />
          ) : (
            <>
              {sheet.items.some(i => i.status) && (
                <div style={{ padding: '10px 20px 6px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[
                    { status: 'active_public',      label: 'Active — chose not to follow', color: 'var(--danger)'  },
                    { status: 'private_or_inactive', label: 'Private or deactivated',       color: 'var(--warning)' },
                  ].map(({ status, label, color }) => {
                    const n = sheet.items.filter(i => i.status === status).length
                    return n > 0 ? (
                      <span key={status} style={{ fontSize: 11, color, background: `${color}18`, padding: '3px 8px', borderRadius: 999, fontWeight: 600 }}>
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
                    onClick={() => setSheet(null)}
                  />
                )
              })}
            </>
          )}
        </BottomSheet>
      )}

      {/* Followers / Following list sheet */}
      {listSheet && (
        <BottomSheet
          open
          onClose={() => { setListSheet(null); setListItems([]) }}
          title={listSheet === 'followers' ? '👥 Followers' : '➡️ Following'}
          color={listSheet === 'followers' ? 'var(--success)' : 'var(--accent)'}
        >
          {listLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
          ) : listItems.length === 0 ? (
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

function StatBtn({ label, value, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '14px 8px', textAlign: 'center',
        background: 'none', border: 'none', cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
      onPointerDown={e => e.currentTarget.style.background = 'var(--surface2)'}
      onPointerUp={e   => e.currentTarget.style.background = 'none'}
      onPointerLeave={e => e.currentTarget.style.background = 'none'}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{label}</div>
    </button>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Dashboard" />
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="skeleton" style={{ height: 80, borderRadius: 'var(--radius)' }} />
        <div className="skeleton" style={{ height: 72, borderRadius: 'var(--radius)' }} />
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 86, borderRadius: 'var(--radius)' }} />
        ))}
      </div>
    </div>
  )
}
