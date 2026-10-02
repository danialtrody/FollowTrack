import { useState, useRef, useEffect } from 'react'
import { useNavigate }                   from 'react-router-dom'
import { Upload, CheckCircle, AlertCircle, ArrowRight, Smartphone, Download, FileArchive, Send, Trash2, ShieldCheck } from 'lucide-react'
import { parseZip }                      from '../lib/parseZip'
import { getFollowingList }              from '../lib/analysis'
import { startCheck, getCheckStatus }    from '../api/client'
import { useApp }                        from '../AppContext'
import PageHeader                        from '../components/PageHeader'
import BottomSheet                       from '../components/BottomSheet'

const STEPS = [
  { icon: Smartphone,    text: 'Open Instagram → Profile → ☰ Menu' },
  { icon: Download,      text: 'Settings → Your activity → Download your information' },
  { icon: FileArchive,   text: 'Select "Followers and following" — choose JSON format' },
  { icon: Send,          text: 'Request download — get ZIP from email · upload here' },
]

export default function UploadPage() {
  const { snapshots, latestSnapshot, statuses, addSnapshot, updateStatuses, clearHistory } = useApp()
  const [phase,   setPhase]   = useState('idle')
  const [message, setMessage] = useState('')
  const [upload,  setUpload]  = useState(null)
  const [scan,    setScan]    = useState(null)
  const [scanNote, setScanNote] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const inputRef = useRef()
  const pollRef  = useRef()
  const navigate = useNavigate()

  async function pollScan(jobId) {
    if (!jobId) { clearInterval(pollRef.current); setPhase('success'); return }
    try {
      const { data } = await getCheckStatus(jobId)
      setScan({ ...data })
      if (['done', 'error'].includes(data.status)) {
        clearInterval(pollRef.current)
        if (data.results) updateStatuses(data.results)
        setPhase('success')
      }
    } catch {
      clearInterval(pollRef.current)
      setPhase('success')
    }
  }

  useEffect(() => () => clearInterval(pollRef.current), [])

  function reset() {
    setPhase('idle')
    setMessage('')
    setUpload(null)
    setScan(null)
    setScanNote('')
  }

  async function handleClearHistory() {
    setClearing(true)
    try { await clearHistory() }
    catch {
      setPhase('error')
      setMessage('Could not clear your history. Try again.')
    }
    setClearing(false)
    setConfirmClear(false)
  }

  async function handleFile(file) {
    if (!file) return
    if (!file.name.endsWith('.zip')) {
      setPhase('error')
      setMessage('Please select a .zip file from your Instagram data export.')
      return
    }
    setPhase('uploading')
    try {
      const parsed   = await parseZip(file)
      const snapshot = await addSnapshot(parsed)

      if (latestSnapshot && parsed.exported_at < (latestSnapshot.exported_at ?? latestSnapshot.uploaded_at)) {
        setScanNote('This export is older than your latest one, so it was saved to your history only. Your current data is unchanged.')
        setUpload({ snapshot: { followers_count: latestSnapshot.followers_count, following_count: latestSnapshot.following_count } })
        setPhase('success')
        return
      }

      const followerSet = new Set(parsed.followers.map(u => u.username))
      const mutualStatus = {}
      for (const u of parsed.following) {
        if (followerSet.has(u.username)) mutualStatus[u.username] = 'active_public'
      }
      if (Object.keys(mutualStatus).length) updateStatuses(mutualStatus)

      const nonMutual = parsed.following
        .filter(u => !followerSet.has(u.username) && !u.username.startsWith('__deleted__'))
        .map(u => u.username)

      let scanJobId = null
      if (nonMutual.length > 0) {
        try {
          const { data: jobData } = await startCheck(nonMutual)
          scanJobId = jobData.job_id
        } catch {}
      }

      setUpload({
        snapshot: { followers_count: snapshot.followers_count, following_count: snapshot.following_count },
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
      setMessage(err.response?.status === 409
        ? 'This export was already uploaded to your account. Upload a newer export to compare.'
        : 'Upload failed. Make sure this is a valid Instagram export ZIP.')
    }
  }

  const pct = scan ? Math.round((scan.checked / Math.max(scan.total, 1)) * 100) : 0

  return (
    <div className="page-root">
      <PageHeader showLogo />

      <div className="page-scroll scroll-area">
        <div className="page-inner up-wide">

          <div className="up-hero fade-up">
            <span className="up-badge"><ShieldCheck size={13} strokeWidth={2.4} /> No Instagram login needed</span>
            <h1>
              Analyze Your<br />
              <span className="grad-text">Instagram Followers</span>
            </h1>
            <p>
              Export your data from Instagram and drop the ZIP here — we'll analyze who doesn't follow back, pending requests, and ghost accounts.
            </p>
          </div>

          <div className="up-grid">
          <div className="up-main">

          {(phase === 'idle' || phase === 'dragging') && (
            <div className="fade-up" style={{ animationDelay: '60ms', marginBottom: 20 }}>
              <div
                className={`drop-zone${phase === 'dragging' ? ' dragging' : ''}`}
                role="button"
                tabIndex={0}
                aria-label="Choose your Instagram export ZIP file"
                onDragOver={e => { e.preventDefault(); setPhase('dragging') }}
                onDragLeave={() => setPhase('idle')}
                onDrop={e => { e.preventDefault(); setPhase('idle'); handleFile(e.dataTransfer.files[0]) }}
                onClick={() => inputRef.current?.click()}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
              >
                <div className="drop-zone-icon">
                  <Upload size={32} color="#fff" strokeWidth={2} />
                </div>
                <div className="drop-zone-text">
                  <p className="drop-zone-title">
                    <span className="dz-pointer">Drop your ZIP here</span>
                    <span className="dz-touch">Choose your ZIP file</span>
                  </p>
                  <p className="drop-zone-sub">
                    <span className="dz-pointer">or click to browse your files</span>
                    <span className="dz-touch">tap to browse your files</span>
                  </p>
                </div>
                <span className="up-chip">.zip file</span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".zip"
                  style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])}
                />
              </div>
            </div>
          )}

          {phase === 'uploading' && (
            <div className="fade-up" style={{ marginBottom: 20 }}>
              <div className="up-panel up-panel-center">
                <Spinner />
                <div style={{ textAlign: 'center' }}>
                  <p className="up-panel-title">Reading your data…</p>
                  <p className="up-panel-sub">Parsing ZIP and building follower map</p>
                </div>
              </div>
            </div>
          )}

          {phase === 'scanning' && (
            <div className="fade-up" style={{ marginBottom: 20 }}>
              <div className="up-panel">
                <div className="scan-head">
                  <Spinner size={24} />
                  <div style={{ minWidth: 0 }}>
                    <p className="up-panel-title" style={{ fontSize: 15 }}>Classifying accounts…</p>
                    <p className="up-panel-sub">
                      {scan ? `${scan.checked} / ${scan.total} checked` : 'Starting scan…'}
                    </p>
                  </div>
                  <span className="scan-pct">{pct}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          )}

          {phase === 'success' && upload && (
            <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div className="result-card result-success">
                <div className="result-head">
                  <div className="result-icon pop" style={{ background: 'var(--success-dim)' }}>
                    <CheckCircle size={22} color="var(--success)" />
                  </div>
                  <div>
                    <p className="up-panel-title">Analysis complete!</p>
                    <p className="up-panel-sub">Your Instagram data has been processed</p>
                  </div>
                </div>

                <div className="stat-tiles">
                  <div className="pill-stat tile-success">
                    <span className="pill-stat-value" style={{ color: 'var(--success)' }}>
                      {upload.snapshot.followers_count.toLocaleString()}
                    </span>
                    <span className="pill-stat-label">Followers</span>
                  </div>
                  <div className="pill-stat tile-accent">
                    <span className="pill-stat-value grad-text">
                      {(latestSnapshot ? getFollowingList(latestSnapshot, statuses).length : upload.snapshot.following_count).toLocaleString()}
                    </span>
                    <span className="pill-stat-label">Following</span>
                  </div>
                </div>

                {scanNote && <p className="up-note">{scanNote}</p>}

                {scan && scan.status === 'done' && (
                  <div className="scan-chips">
                    {[
                      { label: 'Active',           val: scan.active_public       ?? 0, color: 'var(--success)', bg: 'var(--success-dim)' },
                      { label: 'Private/inactive', val: scan.private_or_inactive ?? 0, color: 'var(--warning)', bg: 'var(--warning-dim)' },
                      { label: 'Deleted',          val: scan.deleted             ?? 0, color: 'var(--text-2)',  bg: 'var(--surface2)'    },
                    ].map(({ label, val, color, bg }) => (
                      <span key={label} className="scan-chip" style={{ color, background: bg }}>
                        <b>{val}</b> {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button className="btn btn-primary btn-full" onClick={() => navigate('/dashboard')}>
                View Dashboard <ArrowRight size={16} />
              </button>
            </div>
          )}

          {phase === 'error' && (
            <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div className="result-card result-error">
                <div className="result-head">
                  <div className="result-icon" style={{ background: 'var(--danger-dim)' }}>
                    <AlertCircle size={22} color="var(--danger)" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className="up-panel-title" style={{ color: 'var(--danger)' }}>Upload failed</p>
                    <p className="up-panel-sub" style={{ lineHeight: 1.5 }}>{message}</p>
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-full" onClick={reset}>Try Again</button>
            </div>
          )}

          </div>

          <aside className={`up-aside${phase === 'idle' ? '' : ' up-aside-idle-only'}`}>
          {(
            <div className="fade-up" style={{ animationDelay: '120ms' }}>
              <div className="up-panel">
                <p className="up-eyebrow">How to export from Instagram</p>

                <ol className="steps">
                  {STEPS.map(({ icon: Icon, text }, i) => (
                    <li key={i} className="step-row">
                      <div className="step-num">{i + 1}</div>
                      <div className="step-body">
                        <Icon size={15} color="var(--accent-2)" strokeWidth={2} />
                        <span>{text}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {phase === 'idle' && snapshots.length > 0 && (
            <button className="btn btn-ghost btn-full" style={{ marginTop: 14, color: 'var(--danger)' }} onClick={() => setConfirmClear(true)}>
              <Trash2 size={15} /> Clear history ({snapshots.length} upload{snapshots.length === 1 ? '' : 's'})
            </button>
          )}
          </aside>
          </div>

        </div>
      </div>

      <BottomSheet open={confirmClear} onClose={() => !clearing && setConfirmClear(false)} title="Delete all history?" color="var(--danger)" compact>
        <div className="confirm-sheet">
          <p>
            This permanently deletes all {snapshots.length} upload{snapshots.length === 1 ? '' : 's'} and scan results from your account.
            This cannot be undone.
          </p>
          <div className="confirm-actions">
            <button className="btn btn-ghost" disabled={clearing} onClick={() => setConfirmClear(false)}>Cancel</button>
            <button className="btn btn-danger" disabled={clearing} onClick={handleClearHistory}>
              <Trash2 size={15} /> {clearing ? 'Deleting…' : 'Delete all'}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}

function Spinner({ size = 36 }) {
  return (
    <svg
      viewBox="0 0 48 48"
      style={{ animation: 'spin 0.9s linear infinite', width: size, height: size, flexShrink: 0 }}
    >
      <circle cx="24" cy="24" r="20" fill="none" stroke="var(--surface3)" strokeWidth="4" />
      <circle
        cx="24" cy="24" r="20"
        fill="none" stroke="url(#spin-grad)" strokeWidth="4"
        strokeDasharray="45 90" strokeLinecap="round"
      />
      <defs>
        <linearGradient id="spin-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
    </svg>
  )
}
