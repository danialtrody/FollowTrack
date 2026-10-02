// Read-only access to data saved on this device before accounts existed (used for the one-time import).

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

export async function clearState() {
  try { await run('readwrite', s => s.delete(KEY)) }
  catch { /* ignore */ }
}
