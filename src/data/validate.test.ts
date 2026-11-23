import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { tripJsonSchema, validateTrip } from './validate.ts'

function minimalTrip() {
  return {
    schemaVersion: 2,
    slug: 'test-trip',
    title: '測試旅程',
    start: '2026-01-01',
    end: '2026-01-02',
    timezone: 'Asia/Tokyo',
    days: [
      {
        id: 1,
        date: '2026-01-01',
        title: '第一天',
        stops: [
          { id: 'a', name: 'A', ll: [35, 135] },
          { id: 'b', name: 'B', ll: [35.1, 135.1] },
        ],
        legs: [{ from: 'a', to: 'b', mode: 'walk' }],
        groups: [{ name: '群', stops: ['a', 'b'] }],
      },
    ],
  }
}

function errorsOf(raw: unknown, slug?: string): string[] {
  const result = validateTrip(raw, { slug })
  return result.ok ? [] : result.errors
}

describe('validateTrip', () => {
  it('接受最小的合法旅程，legs 和 groups 可以省略', () => {
    expect(errorsOf(minimalTrip())).toEqual([])
    const trip = minimalTrip()
    const { legs: _l, groups: _g, ...day } = trip.days[0]
    const result = validateTrip({ ...trip, days: [day] })
    expect(result.ok && result.trip.days[0].legs).toEqual([])
  })

  it('time、note 等欄位都是選填', () => {
    const result = validateTrip(minimalTrip())
    expect(result.ok && result.trip.days[0].stops[0].time).toBeUndefined()
  })

  it('Markdown 欄位可以寫成字串陣列，會用換行接起來', () => {
    const result = validateTrip({ ...minimalTrip(), info: ['## 標題', '', '- 項目'] })
    expect(result.ok && result.trip.info).toBe('## 標題\n\n- 項目')
  })

  it('拒絕拼錯的欄位名稱', () => {
    const trip = minimalTrip()
    Object.assign(trip.days[0].stops[0], { nmae: 'typo' })
    expect(errorsOf(trip).join()).toContain('days[0].stops[0]')
  })

  it('座標超出範圍時報錯並指出路徑', () => {
    const trip = minimalTrip()
    trip.days[0].stops[0].ll = [135, 35] // 經緯度寫反
    expect(errorsOf(trip)[0]).toMatch(/^days\[0\]\.stops\[0\]\.ll\[0\]:/)
  })

  it('leg 或 group 指到不存在的 stop 時報錯', () => {
    const trip = minimalTrip()
    trip.days[0].legs[0].to = 'zzz'
    trip.days[0].groups[0].stops.push('yyy')
    expect(errorsOf(trip)).toEqual([
      'days[0].legs[0].to: 找不到 stop "zzz"',
      'days[0].groups[0].stops[2]: 找不到 stop "yyy"',
    ])
  })

  it('from 和 to 可以相同（例如遊覽船繞一圈）', () => {
    const trip = minimalTrip()
    trip.days[0].legs.push({ from: 'a', to: 'a', mode: 'boat' })
    expect(errorsOf(trip)).toEqual([])
  })

  it('同一天重複的 stop id 報錯，不同天可以重複', () => {
    const trip = minimalTrip()
    trip.days.push({ ...structuredClone(trip.days[0]), id: 2, date: '2026-01-02' })
    expect(errorsOf(trip)).toEqual([])
    trip.days[0].stops[1].id = 'a'
    expect(errorsOf(trip)).toContain('days[0].stops[1].id: 同一天內重複的 id "a"')
  })

  it('檢查日期範圍、重複的 day id 與日期', () => {
    const trip = minimalTrip()
    trip.days.push({ ...structuredClone(trip.days[0]), date: '2026-01-05' })
    expect(errorsOf(trip)).toEqual([
      'days[1].id: 重複的 day id 1',
      'days[1].date: 2026-01-05 不在 2026-01-01～2026-01-02 之間',
    ])
  })

  it('slug 要和資料夾名稱一致，且不能是 index', () => {
    expect(errorsOf(minimalTrip(), 'other')).toEqual([
      'slug: "test-trip" 和資料夾名稱 "other" 不一致',
    ])
    expect(errorsOf({ ...minimalTrip(), slug: 'index' })[0]).toContain('index')
  })

  it('照片網址必須是 URL', () => {
    const trip = minimalTrip()
    Object.assign(trip.days[0].stops[0], { photos: [{ src: 'not-a-url' }] })
    expect(errorsOf(trip)[0]).toMatch(/^days\[0\]\.stops\[0\]\.photos\[0\]\.src:/)
  })
})

describe('實際資料', () => {
  it('trips/kansai-2026/trip.json 通過驗證', () => {
    const raw = JSON.parse(readFileSync('trips/kansai-2026/trip.json', 'utf8'))
    const result = validateTrip(raw, { slug: 'kansai-2026' })
    expect(result.ok ? [] : result.errors).toEqual([])
  })

  it('schema/trip.schema.json 是最新的（不是的話請執行 npm run gen-schema）', () => {
    const committed = JSON.parse(readFileSync('schema/trip.schema.json', 'utf8'))
    expect(committed).toEqual(tripJsonSchema())
  })
})
