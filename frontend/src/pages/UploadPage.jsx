import { useState, useRef, useEffect } from 'react'
import { useNavigate }                   from 'react-router-dom'
import { Upload, CheckCircle, AlertCircle, ArrowRight, Smartphone, Download, FileArchive, Send } from 'lucide-react'
import { parseZip }                      from '../lib/parseZip'
import { getFollowingList }              from '../lib/analysis'
import { startCheck, getCheckStatus }    from '../api/client'
import { useApp }                        from '../AppContext'
import PageHeader                        from '../components/PageHeader'

const STEPS = [
  { icon: Smartphone,    text: 'Open Instagram → Profile → ☰ Menu' },
  { icon: Download,      text: 'Settings → Your activity → Download your information' },
  { icon: FileArchive,   text: 'Select "Followers and following" — choose JSON format' },
  { icon: Send,          text: 'Request download — get ZIP from email · upload here' },
]

export default function UploadPage() {
  const { latestSnapshot, statuses, addSnapshot, updateStatuses } = useApp()
  const [phase,   setPhase]   = useState('idle')
  const [message, setMessage] = useState('')
  const [upload,  setUpload]  = useState(null)
  const [scan,    setScan]    = useState(null)
  const inputRef = useRef()
  const pollRef  = useRef()
  const navigate = useNavigate()

  async function pollScan(jobId) {
    if (!jobId) { clearInterval(pollRef.current); setPhase('success'); return }
    try {
      const { data } = await getCheckStatus(jobId)
      setScan({ ...data })
      if (['done', 'error', 'cancelled'].includes(data.status)) {
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
      const snapshot = addSnapshot(parsed)

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
        } catch { /* backend unavailable — not fatal */ }
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
    } catch {
      setPhase('error')
      setMessage('Upload failed. Make sure this is a valid Instagram export ZIP.')
    }
  }

  const pct = scan ? Math.round((scan.checked / Math.max(scan.total, 1)) * 100) : 0

  return (
    <div className="page-root">
      <PageHeader showLogo />

      <div className="page-scroll scroll-area">
        <div className="page-inner">

          {/* ── Hero ── */}
          <div className="fade-up" style={{ marginBottom: 28, paddingTop: 8 }}>
            <h1 style={{ marginBottom: 10 }}>
              Analyze Your<br />
              <span style={{ background: 'var(--grad-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Instagram Followers
              </span>
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.65, maxWidth: 400 }}>
              Export your data from Instagram and drop the ZIP here — we'll analyze who doesn't follow back, pending requests, and ghost accounts.
            </p>
          </div>

          {/* ── Drop zone ── */}
          {(phase === 'idle' || phase === 'dragging') && (
            <div className="fade-up stagger" style={{ animationDelay: '60ms', marginBottom: 20 }}>
              <div
                className={`drop-zone${phase === 'dragging' ? ' dragging' : ''}`}
                onDragOver={e => { e.preventDefault(); setPhase('dragging') }}
                onDragLeave={() => setPhase('idle')}
                onDrop={e => { e.preventDefault(); setPhase('idle'); handleFile(e.dataTransfer.files[0]) }}
                onClick={() => inputRef.current?.click()}
              >
                <div className="drop-zone-icon">
                  <Upload size={34} color="#fff" strokeWidth={2} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 19, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.3px' }}>
                    Drop your ZIP here
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
                    or tap to browse your files
                  </p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                  padding: '5px 12px', borderRadius: 999,
                  background: 'var(--accent-dim)',
                  color: 'var(--accent-2)',
                  border: '1px solid rgba(139,92,246,0.25)',
                  textTransform: 'uppercase',
                }}>
                  .zip file
                </span>
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

          {/* ── Uploading / parsing ── */}
          {phase === 'uploading' && (
            <div className="fade-up" style={{ marginBottom: 20 }}>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '36px 28px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
                backdropFilter: 'blur(24px)',
              }}>
                <Spinner />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Reading your data…</p>
                  <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Parsing ZIP and building follower map</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Scanning ── */}
          {phase === 'scanning' && (
            <div className="fade-up" style={{ marginBottom: 20 }}>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '22px',
                display: 'flex', flexDirection: 'column', gap: 16,
                backdropFilter: 'blur(24px)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Spinner size={24} />
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700 }}>Classifying accounts…</p>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                      {scan ? `${scan.checked} / ${scan.total} checked` : 'Starting scan…'}
                    </p>
                  </div>
                  <span style={{
                    marginLeft: 'auto', fontSize: 20, fontWeight: 900,
                    color: 'var(--accent-2)', letterSpacing: '-0.5px',
                  }}>
                    {pct}%
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {phase === 'success' && upload && (
            <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div className="result-card" style={{
                background: 'linear-gradient(135deg, rgba(52,211,153,0.08) 0%, rgba(5,150,105,0.05) 100%)',
                border: '1px solid rgba(52,211,153,0.25)',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 11,
                    background: 'var(--success-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CheckCircle size={20} color="var(--success)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 800 }}>Analysis complete!</p>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1 }}>
                      Your Instagram data has been processed
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <div className="pill-stat" style={{ background: 'rgba(52,211,153,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(52,211,153,0.18)' }}>
                    <span className="pill-stat-value" style={{ color: 'var(--success)' }}>
                      {upload.snapshot.followers_count.toLocaleString()}
                    </span>
                    <span className="pill-stat-label">Followers</span>
                  </div>
                  <div className="pill-stat" style={{ background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <span className="pill-stat-value" style={{ background: 'var(--grad-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      {(latestSnapshot ? getFollowingList(latestSnapshot, statuses).length : upload.snapshot.following_count).toLocaleString()}
                    </span>
                    <span className="pill-stat-label">Following</span>
                  </div>
                </div>

                {/* Scan summary */}
                {scan && scan.status === 'done' && (
                  <div style={{
                    display: 'flex', gap: 8, flexWrap: 'wrap',
                    paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    {[
                      { label: 'Active',          val: scan.active_public       ?? 0, color: 'var(--success)', bg: 'var(--success-dim)' },
                      { label: 'Private/inactive', val: scan.private_or_inactive ?? 0, color: 'var(--warning)', bg: 'var(--warning-dim)' },
                      { label: 'Deleted',          val: scan.deleted             ?? 0, color: 'var(--text-3)',  bg: 'var(--surface2)'    },
                    ].map(({ label, val, color, bg }) => (
                      <span key={label} style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 9px',
                        borderRadius: 999, background: bg, color,
                        border: `1px solid ${color}`, opacity: 0.9,
                      }}>
                        {val} {label}
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

          {/* ── Error ── */}
          {phase === 'error' && (
            <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div className="result-card" style={{
                background: 'linear-gradient(135deg, rgba(248,113,113,0.08) 0%, rgba(185,28,28,0.05) 100%)',
                border: '1px solid rgba(248,113,113,0.28)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 11,
                    background: 'var(--danger-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AlertCircle size={20} color="var(--danger)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--danger)' }}>Upload failed</p>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.5 }}>{message}</p>
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-full" onClick={reset}>Try Again</button>
            </div>
          )}

          {/* ── How-to guide ── */}
          {phase === 'idle' && (
            <div className="fade-up" style={{ animationDelay: '120ms' }}>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '18px 20px',
                backdropFilter: 'blur(24px)',
              }}>
                <p style={{
                  fontSize: 10, fontWeight: 800, color: 'var(--text-3)',
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14,
                }}>
                  How to export from Instagram
                </p>

                {STEPS.map(({ icon: Icon, text }, i) => (
                  <div key={i} className="step-row">
                    <div className="step-num">{i + 1}</div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                      <Icon size={14} color="var(--accent-2)" style={{ marginTop: 2, flexShrink: 0 }} strokeWidth={2} />
                      <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
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
