import { describe, expect, it } from 'vitest'
import type { LoadedTrip } from './trips.ts'
import { buildIndex } from './trips.ts'

const trips = [{ slug: 'kansai-2026' }] as LoadedTrip[]
const HASH = 'a'.repeat(64)

describe('buildIndex', () => {
  it('從環境變數讀 hash', () => {
    const { index, errors } = buildIndex(trips, { TRIP_KANSAI_2026_HASH: HASH }, true)
    expect(errors).toEqual([])
    expect(index.trips).toEqual([{ slug: 'kansai-2026', hash: HASH }])
  })

  it('開發環境缺 hash 只警告，正式環境報錯', () => {
    expect(buildIndex(trips, {}, false)).toMatchObject({
      errors: [],
      warnings: [expect.any(String)],
    })
    expect(buildIndex(trips, {}, true).errors[0]).toContain('TRIP_KANSAI_2026_HASH')
  })

  it('拒絕格式錯誤的 hash（例如誤填密碼原文）', () => {
    expect(buildIndex(trips, { TRIP_KANSAI_2026_HASH: 'not-a-hash' }, false).errors).toHaveLength(1)
  })
})
