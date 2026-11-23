import { describe, expect, it } from 'vitest'
import { normalizeSelection, tapDay, toSingle } from './daySelection.ts'
import { daysFromHash, hashForDays } from './router.ts'

const all = [1, 2, 3, 4]

describe('daysFromHash / hashForDays', () => {
  it('讀寫 hash', () => {
    expect(daysFromHash('')).toBeNull()
    expect(daysFromHash('#day-3')).toEqual([3])
    expect(daysFromHash('#day-3,1,3')).toEqual([1, 3])
    expect(daysFromHash('#day-')).toBeNull()
    expect(daysFromHash('#info')).toBeNull()
    expect(hashForDays(null)).toBe('')
    expect(hashForDays([3, 1])).toBe('#day-1,3')
  })
})

describe('day selection', () => {
  it('normalize：過濾不存在的天、全選視為全部', () => {
    expect(normalizeSelection([9], all)).toBeNull()
    expect(normalizeSelection([2, 9, 2], all)).toEqual([2])
    expect(normalizeSelection([4, 3, 2, 1], all)).toBeNull()
  })

  it('單選：點哪天就只看哪天', () => {
    expect(tapDay(null, 2, false, all)).toEqual([2])
    expect(tapDay([1, 3], 2, false, all)).toEqual([2])
  })

  it('複選：從全部開始先只選一天，之後加入／移除，至少留一天', () => {
    expect(tapDay(null, 2, true, all)).toEqual([2])
    expect(tapDay([2], 4, true, all)).toEqual([2, 4])
    expect(tapDay([2, 4], 2, true, all)).toEqual([4])
    expect(tapDay([4], 4, true, all)).toEqual([4])
    expect(tapDay([1, 2, 3], 4, true, all)).toBeNull()
  })

  it('關掉複選只留第一天', () => {
    expect(toSingle([2, 4])).toEqual([2])
    expect(toSingle(null)).toBeNull()
  })
})
