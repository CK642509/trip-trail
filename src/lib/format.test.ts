import { describe, expect, it } from 'vitest'
import { formatDay, formatLength, formatRange } from './format.ts'
import { directionsUrl, placeUrl } from './googleMaps.ts'

describe('format', () => {
  it('日期與星期', () => {
    expect(formatDay('2026-12-02')).toBe('12/2 (三)')
    expect(formatDay('2026-12-08')).toBe('12/8 (二)')
  })

  it('日期範圍與天數', () => {
    expect(formatRange('2026-12-02', '2026-12-08')).toBe('2026/12/2 – 12/8')
    expect(formatRange('2026-12-30', '2027-01-02')).toBe('2026/12/30 – 2027/1/2')
    expect(formatLength('2026-12-02', '2026-12-08')).toBe('7 天 6 夜')
    expect(formatLength('2026-12-02', '2026-12-02')).toBe('1 天')
  })
})

describe('googleMaps', () => {
  const a = { id: 'a', name: '京都站', ll: [34.9858, 135.7588] as [number, number] }
  const b = { id: 'b', name: '清水寺', ll: [34.9949, 135.785] as [number, number], placeId: 'PID' }

  it('景點：沒有 placeId 用座標，有的話用名稱＋placeId', () => {
    expect(placeUrl(a)).toBe('https://www.google.com/maps/search/?api=1&query=34.9858%2C135.7588')
    expect(placeUrl(b)).toBe(
      'https://www.google.com/maps/search/?api=1&query=%E6%B8%85%E6%B0%B4%E5%AF%BA&query_place_id=PID',
    )
  })

  it('導航：依交通方式選 travelmode；船、起訖相同時不提供', () => {
    const url = new URL(directionsUrl({ mode: 'walk' }, a, b)!)
    expect(url.searchParams.get('travelmode')).toBe('walking')
    expect(url.searchParams.get('origin')).toBe('34.9858,135.7588')
    expect(url.searchParams.get('destination_place_id')).toBe('PID')
    expect(directionsUrl({ mode: 'boat' }, a, b)).toBeNull()
    expect(directionsUrl({ mode: 'rail' }, a, a)).toBeNull()
  })
})
