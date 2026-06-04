import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import UploadPage    from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', paddingTop: 'var(--sat)' }}>
        <Routes>
          <Route path="/"          element={<Navigate to="/upload" replace />} />
          <Route path="/upload"    element={<UploadPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="*"          element={<Navigate to="/upload" replace />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
