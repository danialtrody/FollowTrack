import { Users } from 'lucide-react'

// Shown while the session / account data loads, instead of a blank screen.
export default function Splash() {
  return (
    <div className="splash" role="status" aria-label="Loading">
      <div className="sidebar-logo-icon splash-logo" style={{ width: 52, height: 52, borderRadius: 16 }}>
        <Users size={24} color="#fff" strokeWidth={2.5} />
      </div>
      <div className="splash-spinner" />
    </div>
  )
}
