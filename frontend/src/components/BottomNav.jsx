import { NavLink } from 'react-router-dom'
import { Upload, LayoutDashboard } from 'lucide-react'

const tabs = [
  { to: '/upload',    icon: Upload,          label: 'Upload'    },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
]

export default function BottomNav() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 100,
      background: 'rgba(28, 28, 46, 0.92)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid var(--border)',
      paddingBottom: 'var(--sab)',
      display: 'flex',
    }}>
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '10px 0 8px',
            textDecoration: 'none',
            color: isActive ? 'var(--accent)' : 'var(--text-3)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.03em',
            transition: 'color 0.15s',
          })}
        >
          {({ isActive }) => (
            <>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8}
                style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.15s' }} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
