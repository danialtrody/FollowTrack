// Matches the backend's _not_deleted filter:
// only null (not yet checked) or active_public pass through.
// Excludes deleted and private_or_inactive.
function isVisible(status) {
  return status == null || status === 'active_public'
}

// ── Named lists ────────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function toItem(u, statuses) {
  return { username: u.username, followed_at: u.timestamp, status: statuses[u.username] ?? null }
}

function byUsername(a, b) {
  return a.username.localeCompare(b.username)
}
