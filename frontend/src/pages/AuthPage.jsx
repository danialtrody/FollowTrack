import { useState } from 'react'
import { Users, Mail, Lock, Eye, EyeOff, ArrowRight, UserMinus, History, ShieldCheck } from 'lucide-react'
import { useAuth } from '../AuthContext'

function errorText(err) {
  const d = err.response?.data?.detail
  if (typeof d === 'string') return d
  if (err.response?.status === 422) return 'Enter a valid email and a password of at least 8 characters.'
  return 'Could not reach the server. Try again.'
}

const FEATURES = [
  { icon: UserMinus,   title: 'See who unfollowed you', text: 'Compare followers and following in seconds.' },
  { icon: History,     title: 'Track changes over time', text: 'Upload new exports and watch your history grow.' },
  { icon: ShieldCheck, title: 'No Instagram login needed', text: 'Works from your own data export — nothing is shared.' },
]

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [busy, setBusy]         = useState(false)

  const isLogin = mode === 'login'

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await (isLogin ? login : register)(email, password)
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <div className="auth-root">
      <aside className="auth-brand">
        <div className="auth-logo">
          <div className="sidebar-logo-icon"><Users size={18} color="#fff" strokeWidth={2.5} /></div>
          <span className="sidebar-logo-text">FollowTrack</span>
        </div>
        <h2 className="auth-brand-title">Know your <span>audience</span>, clearly.</h2>
        <ul className="auth-features">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span className="auth-feature-icon"><Icon size={18} strokeWidth={2.2} /></span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <main className="auth-main">
        <form onSubmit={submit} className="card auth-card fade-up">
          <div className="auth-logo auth-logo-mobile">
            <div className="sidebar-logo-icon"><Users size={18} color="#fff" strokeWidth={2.5} /></div>
            <span className="sidebar-logo-text">FollowTrack</span>
          </div>

          <div>
            <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
            <p className="auth-sub">
              {isLogin ? 'Sign in to see your follower insights.' : 'Start tracking your followers in under a minute.'}
            </p>
          </div>

          <label className="auth-field">
            <Mail size={17} />
            <input
              type="email" placeholder="Email" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
          </label>

          <label className="auth-field">
            <Lock size={17} />
            <input
              type={showPw ? 'text' : 'password'} placeholder="Password (min 8 characters)"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password} onChange={e => setPassword(e.target.value)} minLength={8} required
            />
            <button
              type="button" className="auth-eye" tabIndex={-1}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              onClick={() => setShowPw(s => !s)}
            >
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="btn btn-primary btn-full" disabled={busy}>
            {busy ? <span className="auth-spinner" /> : <>{isLogin ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></>}
          </button>

          <p className="auth-switch">
            {isLogin ? 'New here?' : 'Already have an account?'}{' '}
            <button type="button" onClick={() => { setMode(isLogin ? 'register' : 'login'); setError('') }}>
              {isLogin ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </form>
      </main>
    </div>
  )
}
