import { NavLink } from 'react-router-dom'
import { Upload, LayoutDashboard } from 'lucide-react'

const tabs = [
  { to: '/upload',    icon: Upload,          label: 'Upload'    },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          {({ isActive }) => (
            <>
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.8}
                style={{ transition: 'transform 0.15s ease', transform: isActive ? 'scale(1.1)' : 'scale(1)' }}
              />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
