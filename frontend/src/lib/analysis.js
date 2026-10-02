// Matches the backend's _not_deleted filter:
// only null (not yet checked) or active_public pass through.
// Excludes deleted and private_or_inactive.
function isVisible(status) {
  return status == null || status === 'active_public'
}

// ── Diff engine ────────────────────────────────────────────────────────────────

export function computeDiff(prevSnap, currSnap, userStatuses) {
  const prevFollowerSet = new Set(prevSnap.followers.map(u => u.username))
  const currFollowerSet = new Set(currSnap.followers.map(u => u.username))

  const currFollowingVisible = currSnap.following.filter(u => isVisible(userStatuses[u.username]))

  const new_followers = currSnap.followers
    .filter(u => !prevFollowerSet.has(u.username))
    .map(u => toItem(u, userStatuses))
    .sort(byUsername)

  const unfollowers = prevSnap.followers
    .filter(u => !currFollowerSet.has(u.username))
    .map(u => toItem(u, userStatuses))
    .sort(byUsername)

  const not_following_back = currFollowingVisible
    .filter(u => !currFollowerSet.has(u.username))
    .map(u => toItem(u, userStatuses))
    .sort(byUsername)

  return { new_followers, unfollowers, not_following_back }
}

export function computeEvents(prevSnap, currSnap, snapshotId) {
  const now = new Date().toISOString()
  const prevFollowerSet  = new Set(prevSnap.followers.map(u => u.username))
  const currFollowerSet  = new Set(currSnap.followers.map(u => u.username))
  const prevFollowingSet = new Set(prevSnap.following.map(u => u.username))
  const currFollowingSet = new Set(currSnap.following.map(u => u.username))

  const events = []
  for (const u of currSnap.followers)  if (!prevFollowerSet.has(u.username))  events.push({ username: u.username, event_type: 'followed_you',   snapshot_id: snapshotId, detected_at: now })
  for (const u of prevSnap.followers)  if (!currFollowerSet.has(u.username))  events.push({ username: u.username, event_type: 'unfollowed_you', snapshot_id: snapshotId, detected_at: now })
  for (const u of currSnap.following)  if (!prevFollowingSet.has(u.username)) events.push({ username: u.username, event_type: 'you_followed',   snapshot_id: snapshotId, detected_at: now })
  for (const u of prevSnap.following)  if (!currFollowingSet.has(u.username)) events.push({ username: u.username, event_type: 'you_unfollowed', snapshot_id: snapshotId, detected_at: now })
  return events
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
