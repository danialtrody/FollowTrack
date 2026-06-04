import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function PageHeader({ title, back, right }) {
  const navigate = useNavigate()
  return (
    <header style={{
      height: 'var(--header-height)',
      paddingTop: 'var(--sat)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `var(--sat) 16px 0`,
      flexShrink: 0,
      minHeight: 'calc(var(--header-height) + var(--sat))',
    }}>
      {back ? (
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'var(--surface2)',
            border: 'none',
            borderRadius: 10,
            width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={20} />
        </button>
      ) : <div style={{ width: 36 }} />}

      <h1 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.2px' }}>{title}</h1>

      <div style={{ width: 36, display: 'flex', justifyContent: 'flex-end' }}>{right || null}</div>
    </header>
  )
}
