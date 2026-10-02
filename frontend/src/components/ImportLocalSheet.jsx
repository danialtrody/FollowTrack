import { useState } from 'react'
import BottomSheet from './BottomSheet'
import { useApp } from '../AppContext'

// Offered once when data from before accounts existed is still on this device
export default function ImportLocalSheet() {
  const { localData, importLocal, dismissLocal } = useApp()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!localData) return null
  const n = localData.snapshots.length

  async function handleImport() {
    setBusy(true)
    setError('')
    try { await importLocal() }
    catch { setError('Some data could not be imported. Your data on this device was kept — try again.') }
    finally { setBusy(false) }
  }

  return (
    <BottomSheet open onClose={dismissLocal} title="Import data from this device?">
      <div style={{ padding: '4px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
          We found {n} saved upload{n === 1 ? '' : 's'} on this device from before accounts existed.
          Import {n === 1 ? 'it' : 'them'} to your account so you keep your history. This copy on the device is removed afterwards.
        </p>
        {error && <p style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</p>}
        <button className="btn btn-primary btn-full" disabled={busy} onClick={handleImport}>
          {busy ? 'Importing…' : 'Import to my account'}
        </button>
        <button className="btn btn-ghost btn-full" disabled={busy} onClick={dismissLocal}>
          Discard
        </button>
      </div>
    </BottomSheet>
  )
}
