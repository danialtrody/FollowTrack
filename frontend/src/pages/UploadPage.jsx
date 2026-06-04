import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { parseZip }                                     from '../lib/parseZip'
import { saveSnapshot, getPreviousSnapshot, saveEvents,
         updateUsersStatus, getUserStatuses, clearAll } from '../lib/db'
import { computeDiff, computeEvents }                   from '../lib/analysis'
import { startCheck, getCheckStatus }                   from '../api/client'
import PageHeader from '../components/PageHeader'

export default function UploadPage() {
  const [phase,        setPhase]        = useState('idle')
  const [message,      setMessage]      = useState('')
  const [upload,       setUpload]       = useState(null)
  const [scan,         setScan]         = useState(null)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetting,    setResetting]    = useState(false)
  const inputRef  = useRef()
  const pollRef   = useRef()
  const navigate  = useNavigate()

  async function pollScan(jobId) {
    if (!jobId) { clearInterval(pollRef.current); setPhase('success'); return }
    try {
      const { data } = await getCheckStatus(jobId)
      setScan({ ...data })
      if (['done', 'error', 'cancelled'].includes(data.status)) {
        clearInterval(pollRef.current)
        if (data.results) await updateUsersStatus(data.results)
        setPhase('success')
      }
    } catch {
      clearInterval(pollRef.current)
      setPhase('success')
    }
  }

  useEffect(() => () => clearInterval(pollRef.current), [])

  async function handleFile(file) {
    if (!file) return
    if (!file.name.endsWith('.zip')) {
      setPhase('error')
      setMessage('Please select a .zip file from your Instagram data export.')
      return
    }
    setPhase('uploading')
    try {
      // 1. Parse ZIP in the browser
      const parsed = await parseZip(file)

      // 2. Save to IndexedDB (throws 'DUPLICATE' if already uploaded)
      let snapshot
      try {
        snapshot = await saveSnapshot(parsed)
      } catch (err) {
        if (err.message === 'DUPLICATE') {
          setPhase('error')
          setMessage('This file was already uploaded.')
          return
        }
        throw err
      }

      // 3. Compute diff against previous snapshot
      const [prevSnap, statuses] = await Promise.all([
        getPreviousSnapshot(snapshot.id),
        getUserStatuses(),
      ])

      let diff = null
      const isFirstUpload = !prevSnap
      if (prevSnap) {
        diff = computeDiff(prevSnap, snapshot, statuses)
        const events = computeEvents(prevSnap, snapshot, snapshot.id)
        if (events.length) await saveEvents(events)
      }

      // 4. Mark mutual followers as active_public instantly (no HTTP needed)
      const followerSet = new Set(parsed.followers.map(u => u.username))
      const mutualStatus = {}
      for (const u of parsed.following) {
        if (followerSet.has(u.username)) mutualStatus[u.username] = 'active_public'
      }
      if (Object.keys(mutualStatus).length) await updateUsersStatus(mutualStatus)

      // 5. Start background HTTP check for non-mutuals
      const nonMutual = parsed.following
        .filter(u => !followerSet.has(u.username) && !u.username.startsWith('__deleted__'))
        .map(u => u.username)

      let scanJobId = null
      if (nonMutual.length > 0) {
        try {
          const { data: jobData } = await startCheck(nonMutual)
          scanJobId = jobData.job_id
        } catch { /* checker backend unavailable — not fatal */ }
      }

      setUpload({
        snapshot: { followers_count: snapshot.followers_count, following_count: snapshot.following_count },
        diff,
        is_first_upload: isFirstUpload,
        scan_job_id: scanJobId,
      })
      setPhase('scanning')
      if (scanJobId) {
        pollRef.current = setInterval(() => pollScan(scanJobId), 2000)
      } else {
        setPhase('success')
      }
    } catch (err) {
      setPhase('error')
      setMessage('Upload failed. Make sure this is a valid Instagram export ZIP.')
    }
  }

  function reset() {
    clearInterval(pollRef.current)
    setPhase('idle'); setMessage(''); setUpload(null); setScan(null)
    setResetConfirm(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleReset() {
    setResetting(true)
    try {
      await clearAll()
      reset()
    } catch {
      setResetConfirm(false)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="FollowTrack" />

      <div className="scroll-area" style={{
        flex: 1, padding: '20px',
        paddingBottom: 'calc(var(--nav-height) + var(--sab) + 20px)',
        overflowY: 'auto',
      }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
            Analyze Your<br />Instagram Followers
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Export your data from Instagram and upload the ZIP here.
          </p>
        </div>

        {/* Drop zone */}
        {(phase === 'idle' || phase === 'dragging') && (
          <div
            onDragOver={e => { e.preventDefault(); setPhase('dragging') }}
            onDragLeave={() => setPhase('idle')}
            onDrop={e => { e.preventDefault(); setPhase('idle'); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${phase === 'dragging' ? 'var(--accent)' : 'var(--border-light)'}`,
              borderRadius: 'var(--radius-lg)',
              background: phase === 'dragging' ? 'var(--accent-dim)' : 'var(--surface)',
              padding: '48px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              cursor: 'pointer', transition: 'all 0.2s', marginBottom: 24,
            }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={32} color="var(--accent)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Tap to upload ZIP</p>
              <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Instagram data export</p>
            </div>
            <input ref={inputRef} type="file" accept=".zip" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        )}

        {/* Uploading / parsing */}
        {phase === 'uploading' && (
          <div style={{ ...card, alignItems: 'center', gap: 16, padding: '40px 24px', marginBottom: 24 }}>
            <Spinner />
            <p style={{ fontSize: 16, fontWeight: 600 }}>Reading & analyzing…</p>
          </div>
        )}

        {/* Scanning */}
        {phase === 'scanning' && (
          <div style={{ ...card, gap: 14, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Spinner size={22} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>Classifying accounts…</span>
            </div>
            {scan && (
              <>
                <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${Math.round((scan.checked / Math.max(scan.total, 1)) * 100)}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.4s' }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  {scan.checked} / {scan.total} checked
                </p>
              </>
            )}
          </div>
        )}

        {/* Success */}
        {phase === 'success' && upload && (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            <div style={{ ...card, borderColor: 'var(--success)40', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={24} color="var(--success)" />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Done!</span>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <Pill label="Followers" value={upload.snapshot.followers_count} color="var(--success)" />
                <Pill label="Following" value={upload.snapshot.following_count} color="var(--accent)" />
              </div>

              {upload.diff && !upload.is_first_upload && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <DiffPill label="New Followers"      value={upload.diff.new_followers?.length ?? 0}      color="var(--success)" />
                  <DiffPill label="Lost Followers"     value={upload.diff.unfollowers?.length ?? 0}         color="var(--danger)"  />
                  <DiffPill label="Not Following Back" value={upload.diff.not_following_back?.length ?? 0}  color="var(--warning)" />
                </div>
              )}

              {scan && scan.status === 'done' && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  <strong>Account scan:</strong>{' '}
                  {scan.active_public ?? 0} active public ·{' '}
                  {scan.private_or_inactive ?? 0} private/deactivated ·{' '}
                  {scan.deleted ?? 0} deleted (hidden)
                </div>
              )}

              {upload.is_first_upload && (
                <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  First upload saved. Upload again later to track who unfollowed you.
                </p>
              )}
            </div>

            <button className="btn btn-primary btn-full" onClick={() => navigate('/dashboard')}>
              View Dashboard
            </button>
            <button className="btn btn-ghost btn-full" onClick={reset}>
              Upload Another
            </button>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            <div style={{ ...card, borderColor: 'var(--danger)40', gap: 12 }}>
              <AlertCircle size={24} color="var(--danger)" />
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)' }}>Upload failed</p>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>{message}</p>
            </div>
            <button className="btn btn-ghost btn-full" onClick={reset}>Try Again</button>
          </div>
        )}

        {/* Reset confirmation */}
        {phase === 'idle' && resetConfirm && (
          <div className="fade-up" style={{ ...card, borderColor: 'var(--danger)40', gap: 12, marginBottom: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)' }}>Reset all data?</p>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
              This will permanently delete all snapshots, follower history, and user data. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-full"
                style={{ flex: 1, background: 'var(--danger)', color: '#fff', border: 'none', opacity: resetting ? 0.6 : 1 }}
                onClick={handleReset}
                disabled={resetting}
              >
                {resetting ? 'Resetting…' : 'Yes, reset everything'}
              </button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setResetConfirm(false)} disabled={resetting}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* How-to guide */}
        {phase === 'idle' && (
          <div style={card}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>
              How to export from iPhone
            </p>
            {[
              ['1', 'Open Instagram → Profile → ☰ Menu'],
              ['2', 'Settings → Your activity → Download your information'],
              ['3', 'Select "Followers and following"'],
              ['4', 'Choose JSON format → Request download'],
              ['5', 'Download ZIP from email · upload here'],
            ].map(([n, t]) => (
              <div key={n} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--accent-dim)', color: 'var(--accent)',
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{n}</span>
                <span style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        )}

        {/* Reset trigger */}
        {phase === 'idle' && !resetConfirm && (
          <button
            className="btn btn-ghost btn-full"
            style={{ marginTop: 8, color: 'var(--danger)', opacity: 0.7, fontSize: 13 }}
            onClick={() => setResetConfirm(true)}
          >
            Reset all data
          </button>
        )}
      </div>
    </div>
  )
}

const card = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '20px',
  display: 'flex', flexDirection: 'column',
}

function Spinner({ size = 32 }) {
  return (
    <>
      <svg viewBox="0 0 48 48" style={{ animation: 'spin 1s linear infinite', width: size, height: size, flexShrink: 0 }}>
        <circle cx="24" cy="24" r="20" fill="none" stroke="var(--surface3)" strokeWidth="4" />
        <circle cx="24" cy="24" r="20" fill="none" stroke="var(--accent)" strokeWidth="4"
          strokeDasharray="40 90" strokeLinecap="round" />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

function Pill({ label, value, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</div>
    </div>
  )
}

function DiffPill({ label, value, color }) {
  return (
    <div style={{
      background: `${color}18`, border: `1px solid ${color}44`,
      borderRadius: 12, padding: '10px 8px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    }}>
      <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 10, color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
    </div>
  )
}
