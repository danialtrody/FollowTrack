import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [snapshots, setSnapshots] = useState([])
  const [statuses, setStatuses] = useState({})

  const addSnapshot = useCallback((parsed) => {
    const snap = {
      uploaded_at:         new Date().toISOString(),
      followers_count:     parsed.followers.length,
      following_count:     parsed.following.length,
      file_hash:           parsed.file_hash,
      followers:           parsed.followers,
      following:           parsed.following,
      blocked:             parsed.blocked,
      pending_sent:        parsed.pending_sent,
      recently_unfollowed: parsed.recently_unfollowed,
      received_requests:   parsed.received_requests,
    }

    // Mark __deleted__ usernames as 'deleted' status immediately
    const deletedStatuses = {}
    for (const u of [...parsed.followers, ...parsed.following]) {
      if (u.username.startsWith('__deleted__')) deletedStatuses[u.username] = 'deleted'
    }
    if (Object.keys(deletedStatuses).length) {
      setStatuses(prev => ({ ...prev, ...deletedStatuses }))
    }

    setSnapshots(prev => [...prev, snap])
    return snap
  }, [])

  const updateStatuses = useCallback((statusMap) => {
    if (!statusMap || !Object.keys(statusMap).length) return
    setStatuses(prev => ({ ...prev, ...statusMap }))
  }, [])

  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null

  return (
    <AppContext.Provider value={{
      snapshots,
      statuses,
      latestSnapshot,
      addSnapshot,
      updateStatuses,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
