import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { fetchSnapshots, postSnapshot, fetchStatuses, putStatuses, deleteHistory } from './api/client'
import { loadState, clearState } from './lib/storage'

const AppContext = createContext(null)

// Order by when Instagram exported the data, not when it was uploaded, so an older
// export uploaded later never becomes the "latest" snapshot
const byExportDate = (a, b) =>
  (a.exported_at ?? a.uploaded_at).localeCompare(b.exported_at ?? b.uploaded_at)

// Stored on the server as `data`; id / file_hash / uploaded_at live in their own columns
function toPayload(snap) {
  const { id, file_hash, uploaded_at, ...data } = snap
  // Keep the original date so an imported old snapshot isn't ordered as the newest one
  return { ...data, exported_at: data.exported_at ?? uploaded_at }
}

export function AppProvider({ children }) {
  const [snapshots, setSnapshots] = useState([])
  const [statuses, setStatuses] = useState({})
  const [ready, setReady] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [localData, setLocalData] = useState(null) // pre-account data still in this browser's IndexedDB

  // Load the account's data, and check for older on-device data to offer importing
  useEffect(() => {
    Promise.all([fetchSnapshots(), fetchStatuses(), loadState()])
      .then(([snaps, stats, local]) => {
        setSnapshots([...snaps.data].sort(byExportDate))
        setStatuses(stats.data)
        if (local?.snapshots?.length) setLocalData(local)
      })
      .catch(() => setSyncError('Could not load your data from the server. What you see may be incomplete — check your connection and refresh.'))
      .finally(() => setReady(true))
  }, [])

  const persistStatuses = useCallback((statusMap) => {
    putStatuses(statusMap).catch(() => setSyncError('Could not save your scan results to the server. They may be lost on refresh.'))
  }, [])

  const addSnapshot = useCallback(async (parsed) => {
    const data = {
      exported_at:         parsed.exported_at,
      followers_count:     parsed.followers.length,
      following_count:     parsed.following.length,
      followers:           parsed.followers,
      following:           parsed.following,
      blocked:             parsed.blocked,
      pending_sent:        parsed.pending_sent,
      recently_unfollowed: parsed.recently_unfollowed,
      received_requests:   parsed.received_requests,
    }
    // Throws on failure (e.g. 409 for a file that was already uploaded)
    const { data: saved } = await postSnapshot(parsed.file_hash, data)

    // Mark __deleted__ usernames as 'deleted' status immediately
    const deletedStatuses = {}
    for (const u of [...parsed.followers, ...parsed.following]) {
      if (u.username.startsWith('__deleted__')) deletedStatuses[u.username] = 'deleted'
    }
    if (Object.keys(deletedStatuses).length) {
      setStatuses(prev => ({ ...prev, ...deletedStatuses }))
      persistStatuses(deletedStatuses)
    }

    setSnapshots(prev => [...prev, saved].sort(byExportDate))
    return saved
  }, [persistStatuses])

  const updateStatuses = useCallback((statusMap) => {
    if (!statusMap || !Object.keys(statusMap).length) return
    setStatuses(prev => ({ ...prev, ...statusMap }))
    persistStatuses(statusMap)
  }, [persistStatuses])

  const clearHistory = useCallback(async () => {
    await deleteHistory()
    setSnapshots([])
    setStatuses({})
  }, [])

  const importLocal = useCallback(async () => {
    if (!localData) return
    let failed = false
    for (const snap of localData.snapshots) {
      try { await postSnapshot(snap.file_hash, toPayload(snap)) }
      catch (err) { if (err.response?.status !== 409) failed = true } // 409 = already in the account
    }
    if (Object.keys(localData.statuses || {}).length) {
      try { await putStatuses(localData.statuses) } catch { failed = true }
    }
    const [snaps, stats] = await Promise.all([fetchSnapshots(), fetchStatuses()])
    setSnapshots([...snaps.data].sort(byExportDate))
    setStatuses(stats.data)
    // Keep the device copy unless everything was saved
    if (failed) throw new Error('import failed')
    await clearState()
    setLocalData(null)
  }, [localData])

  const dismissLocal = useCallback(async () => {
    await clearState()
    setLocalData(null)
  }, [])

  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null

  return (
    <AppContext.Provider value={{
      snapshots,
      statuses,
      latestSnapshot,
      addSnapshot,
      updateStatuses,
      syncError,
      clearSyncError: () => setSyncError(''),
      clearHistory,
      localData,
      importLocal,
      dismissLocal,
    }}>
      {ready ? children : null}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
