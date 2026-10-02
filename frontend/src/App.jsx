import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { AppProvider, useApp } from './AppContext'
import { AuthProvider, useAuth } from './AuthContext'
import AuthPage      from './pages/AuthPage'
import ImportLocalSheet from './components/ImportLocalSheet'
import BottomNav     from './components/BottomNav'
import UploadPage    from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import { Upload, LayoutDashboard, Users, LogOut } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/upload',    icon: Upload,          label: 'Upload'    },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
]

function Sidebar() {
  const { user, logout } = useAuth()
  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Users size={18} color="#fff" strokeWidth={2.5} />
        </div>
        <span className="sidebar-logo-text">FollowTrack</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon size={18} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
        <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={logout}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  )
}

function SyncError() {
  const { syncError, clearSyncError } = useApp()
  if (!syncError) return null
  return (
    <div
      onClick={clearSyncError}
      style={{
        position: 'fixed', top: 12, left: 12, right: 12, zIndex: 1000, cursor: 'pointer',
        padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13, lineHeight: 1.5,
        background: 'var(--danger-dim)', color: 'var(--danger)', border: '1px solid var(--danger)',
      }}
    >
      {syncError} (tap to dismiss)
    </div>
  )
}

function Authenticated() {
  const { user } = useAuth()
  if (!user) return <AuthPage />
  return (
    <AppProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Routes>
            <Route path="/"          element={<Navigate to="/upload" replace />} />
            <Route path="/upload"    element={<UploadPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*"          element={<Navigate to="/upload" replace />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
      <SyncError />
      <ImportLocalSheet />
    </AppProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Authenticated />
      </AuthProvider>
    </BrowserRouter>
  )
}
