function isVisible(status) {
  return status == null || status === 'active_public'
}


export function getNotFollowingBack(snap, userStatuses) {
  const followerSet = new Set(snap.followers.map(u => u.username))
  return snap.following
    .filter(u => isVisible(userStatuses[u.username]) && !followerSet.has(u.username))
    .map(u => toItem(u, userStatuses))
    .sort(byUsername)
}

export function getPendingSent(snap) {
  return (snap.pending_sent || [])
    .map(u => ({ username: u.username, event_ts: u.timestamp }))
    .sort(byUsername)
}

export function getFollowersList(snap) {
  return snap.followers
    .map(u => ({ username: u.username, followed_at: u.timestamp }))
    .sort(byUsername)
}

export function getFollowingList(snap, userStatuses) {
  return snap.following
    .filter(u => isVisible(userStatuses[u.username]))
    .map(u => toItem(u, userStatuses))
    .sort(byUsername)
}


export function getLostFollowers(snapshots, userStatuses) {
  const latest = snapshots[snapshots.length - 1]
  const blocked = new Set((latest?.blocked || []).map(u => u.username))
  const renamed = renamedFollowers(snapshots).oldNames
  return lostBetween(snapshots, 'followers', u => !blocked.has(u) && !renamed.has(u) && isVisible(userStatuses[u]))
    .map(i => ({ ...i, tag: userStatuses[i.username] === 'active_public'
      ? tag('Active, removed you', 'var(--danger)') : tag('Removed you', 'var(--danger)') }))
}

function renamedFollowers(snapshots) {
  const oldNames = new Set(), newNames = new Set()
  if (snapshots.length < 2) return { oldNames, newNames }
  const latest = snapshots[snapshots.length - 1]
  const earlier = snapshots.slice(0, -1)
  const everSeen = new Set(earlier.flatMap(s => s.followers.map(u => u.username)))
  const current = new Set(latest.followers.map(u => u.username))
  const newByTs = new Map(latest.followers
    .filter(u => u.timestamp && !everSeen.has(u.username))
    .map(u => [u.timestamp, u.username]))
  for (const s of earlier) {
    for (const u of s.followers) {
      if (!current.has(u.username) && u.timestamp && newByTs.has(u.timestamp)) {
        oldNames.add(u.username)
        newNames.add(newByTs.get(u.timestamp))
      }
    }
  }
  return { oldNames, newNames }
}

export function getBlocked(snap) {
  return (snap.blocked || [])
    .map(u => ({ username: u.username, sub: formatDate(u.timestamp) }))
    .sort(byUsername)
}

export function getNewFollowers(snapshots) {
  if (snapshots.length < 2) return []
  const latest = snapshots[snapshots.length - 1]
  const previous = new Set(snapshots[snapshots.length - 2].followers.map(u => u.username))
  const { newNames } = renamedFollowers(snapshots)
  return latest.followers
    .filter(u => !previous.has(u.username) && !newNames.has(u.username))
    .map(u => ({ username: u.username, sub: formatDate(u.timestamp), ts: u.timestamp || '' }))
    .sort((a, b) => b.ts.localeCompare(a.ts) || byUsername(a, b))
}

export function getMutuals(snap) {
  const followerSet = new Set(snap.followers.map(u => u.username))
  return snap.following
    .filter(u => followerSet.has(u.username))
    .map(u => ({ username: u.username, sub: formatDate(u.timestamp) }))
    .sort(byUsername)
}

export function getFans(snap) {
  const followingSet = new Set(snap.following.map(u => u.username))
  return snap.followers
    .filter(u => !followingSet.has(u.username))
    .map(u => ({ username: u.username, sub: formatDate(u.timestamp) }))
    .sort(byUsername)
}

export function getNetChange(snapshots, userStatuses) {
  if (snapshots.length < 2) return null
  const latest = snapshots[snapshots.length - 1]
  const gained = getNewFollowers(snapshots).length
  const lost = getLostFollowers(snapshots, userStatuses).filter(i => i.gone === snapDate(latest)).length
  return { gained, lost, net: gained - lost, since: snapDate(snapshots[snapshots.length - 2]) }
}

export function getTimeline(snapshots, userStatuses) {
  const out = []
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1], cur = snapshots[i]
    const { oldNames, newNames } = renamedFollowers(snapshots.slice(0, i + 1))
    const had = new Set(prev.followers.map(u => u.username))
    const has = new Set(cur.followers.map(u => u.username))
    const blockedNow = new Set((cur.blocked || []).map(u => u.username))
    const blockedBefore = new Set((prev.blocked || []).map(u => u.username))

    const events = [
      ...cur.followers.filter(u => !had.has(u.username) && !newNames.has(u.username))
        .map(u => ({ type: 'joined', username: u.username })),
      ...prev.followers.filter(u => !has.has(u.username) && !oldNames.has(u.username)
          && !blockedNow.has(u.username) && isVisible(userStatuses[u.username]))
        .map(u => ({ type: 'left', username: u.username })),
      ...[...blockedNow].filter(u => !blockedBefore.has(u))
        .map(username => ({ type: 'blocked', username })),
    ].sort(byUsername)
    if (events.length) out.push({ date: snapDate(cur), from: snapDate(prev), events })
  }
  return out.reverse()
}

export function formatDate(dt) {
  if (!dt) return null
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}


const snapDate = s => s.exported_at ?? s.uploaded_at

function tag(label, color) {
  return { label, color }
}

function lostBetween(snapshots, key, keep) {
  if (snapshots.length < 2) return []
  const current = new Set(snapshots[snapshots.length - 1][key].map(u => u.username))

  const lastSeen = new Map()
  snapshots.slice(0, -1).forEach((s, i) => {
    for (const u of s[key]) if (!current.has(u.username)) lastSeen.set(u.username, i)
  })

  return [...lastSeen].filter(([username]) => keep(username)).map(([username, i]) => ({
    username,
    gone: snapDate(snapshots[i + 1]),
    sub: `Seen ${formatDate(snapDate(snapshots[i]))} · gone by ${formatDate(snapDate(snapshots[i + 1]))}`,
  })).sort((a, b) => b.gone.localeCompare(a.gone) || byUsername(a, b))
}

function toItem(u, statuses) {
  return { username: u.username, followed_at: u.timestamp, status: statuses[u.username] ?? null }
}

function byUsername(a, b) {
  return a.username.localeCompare(b.username)
}
