import JSZip from 'jszip'

const MAX_ZIP_BYTES = 200 * 1024 * 1024

export class ZipFormatError extends Error {}

function epochToISO(ts) {
  if (ts == null) return null
  try { return new Date(parseInt(ts, 10) * 1000).toISOString() }
  catch { return null }
}

function parseFollowersFile(data) {
  if (!Array.isArray(data)) return []
  const out = []
  for (const item of data) {
    try {
      const sld = item.string_list_data || []
      if (sld.length) {
        out.push({ username: sld[0].value.trim().toLowerCase(), timestamp: epochToISO(sld[0].timestamp) })
      }
    } catch {}
  }
  return out
}

function parseFollowingFile(data) {
  const out = []
  const items = (data && data.relationships_following) || []
  for (const item of items) {
    try {
      const username = (item.title || '').trim().toLowerCase()
      const sld = item.string_list_data || []
      if (username) out.push({ username, timestamp: sld[0] ? epochToISO(sld[0].timestamp) : null })
    } catch {}
  }
  return out
}

function parseLabelValuesFile(data) {
  const out = []
  if (data && !Array.isArray(data)) data = data.label_values ? [data] : Object.values(data)[0]
  if (!Array.isArray(data)) return out
  for (const item of data) {
    try {
      let username = null
      for (const lv of (item.label_values || [])) {
        if (lv.label === 'Username') { username = (lv.value || '').trim().toLowerCase(); break }
      }
      if (username) out.push({ username, timestamp: epochToISO(item.timestamp) })
    } catch {}
  }
  return out
}

function dedup(users) {
  const seen = new Set()
  return users.filter(u => { if (seen.has(u.username)) return false; seen.add(u.username); return true })
}

async function sha256hex(buf) {
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function parseZip(file) {
  if (file.size > MAX_ZIP_BYTES) {
    throw new ZipFormatError('This file is too large to be a followers export (max 200 MB).')
  }
  const arrayBuffer = await file.arrayBuffer()
  const [fileHash, zip] = await Promise.all([
    sha256hex(arrayBuffer),
    JSZip.loadAsync(arrayBuffer),
  ])

  const names = Object.keys(zip.files)

  async function readJson(name) {
    try { return JSON.parse(await zip.files[name].async('text')) }
    catch { return null }
  }

  const followerFiles = names
    .filter(n => /followers_\d+\.json$/.test(n.split('/').pop()))
    .sort()

  let followers = []
  for (const f of followerFiles) {
    const data = await readJson(f)
    if (data) followers.push(...parseFollowersFile(data))
  }

  const followingFile = names.find(n => n.endsWith('following.json'))
  const following = followingFile ? parseFollowingFile(await readJson(followingFile) || {}) : []

  const blockedFile  = names.find(n => n.endsWith('blocked_profiles.json'))
  const blocked      = blockedFile  ? parseLabelValuesFile(await readJson(blockedFile)  || []) : []

  const pendingFile  = names.find(n => n.endsWith('pending_follow_requests.json'))
  const pending_sent = pendingFile  ? parseLabelValuesFile(await readJson(pendingFile)  || []) : []

  const unfollowedFile       = names.find(n => n.endsWith('recently_unfollowed_profiles.json'))
  const recently_unfollowed  = unfollowedFile ? parseLabelValuesFile(await readJson(unfollowedFile) || []) : []

  if (!followers.length && !following.length) {
    const isHtml = names.some(n => /followers_\d+\.html$|following\.html$/.test(n.split('/').pop()))
    throw new ZipFormatError(isHtml
      ? 'This export is in HTML format. Request it again and choose JSON format.'
      : 'No followers or following found in this ZIP. Make sure you selected "Followers and following" in JSON format.')
  }

  const exportedAt = Object.values(zip.files).reduce((max, f) => (f.date > max ? f.date : max), new Date(0))

  return {
    file_hash:            fileHash,
    exported_at:          exportedAt.toISOString(),
    followers:            dedup(followers),
    following:            dedup(following),
    blocked:              dedup(blocked),
    pending_sent:         dedup(pending_sent),
    recently_unfollowed:  dedup(recently_unfollowed),
  }
}
