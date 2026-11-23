import { describe, expect, it } from 'vitest'
import type { Day, Trip } from '../data/schema.ts'
import { clusterDays, clusterPlaces, dayOffset, groupAreas, mergePlaces } from './places.ts'
import { fromPixel, metersBetween, offsetPath, toPixel } from './projection.ts'

const KYOTO: [number, number] = [34.9858, 135.7588]

const day1: Day = {
  id: 1,
  date: '2026-12-02',
  title: 'd1',
  color: '#111111',
  stops: [
    { id: 'kix', name: '機場', ll: [34.4326, 135.244] },
    { id: 'kyo', name: '京都站', ll: KYOTO },
  ],
  legs: [],
  groups: [],
}

const day2: Day = {
  id: 2,
  date: '2026-12-03',
  title: 'd2',
  color: '#222222',
  stops: [
    { id: 'kyo', name: '京都站', ll: [34.98581, 135.75884] },
    { id: 'kiyo', name: '清水寺', ll: [34.9949, 135.785], optional: true },
    { id: 'gion', name: '祇園', ll: [35.0037, 135.7788] },
    { id: 'kyo2', name: '京都站', ll: KYOTO },
  ],
  legs: [],
  groups: [{ name: '東山', stops: ['kiyo', 'gion'] }],
}

const trip = {
  schemaVersion: 2,
  slug: 't',
  title: 't',
  start: '2026-12-02',
  end: '2026-12-03',
  timezone: 'Asia/Tokyo',
  days: [day1, day2],
} as Trip

describe('mergePlaces', () => {
  it('同一位置合成一個標記，依天分組', () => {
    const places = mergePlaces(trip, [day1, day2])
    expect(places).toHaveLength(4)
    const kyoto = places.find((p) => p.visits.length > 1)!
    expect(kyoto.byDay).toEqual([
      { dayId: 1, color: '#111111', nums: [2], optional: false },
      { dayId: 2, color: '#222222', nums: [1, 4], optional: false },
    ])
  })

  it('可選行程的標記保留可選狀態', () => {
    const kiyo = mergePlaces(trip, [day2]).find((p) => p.visits[0].stopId === 'kiyo')!
    expect(kiyo.byDay[0].optional).toBe(true)
  })
})

describe('clusterPlaces', () => {
  const places = mergePlaces(trip, [day1, day2])

  it('縮小時重疊的標記收成叢集，放大後分開', () => {
    const far = clusterPlaces(places, 9)
    expect(far.singles.map((p) => p.visits[0].stopId)).toEqual(['kix'])
    expect(far.clusters).toHaveLength(1)
    expect(far.clusters[0].places).toHaveLength(3)
    expect(clusterDays(far.clusters[0]).map((d) => d.dayId)).toEqual([1, 2])

    const near = clusterPlaces(places, 15)
    expect(near.clusters).toHaveLength(0)
    expect(near.singles).toHaveLength(4)
  })

  it('選取中的景點不會被收進叢集', () => {
    const keep = new Set([places[1].key])
    const r = clusterPlaces(places, 9, keep)
    expect(r.singles).toContain(places[1])
    expect(r.clusters[0].places).not.toContain(places[1])
  })
})

describe('groupAreas', () => {
  it('圓圈包住所有成員', () => {
    const [area] = groupAreas(trip, [day2])
    expect(area.name).toBe('東山')
    expect(area.color).toBe('#222222')
    for (const s of day2.stops.slice(1, 3)) {
      expect(metersBetween(area.center, s.ll)).toBeLessThan(area.radius - 80)
    }
    expect(area.ring[0]).toEqual(area.ring.at(-1))
  })
})

describe('offsetPath', () => {
  it('往行進方向右側平移指定像素', () => {
    const zoom = 14
    // 往東走，右側是南方（螢幕 y 增加）
    const path: [number, number][] = [
      [35, 135.7],
      [35, 135.8],
    ]
    const out = offsetPath(path, 5, zoom)
    const a = toPixel(path[0], zoom)
    const b = toPixel(out[0], zoom)
    expect(b.x - a.x).toBeCloseTo(0, 6)
    expect(b.y - a.y).toBeCloseTo(5, 6)
    expect(offsetPath(path, 0, zoom)).toBe(path)
  })

  it('像素座標可以來回換算', () => {
    const ll = fromPixel(toPixel(KYOTO, 12), 12)
    expect(ll[0]).toBeCloseTo(KYOTO[0], 9)
    expect(ll[1]).toBeCloseTo(KYOTO[1], 9)
  })
})

describe('dayOffset', () => {
  it('多天時左右對稱錯開', () => {
    expect(dayOffset(0, 1)).toBe(3)
    expect([0, 1, 2].map((i) => dayOffset(i, 3))).toEqual([-2, 3, 8])
  })
})
