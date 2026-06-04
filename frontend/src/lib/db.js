import { openDB } from 'idb'

const DB_NAME = 'followtrack'
const DB_VERSION = 1

let _db = null

async function getDB() {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('snapshots')) {
        const ss = db.createObjectStore('snapshots', { keyPath: 'id', autoIncrement: true })
        ss.createIndex('file_hash',   'file_hash',   { unique: true })
        ss.createIndex('uploaded_at', 'uploaded_at')
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'username' })
      }
      if (!db.objectStoreNames.contains('events')) {
        const es = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true })
        es.createIndex('username',    'username')
        es.createIndex('snapshot_id', 'snapshot_id')
      }
    },
  })
  return _db
}

// ── Snapshots ──────────────────────────────────────────────────────────────────

export async function saveSnapshot(parsed) {
  const db = await getDB()

  // Reject duplicates
  const dup = await db.getFromIndex('snapshots', 'file_hash', parsed.file_hash)
  if (dup) throw new Error('DUPLICATE')

  const now = new Date().toISOString()

  // Upsert every username we've seen into the users store
  const allUsernames = new Set([
    ...parsed.followers.map(u => u.username),
    ...parsed.following.map(u => u.username),
  ])
  const usersTx = db.transaction('users', 'readwrite')
  for (const username of allUsernames) {
    const existing = await usersTx.store.get(username)
    const isDeleted = username.startsWith('__deleted__')
    if (existing) {
      await usersTx.store.put({
        ...existing,
        last_seen: now,
        // once deleted, keep it deleted
        status: existing.status === 'deleted' || isDeleted ? 'deleted' : existing.status,
      })
    } else {
      await usersTx.store.put({
        username,
        first_seen: now,
        last_seen:  now,
        status:     isDeleted ? 'deleted' : null,
      })
    }
  }
  await usersTx.done

  const snap = {
    uploaded_at:          now,
    followers_count:      parsed.followers.length,
    following_count:      parsed.following.length,
    file_hash:            parsed.file_hash,
    followers:            parsed.followers,
    following:            parsed.following,
    blocked:              parsed.blocked,
    pending_sent:         parsed.pending_sent,
    recently_unfollowed:  parsed.recently_unfollowed,
    received_requests:    parsed.received_requests,
  }
  const id = await db.add('snapshots', snap)
  return { ...snap, id }
}

export async function listSnapshots() {
  const db = await getDB()
  const all = await db.getAll('snapshots')
  return all
    .map(s => ({
      id:              s.id,
      uploaded_at:     s.uploaded_at,
      followers_count: s.followers_count,
      following_count: s.following_count,
      note:            s.note ?? null,
    }))
    .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
}

export async function getSnapshot(id) {
  const db = await getDB()
  return db.get('snapshots', id)
}

export async function deleteSnapshot(id) {
  const db = await getDB()
  // Delete associated events first
  const evs = await db.getAllFromIndex('events', 'snapshot_id', id)
  if (evs.length) {
    const tx = db.transaction('events', 'readwrite')
    for (const ev of evs) await tx.store.delete(ev.id)
    await tx.done
  }
  await db.delete('snapshots', id)
}

export async function getLatestSnapshot() {
  const db = await getDB()
  const all = await db.getAll('snapshots')
  if (!all.length) return null
  return all.reduce((a, b) => new Date(a.uploaded_at) > new Date(b.uploaded_at) ? a : b)
}

export async function getPreviousSnapshot(latestId) {
  const db = await getDB()
  const all = await db.getAll('snapshots')
  const others = all.filter(s => s.id !== latestId)
  if (!others.length) return null
  return others.reduce((a, b) => new Date(a.uploaded_at) > new Date(b.uploaded_at) ? a : b)
}

// ── Events ─────────────────────────────────────────────────────────────────────

export async function saveEvents(events) {
  if (!events.length) return
  const db = await getDB()
  const tx = db.transaction('events', 'readwrite')
  for (const ev of events) await tx.store.add(ev)
  await tx.done
}

export async function getEventsForUser(username) {
  const db = await getDB()
  const evs = await db.getAllFromIndex('events', 'username', username)
  return evs.sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at))
}

// ── Users ──────────────────────────────────────────────────────────────────────

export async function getUserInfo(username) {
  const db = await getDB()
  return db.get('users', username)
}

export async function searchUsers(query) {
  const db = await getDB()
  const q = query.toLowerCase()
  const all = await db.getAll('users')
  return all
    .filter(u => u.username.includes(q))
    .sort((a, b) => a.username.localeCompare(b.username))
    .slice(0, 50)
}

export async function getUserStatuses() {
  const db = await getDB()
  const all = await db.getAll('users')
  return Object.fromEntries(all.map(u => [u.username, u.status]))
}

export async function updateUsersStatus(statusMap) {
  // statusMap: { username: status }
  const entries = Object.entries(statusMap)
  if (!entries.length) return
  const db = await getDB()
  const tx = db.transaction('users', 'readwrite')
  for (const [username, status] of entries) {
    const user = await tx.store.get(username)
    if (user) await tx.store.put({ ...user, status })
  }
  await tx.done
}

// ── Reset ──────────────────────────────────────────────────────────────────────

export async function clearAll() {
  const db = await getDB()
  const tx = db.transaction(['snapshots', 'users', 'events'], 'readwrite')
  await tx.objectStore('snapshots').clear()
  await tx.objectStore('users').clear()
  await tx.objectStore('events').clear()
  await tx.done
}
