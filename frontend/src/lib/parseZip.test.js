import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { parseZip, ZipFormatError } from './parseZip'

async function makeZip(files) {
  const zip = new JSZip()
  for (const [name, data] of Object.entries(files)) zip.file(name, JSON.stringify(data))
  const buf = await zip.generateAsync({ type: 'arraybuffer' })
  return { arrayBuffer: async () => buf }
}

const follower = (value, timestamp = 1700000000) => ({ string_list_data: [{ value, timestamp }] })
const following = (title, timestamp = 1700000000) => ({ title, string_list_data: [{ timestamp }] })

describe('parseZip', () => {
  it('parses followers across files, lowercases, and dedups', async () => {
    const file = await makeZip({
      'connections/followers_and_following/followers_1.json': [follower('Alice'), follower('bob')],
      'connections/followers_and_following/followers_2.json': [follower('ALICE'), follower('carol')],
    })
    const r = await parseZip(file)
    expect(r.followers.map(f => f.username)).toEqual(['alice', 'bob', 'carol'])
    expect(r.followers[0].timestamp).toBe(new Date(1700000000 * 1000).toISOString())
    expect(r.file_hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('parses following.json', async () => {
    const file = await makeZip({
      'connections/followers_and_following/following.json': {
        relationships_following: [following('Dave'), following('eve')],
      },
    })
    const r = await parseZip(file)
    expect(r.following.map(f => f.username)).toEqual(['dave', 'eve'])
  })

  it('parses pending follow requests from label_values', async () => {
    const file = await makeZip({
      'connections/followers_and_following/followers_1.json': [follower('someone')],
      'connections/followers_and_following/pending_follow_requests.json': [
        { timestamp: 1700000000, label_values: [{ label: 'Username', value: 'Frank' }] },
      ],
    })
    const r = await parseZip(file)
    expect(r.pending_sent.map(p => p.username)).toEqual(['frank'])
  })

  it('tags __deleted__ accounts', async () => {
    const file = await makeZip({
      'followers_1.json': [follower('__deleted__123'), follower('gina')],
    })
    const r = await parseZip(file)
    expect(r.followers.find(f => f.username === '__deleted__123')._deleted).toBe(true)
    expect(r.followers.find(f => f.username === 'gina')._deleted).toBe(false)
  })

  it('rejects a ZIP without followers or following', async () => {
    const file = await makeZip({ 'readme.json': {} })
    await expect(parseZip(file)).rejects.toThrow(ZipFormatError)
  })

  it('explains when the export is in HTML format', async () => {
    const zip = new JSZip()
    zip.file('connections/followers_and_following/followers_1.html', '<html></html>')
    const buf = await zip.generateAsync({ type: 'arraybuffer' })
    await expect(parseZip({ arrayBuffer: async () => buf })).rejects.toThrow(/HTML format/)
  })

  it('rejects oversized files', async () => {
    await expect(parseZip({ size: 300 * 1024 * 1024 })).rejects.toThrow(/too large/)
  })
})
