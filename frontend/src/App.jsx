import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { AppProvider } from './AppContext'
import BottomNav     from './components/BottomNav'
import UploadPage    from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import { Upload, LayoutDashboard, Users } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/upload',    icon: Upload,          label: 'Upload'    },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
]

function Sidebar() {
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
        Instagram follower analysis tool
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
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
      </AppProvider>
    </BrowserRouter>
  )
}
