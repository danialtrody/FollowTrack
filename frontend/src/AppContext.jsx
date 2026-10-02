import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { fetchSnapshots, postSnapshot, fetchStatuses, putStatuses, deleteHistory,
         fetchDismissed, putDismissed, removeDismissed } from './api/client'
import { loadState, clearState } from './lib/storage'
import Splash from './components/Splash'

const AppContext = createContext(null)

const byExportDate = (a, b) =>
  (a.exported_at ?? a.uploaded_at).localeCompare(b.exported_at ?? b.uploaded_at)

function toPayload(snap) {
  const { id, file_hash, uploaded_at, ...data } = snap
  return { ...data, exported_at: data.exported_at ?? uploaded_at }
}

export function AppProvider({ children }) {
  const [snapshots, setSnapshots] = useState([])
  const [statuses, setStatuses] = useState({})
  const [dismissed, setDismissed] = useState(() => new Set())
  const [ready, setReady] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [localData, setLocalData] = useState(null)

  useEffect(() => {
    Promise.all([fetchSnapshots(), fetchStatuses(), fetchDismissed().catch(() => ({ data: [] })), loadState()])
      .then(([snaps, stats, dis, local]) => {
        setSnapshots([...snaps.data].sort(byExportDate))
        setStatuses(stats.data)
        setDismissed(new Set(dis.data))
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
    }
    const { data: saved } = await postSnapshot(parsed.file_hash, data)

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

  const dismiss = useCallback((keys) => {
    setDismissed(prev => new Set([...prev, ...keys]))
    putDismissed(keys).catch(() => setSyncError('Could not save that to the server. It may reappear on refresh.'))
  }, [])

  const restore = useCallback((keys) => {
    setDismissed(prev => { const next = new Set(prev); keys.forEach(k => next.delete(k)); return next })
    removeDismissed(keys).catch(() => setSyncError('Could not save that to the server. It may be hidden again on refresh.'))
  }, [])

  const clearHistory = useCallback(async () => {
    await deleteHistory()
    setSnapshots([])
    setStatuses({})
    setDismissed(new Set())
  }, [])

  const importLocal = useCallback(async () => {
    if (!localData) return
    let failed = false
    for (const snap of localData.snapshots) {
      try { await postSnapshot(snap.file_hash, toPayload(snap)) }
      catch (err) { if (err.response?.status !== 409) failed = true }
    }
    if (Object.keys(localData.statuses || {}).length) {
      try { await putStatuses(localData.statuses) } catch { failed = true }
    }
    const [snaps, stats] = await Promise.all([fetchSnapshots(), fetchStatuses()])
    setSnapshots([...snaps.data].sort(byExportDate))
    setStatuses(stats.data)
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
      dismissed,
      dismiss,
      restore,
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
      {ready ? children : <Splash />}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
