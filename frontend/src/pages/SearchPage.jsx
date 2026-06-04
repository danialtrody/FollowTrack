import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import UserRow    from '../components/UserRow'
import EmptyState from '../components/EmptyState'
import { searchUsers } from '../lib/db'

export default function SearchPage() {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const timerRef = useRef()
  const navigate = useNavigate()

  const search = useCallback((q) => {
    clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); setSearched(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchUsers(q.trim())
        setResults(data)
        setSearched(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
  }, [])

  function handleChange(e) {
    const q = e.target.value
    setQuery(q)
    search(q)
  }

  function clear() {
    setQuery(''); setResults([]); setSearched(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Search Users" />

      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '0 14px',
        }}>
          {loading
            ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            : <Search size={18} color="var(--text-3)" style={{ flexShrink: 0 }} />
          }
          <input
            autoFocus
            value={query}
            onChange={handleChange}
            placeholder="Search by username…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 16, padding: '14px 0', fontFamily: 'inherit',
            }}
          />
          {query && (
            <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
              <X size={16} />
            </button>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      <div
        className="scroll-area"
        style={{ flex: 1, paddingBottom: 'calc(var(--nav-height) + var(--sab))', overflowY: 'auto', marginTop: 12 }}
      >
        {!query && !searched && (
          <EmptyState icon="🔍" title="Find any user" sub="Search by Instagram username to see their full follow history." />
        )}
        {searched && results.length === 0 && (
          <EmptyState icon="😶" title="No users found" sub={`No results for "${query}"`} />
        )}
        {results.map(user => (
          <UserRow
            key={user.username}
            username={user.username}
            sub={`First seen: ${new Date(user.first_seen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            onClick={() => navigate(`/history/${user.username}`)}
          />
        ))}
      </div>
    </div>
  )
}
