// Local-only persistence (IndexedDB). Nothing here ever leaves the device.

const DB_NAME = 'followtrack'
const STORE   = 'kv'
const KEY     = 'state'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

async function run(mode, fn) {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror    = () => reject(tx.error)
      tx.onabort    = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function loadState() {
  try { return (await run('readonly', s => s.get(KEY))) ?? null }
  catch { return null }
}

export async function saveState(state) {
  try { await run('readwrite', s => s.put(state, KEY)) }
  catch { /* storage unavailable (private mode, quota) — app keeps working in memory */ }
}

export async function clearState() {
  try { await run('readwrite', s => s.delete(KEY)) }
  catch { /* ignore */ }
}
