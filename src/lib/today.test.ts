import { describe, expect, it } from 'vitest'
import type { Day, Trip } from '../data/schema.ts'
import { nextStopId, startMinutes, todayDay, tripClock } from './today.ts'

const stop = (id: string, time?: string) => ({ id, name: id, ll: [0, 0] as [number, number], time })
const day = (id: number, date: string, times: (string | undefined)[]): Day => ({
  id,
  date,
  title: `Day ${id}`,
  stops: times.map((t, i) => stop(`s${i + 1}`, t)),
  legs: [],
  groups: [],
})

describe('tripClock', () => {
  it('用旅程時區換算', () => {
    // 2026-12-02 23:30 UTC = 東京 12/3 08:30
    const now = new Date('2026-12-02T23:30:00Z')
    expect(tripClock('Asia/Tokyo', now)).toEqual({ date: '2026-12-03', minutes: 8 * 60 + 30 })
    expect(tripClock('Asia/Taipei', now)).toEqual({ date: '2026-12-03', minutes: 7 * 60 + 30 })
    expect(tripClock('UTC', new Date('2026-12-02T00:05:00Z'))).toEqual({
      date: '2026-12-02',
      minutes: 5,
    })
  })

  it('時區寫錯時不會壞掉', () => {
    expect(tripClock('Not/AZone').date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('todayDay', () => {
  const trip = {
    days: [day(1, '2026-12-02', []), day(2, '2026-12-03', [])],
  } as unknown as Trip
  it('找出今天是第幾天', () => {
    expect(todayDay(trip, { date: '2026-12-03', minutes: 0 })?.id).toBe(2)
    expect(todayDay(trip, { date: '2026-11-23', minutes: 0 })).toBeNull()
  })
})

describe('startMinutes', () => {
  it('抓開頭的時間', () => {
    expect(startMinutes('08:15')).toBe(8 * 60 + 15)
    expect(startMinutes('9:05')).toBe(9 * 60 + 5)
    expect(startMinutes('13:20–14:40')).toBe(13 * 60 + 20)
    expect(startMinutes('13:33 搭車')).toBe(13 * 60 + 33)
    expect(startMinutes('上午–15:30')).toBe(9 * 60)
    expect(startMinutes('下午')).toBe(13 * 60)
    expect(startMinutes('晚上')).toBe(18 * 60)
  })
  it('抓不到就是 null', () => {
    expect(startMinutes(undefined)).toBeNull()
    expect(startMinutes('看天氣')).toBeNull()
    expect(startMinutes('約 10:00')).toBeNull()
    expect(startMinutes('25:00')).toBeNull()
  })
})

describe('nextStopId', () => {
  const d = day(1, '2026-12-02', ['08:15', '10:00–12:15', undefined, '15:00', '晚上'])
  it('時間到了就換下一站', () => {
    expect(nextStopId(d, 7 * 60)).toBe('s1')
    expect(nextStopId(d, 8 * 60 + 15)).toBe('s2')
    expect(nextStopId(d, 11 * 60)).toBe('s3')
    expect(nextStopId(d, 14 * 60)).toBe('s3')
    expect(nextStopId(d, 15 * 60 + 10)).toBe('s5')
  })
  it('最後一站之後沒有下一站', () => {
    expect(nextStopId(d, 20 * 60)).toBeNull()
  })
  it('「下午」連續好幾站時，只有第一站當作分界', () => {
    const r = day(1, '2026-12-02', ['10:00', '下午', '下午', '下午', '晚上'])
    expect(nextStopId(r, 12 * 60)).toBe('s2')
    expect(nextStopId(r, 14 * 60)).toBe('s3')
    expect(nextStopId(r, 16 * 60)).toBe('s3')
    expect(nextStopId(r, 19 * 60)).toBeNull()
  })
  it('只寫「上午」「下午」、沒有確切時間就不標示', () => {
    expect(nextStopId(day(1, '2026-12-02', ['上午', '上午', '下午', '晚上']), 14 * 60)).toBeNull()
    expect(nextStopId(day(1, '2026-12-02', [undefined, '看天氣']), 10 * 60)).toBeNull()
  })
})
