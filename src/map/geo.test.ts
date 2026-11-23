import { describe, expect, it } from 'vitest'
import type { Day } from '../data/schema.ts'
import { boundsOf, legPath } from './geo.ts'

const day: Day = {
  id: 1,
  date: '2026-12-02',
  title: 't',
  stops: [
    { id: 'a', name: 'A', ll: [34.4, 135.2] },
    { id: 'b', name: 'B', ll: [35.0, 135.7] },
  ],
  legs: [
    {
      from: 'a',
      to: 'b',
      mode: 'rail',
      path: [
        [34.4, 135.2],
        [35.2, 135.1],
        [35.0, 135.7],
      ],
    },
  ],
  groups: [],
}

describe('geo', () => {
  it('範圍包含景點和自訂路徑', () => {
    expect(boundsOf([day])).toEqual({ north: 35.2, south: 34.4, east: 135.7, west: 135.1 })
    expect(boundsOf([])).toBeNull()
  })

  it('沒有 path 時直線連起訖點，原地繞圈不畫', () => {
    const [a, b] = day.stops
    expect(legPath({ from: 'a', to: 'b', mode: 'walk' }, a, b)).toEqual([a.ll, b.ll])
    expect(legPath({ from: 'a', to: 'a', mode: 'walk' }, a, a)).toBeNull()
  })
})
