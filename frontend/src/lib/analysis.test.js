import { describe, it, expect } from 'vitest'
import { computeDiff, getNotFollowingBack, getFollowingList, getPendingSent } from './analysis'

const u = (username, timestamp = null) => ({ username, timestamp })

const prev = { followers: [u('a'), u('b'), u('c')], following: [u('a'), u('x')] }
const curr = { followers: [u('b'), u('c'), u('d')], following: [u('a'), u('x'), u('y')] }

// ── computeDiff ────────────────────────────────────────────────────────────────

describe('computeDiff', () => {
  it('finds new followers and unfollowers', () => {
    const d = computeDiff(prev, curr, {})
    expect(d.new_followers.map(i => i.username)).toEqual(['d'])
    expect(d.unfollowers.map(i => i.username)).toEqual(['a'])
  })

  it('lists following who do not follow back, sorted', () => {
    const d = computeDiff(prev, curr, {})
    expect(d.not_following_back.map(i => i.username)).toEqual(['a', 'x', 'y'])
  })
})

// ── Visibility by status ───────────────────────────────────────────────────────

describe('getNotFollowingBack', () => {
  it('hides deleted and private_or_inactive, keeps unchecked and active_public', () => {
    const statuses = { a: 'deleted', x: 'private_or_inactive', y: 'active_public' }
    expect(getNotFollowingBack(curr, statuses).map(i => i.username)).toEqual(['y'])
    expect(getNotFollowingBack(curr, {}).map(i => i.username)).toEqual(['a', 'x', 'y'])
  })
})

describe('getFollowingList', () => {
  it('filters by status and attaches status to items', () => {
    const items = getFollowingList(curr, { x: 'deleted', y: 'active_public' })
    expect(items.map(i => i.username)).toEqual(['a', 'y'])
    expect(items[1].status).toBe('active_public')
  })
})

describe('getPendingSent', () => {
  it('maps and sorts pending requests', () => {
    const snap = { pending_sent: [u('z', 't1'), u('m', 't2')] }
    expect(getPendingSent(snap)).toEqual([
      { username: 'm', event_ts: 't2' },
      { username: 'z', event_ts: 't1' },
    ])
  })
})

