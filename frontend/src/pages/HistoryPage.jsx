import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { listSnapshots, deleteSnapshot } from '../lib/db'

export default function HistoryPage() {
  const [snapshots, setSnapshots] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [deleting,  setDeleting]  = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    listSnapshots().then(setSnapshots).finally(() => setLoading(false))
  }, [])

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!window.confirm('Delete this snapshot? This cannot be undone.')) return
    setDeleting(id)
    await deleteSnapshot(id)
    setSnapshots(s => s.filter(x => x.id !== id))
    setDeleting(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Snapshot History" />

      <div
        className="scroll-area"
        style={{ flex: 1, paddingBottom: 'calc(var(--nav-height) + var(--sab) + 16px)', overflowY: 'auto' }}
      >
        {loading && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius)' }} />)}
          </div>
        )}

        {!loading && snapshots.length === 0 && (
          <EmptyState icon="🕐" title="No snapshots yet" sub="Upload your Instagram export to create the first snapshot." />
        )}

        {!loading && snapshots.map((s, i) => (
          <SnapshotRow
            key={s.id}
            snapshot={s}
            index={snapshots.length - i}
            onDelete={handleDelete}
            deleting={deleting === s.id}
            onClick={() => navigate('/dashboard')}
          />
        ))}
      </div>
    </div>
  )
}

function SnapshotRow({ snapshot, index, onDelete, deleting, onClick }) {
  const date  = new Date(snapshot.uploaded_at)
  const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const time  = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center',
        padding: '14px 20px', gap: 14,
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer', transition: 'background 0.1s',
      }}
      onPointerDown={e => e.currentTarget.style.background = 'var(--surface2)'}
      onPointerUp={e   => e.currentTarget.style.background = 'none'}
      onPointerLeave={e => e.currentTarget.style.background = 'none'}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: 'var(--accent-dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
      }}>
        #{index}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 12 }}>
          <span>{time}</span>
          <span style={{ color: 'var(--success)' }}>↑ {snapshot.followers_count} followers</span>
          <span style={{ color: 'var(--accent)'  }}>→ {snapshot.following_count} following</span>
        </div>
        {snapshot.note && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{snapshot.note}</div>
        )}
      </div>

      <button
        onClick={e => onDelete(snapshot.id, e)}
        disabled={deleting}
        style={{
          background: 'var(--danger-dim)', border: 'none', borderRadius: 10,
          width: 34, height: 34,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--danger)', cursor: 'pointer', flexShrink: 0,
          opacity: deleting ? 0.5 : 1,
        }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
