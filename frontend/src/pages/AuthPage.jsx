import { useState } from 'react'
import { Users } from 'lucide-react'
import { useAuth } from '../AuthContext'

function errorText(err) {
  const d = err.response?.data?.detail
  if (typeof d === 'string') return d
  if (err.response?.status === 422) return 'Enter a valid email and a password of at least 8 characters.'
  return 'Could not reach the server. Try again.'
}

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [busy, setBusy]         = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await (mode === 'login' ? login : register)(email, password)
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-sm)',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: 15,
  }

  return (
    <div className="page-root" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 380, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div className="sidebar-logo-icon"><Users size={18} color="#fff" strokeWidth={2.5} /></div>
          <span className="sidebar-logo-text">FollowTrack</span>
        </div>

        <h1 style={{ fontSize: 24 }}>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>

        <input
          style={inputStyle} type="email" placeholder="Email" autoComplete="email"
          value={email} onChange={e => setEmail(e.target.value)} required
        />
        <input
          style={inputStyle} type="password" placeholder="Password (min 8 characters)"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password} onChange={e => setPassword(e.target.value)} minLength={8} required
        />

        {error && <p style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</p>}

        <button className="btn btn-primary btn-full" disabled={busy}>
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button
          type="button" className="btn btn-ghost btn-full"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
        >
          {mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
