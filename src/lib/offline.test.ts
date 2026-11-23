import { describe, expect, it } from 'vitest'
import type { Trip } from '../data/schema.ts'
import { formatUpdated, photoUrls } from './offline.ts'

describe('photoUrls', () => {
  it('收集所有大圖和縮圖，不重複', () => {
    const trip = {
      days: [
        {
          stops: [
            { photos: [{ src: 'https://p/a.webp', thumb: 'https://p/a-t.webp' }] },
            { photos: [{ src: 'https://p/b.webp' }, { src: 'https://p/a.webp' }] },
            {},
          ],
        },
      ],
    } as unknown as Trip
    expect(photoUrls(trip)).toEqual(['https://p/a.webp', 'https://p/a-t.webp', 'https://p/b.webp'])
  })
})

describe('formatUpdated', () => {
  it('同一年只寫月日和時間，不同年加上年份', () => {
    const d = new Date(2026, 10, 23, 9, 5)
    expect(formatUpdated(d, new Date(2026, 11, 1))).toBe('11/23 09:05')
    expect(formatUpdated(d, new Date(2027, 0, 1))).toBe('2026/11/23 09:05')
  })
})
