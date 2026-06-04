import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanSearch, X, ChevronRight } from 'lucide-react'
import BottomSheet from './BottomSheet'
import UserRow     from './UserRow'
import { getLatestSnapshot, getUserStatuses, updateUsersStatus } from '../lib/db'
import { startCheck, getCheckStatus, cancelCheck }               from '../api/client'

export default function InactiveChecker({ totalFollowing, onScanDone }) {
  const [phase,     setPhase]     = useState('idle')
  const [job,       setJob]       = useState(null)
  const [jobId,     setJobId]     = useState(null)
  const [inactive,  setInactive]  = useState([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const pollRef  = useRef(null)
  const navigate = useNavigate()

  // Load any already-classified inactive accounts on mount
  useEffect(() => {
    async function loadExisting() {
      const [snap, statuses] = await Promise.all([getLatestSnapshot(), getUserStatuses()])
      if (!snap) return
      const followerSet = new Set(snap.followers.map(u => u.username))
      const items = snap.following.filter(u =>
        !followerSet.has(u.username) && statuses[u.username] === 'private_or_inactive'
      ).map(u => ({ username: u.username, status: 'private_or_inactive' }))
      if (items.length) { setInactive(items); setPhase('done') }
    }
    loadExisting().catch(() => {})
  }, [])

  async function startScan() {
    try {
      const [snap, statuses] = await Promise.all([getLatestSnapshot(), getUserStatuses()])
      if (!snap) return

      const followerSet = new Set(snap.followers.map(u => u.username))

      // Mark mutual followers as active instantly — no HTTP needed
      const mutualStatus = {}
      for (const u of snap.following) {
        if (followerSet.has(u.username)) mutualStatus[u.username] = 'active_public'
      }
      if (Object.keys(mutualStatus).length) await updateUsersStatus(mutualStatus)

      // HTTP check for non-mutuals (skip already-deleted)
      const toCheck = snap.following
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
        if (data.results) await updateUsersStatus(data.results)

        const [snap, freshStatuses] = await Promise.all([getLatestSnapshot(), getUserStatuses()])
        if (snap) {
          const followerSet = new Set(snap.followers.map(u => u.username))
          const items = snap.following.filter(u =>
            !followerSet.has(u.username) && freshStatuses[u.username] === 'private_or_inactive'
          ).map(u => ({ username: u.username, status: 'private_or_inactive' }))
          setInactive(items)
        }
        setPhase(data.status === 'blocked' ? 'blocked' : 'done')
        if (onScanDone) onScanDone()
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

  useEffect(() => () => clearInterval(pollRef.current), [])

  const pct = job ? Math.round((job.checked / Math.max(job.total, 1)) * 100) : 0

  return (
    <>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '16px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: phase === 'running' ? 12 : 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'var(--accent-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ScanSearch size={20} color="var(--accent)" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {phase === 'idle'      && 'Find Ghost Accounts'}
              {phase === 'running'   && `Checking accounts… ${pct}%`}
              {phase === 'done'      && `${inactive.length} inactive account${inactive.length !== 1 ? 's' : ''} found`}
              {phase === 'blocked'   && `Partially checked — ${inactive.length} inactive found`}
              {phase === 'error'     && `Check failed`}
              {phase === 'cancelled' && 'Check cancelled'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
              {phase === 'idle'    && `Checks accounts you follow who don't follow back — skips mutual follows`}
              {phase === 'running' && `${job?.checked ?? 0} / ${job?.total ?? totalFollowing} checked`}
              {phase === 'done'    && (inactive.length ? 'Tap to see the list' : 'All clear!')}
              {phase === 'blocked' && `Instagram rate-limited after ${job?.checked ?? '?'} checks — partial results saved`}
              {phase === 'error'   && 'Something went wrong — checker backend may be offline'}
            </div>
          </div>

          {phase === 'idle' && (
            <button onClick={startScan} style={btn('var(--accent)')}>Scan</button>
          )}
          {phase === 'running' && (
            <button onClick={cancel} style={btn('var(--danger)')}><X size={14} /></button>
          )}
          {(phase === 'done' || phase === 'blocked') && inactive.length > 0 && (
            <button onClick={() => setSheetOpen(true)} style={btn('var(--accent)')}><ChevronRight size={16} /></button>
          )}
          {['done', 'blocked', 'cancelled', 'error'].includes(phase) && (
            <button onClick={() => { setPhase('idle'); setJob(null) }} style={{ ...btn('var(--surface2)'), color: 'var(--text-2)', marginLeft: 4 }}>
              Retry
            </button>
          )}
        </div>

        {phase === 'running' && job && (
          <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.4s ease' }} />
          </div>
        )}
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="👻 Inactive Accounts" color="var(--text-3)">
        <div style={{ padding: '8px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
            These accounts appear private or deactivated. They still count in your following number but aren't visible on Instagram.
          </p>
        </div>
        {inactive.map(item => (
          <UserRow
            key={item.username}
            username={item.username}
            badge="Private / Inactive"
            badgeColor="var(--text-3)"
            onClick={() => { setSheetOpen(false); navigate(`/history/${item.username}`) }}
          />
        ))}
      </BottomSheet>
    </>
  )
}

function btn(bg) {
  return {
    background: bg, border: 'none', borderRadius: 10,
    padding: '7px 14px', fontSize: 13, fontWeight: 700,
    color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 4,
    flexShrink: 0, WebkitTapHighlightColor: 'transparent',
  }
}
