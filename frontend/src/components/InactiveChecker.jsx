import { useState, useEffect, useRef } from 'react'
import { ScanSearch, X, ChevronRight, RotateCcw } from 'lucide-react'
import BottomSheet from './BottomSheet'
import UserRow     from './UserRow'
import { useApp }  from '../AppContext'
import { startCheck, getCheckStatus, cancelCheck } from '../api/client'

export default function InactiveChecker({ totalFollowing }) {
  const { latestSnapshot, statuses, updateStatuses } = useApp()
  const [phase,     setPhase]     = useState('idle')
  const [job,       setJob]       = useState(null)
  const [jobId,     setJobId]     = useState(null)
  const [inactive,  setInactive]  = useState([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    if (!latestSnapshot) return
    const followerSet = new Set(latestSnapshot.followers.map(u => u.username))
    const existing = latestSnapshot.following.filter(u =>
      !followerSet.has(u.username) && statuses[u.username] === 'private_or_inactive'
    ).map(u => ({ username: u.username, status: 'private_or_inactive' }))
    if (existing.length) { setInactive(existing); setPhase('done') }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function startScan() {
    if (!latestSnapshot) return
    try {
      const followerSet = new Set(latestSnapshot.followers.map(u => u.username))

      const mutualStatus = {}
      for (const u of latestSnapshot.following) {
        if (followerSet.has(u.username)) mutualStatus[u.username] = 'active_public'
      }
      if (Object.keys(mutualStatus).length) updateStatuses(mutualStatus)

      const toCheck = latestSnapshot.following
        .filter(u => !followerSet.has(u.username) && statuses[u.username] !== 'deleted')
        .map(u => u.username)

      const { data } = await startCheck(toCheck)
      setJobId(data.job_id)
      setJob({ status: 'running', total: toCheck.length, checked: 0 })
      setPhase('running')
      pollRef.current = setInterval(() => poll(data.job_id), 2000)
    } catch {
      setPhase('error')
    }
  }

  async function poll(id) {
    try {
      const { data } = await getCheckStatus(id)
      setJob({ ...data })

      if (data.status === 'done' || data.status === 'blocked') {
        clearInterval(pollRef.current)
        if (data.results) {
          updateStatuses(data.results)
          const merged = { ...statuses, ...data.results }
          const followerSet = new Set(latestSnapshot.followers.map(u => u.username))
          const items = latestSnapshot.following.filter(u =>
            !followerSet.has(u.username) && merged[u.username] === 'private_or_inactive'
          ).map(u => ({ username: u.username, status: 'private_or_inactive' }))
          setInactive(items)
        }
        setPhase(data.status === 'blocked' ? 'blocked' : 'done')
      } else if (data.status === 'error' || data.status === 'cancelled') {
        clearInterval(pollRef.current)
        setPhase(data.status)
      }
    } catch {
      clearInterval(pollRef.current)
    }
  }

  async function cancel() {
    if (jobId) await cancelCheck(jobId).catch(() => {})
    clearInterval(pollRef.current)
    setPhase('idle'); setJob(null)
  }

  function reset() { setPhase('idle'); setJob(null) }

  useEffect(() => () => clearInterval(pollRef.current), [])

  const pct = job ? Math.round((job.checked / Math.max(job.total, 1)) * 100) : 0

  const title = {
    idle:      'Find Ghost Accounts',
    running:   `Scanning… ${pct}%`,
    done:      `${inactive.length} inactive account${inactive.length !== 1 ? 's' : ''} found`,
    blocked:   `Partially checked — ${inactive.length} inactive found`,
    error:     'Scan failed',
    cancelled: 'Scan cancelled',
  }[phase]

  const subtitle = {
    idle:      "Checks non-mutual follows for private or deactivated accounts",
    running:   `${job?.checked ?? 0} / ${job?.total ?? totalFollowing} accounts checked`,
    done:      inactive.length ? 'Tap arrow to view the list' : 'All following accounts are active',
    blocked:   `Rate-limited by Instagram after ${job?.checked ?? '?'} checks — partial results saved`,
    error:     'Checker backend may be offline — try again later',
    cancelled: 'Scan was cancelled',
  }[phase]

  return (
    <>
      <div className="checker-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: phase === 'running' ? 14 : 0 }}>
          {/* Icon */}
          <div className="checker-icon">
            <ScanSearch size={19} color="var(--accent)" strokeWidth={2} />
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
              {title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
              {subtitle}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {phase === 'idle' && (
              <ActionBtn onClick={startScan} label="Scan" color="var(--accent)" />
            )}
            {phase === 'running' && (
              <IconBtn onClick={cancel} icon={<X size={14} strokeWidth={2.5} />} color="var(--danger-dim)" textColor="var(--danger)" />
            )}
            {(phase === 'done' || phase === 'blocked') && inactive.length > 0 && (
              <IconBtn onClick={() => setSheetOpen(true)} icon={<ChevronRight size={16} strokeWidth={2.5} />} color="var(--accent-dim)" textColor="var(--accent-2)" />
            )}
            {['done', 'blocked', 'cancelled', 'error'].includes(phase) && (
              <IconBtn onClick={reset} icon={<RotateCcw size={13} strokeWidth={2.5} />} color="var(--surface2)" textColor="var(--text-2)" />
            )}
          </div>
        </div>

        {/* Progress bar */}
        {phase === 'running' && job && (
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {/* Results sheet */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="👻 Inactive Accounts" color="var(--text-3)">
        <div style={{ padding: '12px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            These accounts appear private or deactivated — they still count in your following total but aren't publicly visible.
          </p>
        </div>
        {inactive.map(item => (
          <UserRow
            key={item.username}
            username={item.username}
            badge="Private / Inactive"
            badgeColor="var(--warning)"
            onClick={() => setSheetOpen(false)}
          />
        ))}
      </BottomSheet>
    </>
  )
}

function ActionBtn({ onClick, label, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: color, border: 'none', borderRadius: 10,
        padding: '8px 16px', fontSize: 13, fontWeight: 700,
        color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4,
        flexShrink: 0, WebkitTapHighlightColor: 'transparent',
        boxShadow: '0 4px 16px var(--accent-glow)',
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
      onPointerDown={e => e.currentTarget.style.transform = 'scale(0.94)'}
      onPointerUp={e   => e.currentTarget.style.transform = 'scale(1)'}
      onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {label}
    </button>
  )
}

function IconBtn({ onClick, icon, color, textColor }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: color, border: 'none', borderRadius: 10,
        width: 34, height: 34,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: textColor, cursor: 'pointer',
        flexShrink: 0, WebkitTapHighlightColor: 'transparent',
        transition: 'transform 0.12s, background 0.12s',
      }}
      onPointerDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
      onPointerUp={e   => e.currentTarget.style.transform = 'scale(1)'}
      onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {icon}
    </button>
  )
}
