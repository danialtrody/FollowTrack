import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { getEventsForUser, getUserInfo } from '../lib/db'

const EVENT_META = {
  followed_you:    { icon: '➕', label: 'Followed you',    color: 'var(--success)' },
  unfollowed_you:  { icon: '💔', label: 'Unfollowed you',  color: 'var(--danger)'  },
  re_followed_you: { icon: '🔄', label: 'Re-followed you', color: 'var(--accent)'  },
  you_followed:    { icon: '✅', label: 'You followed',     color: 'var(--info)'    },
  you_unfollowed:  { icon: '👋', label: 'You unfollowed',   color: 'var(--warning)' },
}

function avatarColor(username) {
  const colors = ['#6C63FF', '#FF453A', '#30D158', '#FFD60A', '#64D2FF', '#BF5AF2', '#FF9F0A']
  let hash = 0
  for (const c of username) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function UserHistoryPage() {
  const { username } = useParams()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    async function load() {
      const [events, user] = await Promise.all([
        getEventsForUser(username),
        getUserInfo(username),
      ])
      if (!user && !events.length) { setError(true); return }
      setData({ events, user })
    }
    load().catch(() => setError(true)).finally(() => setLoading(false))
  }, [username])

  const color = avatarColor(username)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="User History" back />

      <div
        className="scroll-area"
        style={{ flex: 1, paddingBottom: 'calc(var(--nav-height) + var(--sab) + 16px)', overflowY: 'auto' }}
      >
        {loading && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="skeleton" style={{ height: 100, borderRadius: 'var(--radius)' }} />
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--radius)' }} />)}
          </div>
        )}

        {error && (
          <EmptyState icon="❓" title="User not found" sub={`@${username} hasn't been seen in any snapshot.`} />
        )}

        {data && (
          <>
            {/* Profile card */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '28px 20px 20px', gap: 12,
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, fontWeight: 700, color: '#fff',
                border: `3px solid ${color}44`,
              }}>
                {username[0]?.toUpperCase()}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>@{username}</div>
                <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>
                  {data.events.length} event{data.events.length !== 1 ? 's' : ''} tracked
                </div>
              </div>
            </div>

            {/* Timeline */}
            {data.events.length === 0 ? (
              <EmptyState icon="📭" title="No events yet" sub="Upload more snapshots to track changes." />
            ) : (
              <div style={{ padding: '20px', position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 40, top: 20, bottom: 20,
                  width: 2, background: 'var(--border)',
                }} />
                {data.events.map((event, i) => {
                  const meta = EVENT_META[event.event_type] || { icon: '•', label: event.event_type, color: 'var(--text-2)' }
                  const date = new Date(event.detected_at)
                  return (
                    <div key={i} className="fade-up" style={{ display: 'flex', gap: 16, marginBottom: 20, animationDelay: `${i * 0.06}s` }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: `${meta.color}20`, border: `2px solid ${meta.color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0, zIndex: 1, position: 'relative',
                      }}>
                        {meta.icon}
                      </div>
                      <div style={{
                        flex: 1,
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                      }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: meta.color }}>{meta.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          {' · '}{date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                          Snapshot #{event.snapshot_id}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
