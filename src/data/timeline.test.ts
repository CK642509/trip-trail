import { describe, expect, it } from 'vitest'
import type { Day } from './schema.ts'
import { buildTimeline, type TimelineItem } from './timeline.ts'

const stop = (id: string) => ({ id, name: id.toUpperCase(), ll: [35, 135] as [number, number] })

function summary(items: TimelineItem[]): string[] {
  return items.map((it) =>
    it.kind === 'stop'
      ? `${it.order}:${it.stop.id}${it.group ? `[${it.group.name}${it.group.label ? '*' : ''}${it.group.last ? '$' : ''}]` : ''}`
      : `  ${it.from.id}->${it.to.id}${it.toNext ? '' : ' (跳)'}${it.inGroup ? ' [G]' : ''}`,
  )
}

describe('buildTimeline', () => {
  it('景點後面接從它出發的交通，分支時標出不是下一站的目的地', () => {
    // 原型 Day 3：東福寺之後二選一（稻荷或宇治），兩者都回京都
    const day: Day = {
      id: 3,
      date: '2026-12-04',
      title: 't',
      stops: ['kyo', 'tofuku', 'inari', 'byodo', 'kyo2'].map(stop),
      legs: [
        { from: 'kyo', to: 'tofuku', mode: 'rail' },
        { from: 'tofuku', to: 'inari', mode: 'rail', optional: true },
        { from: 'tofuku', to: 'byodo', mode: 'rail', optional: true },
        { from: 'inari', to: 'kyo2', mode: 'rail' },
        { from: 'byodo', to: 'kyo2', mode: 'rail' },
      ],
      groups: [],
    }
    expect(summary(buildTimeline(day))).toEqual([
      '1:kyo',
      '  kyo->tofuku',
      '2:tofuku',
      '  tofuku->inari',
      '  tofuku->byodo (跳)',
      '3:inari',
      '  inari->kyo2 (跳)',
      '4:byodo',
      '  byodo->kyo2',
      '5:kyo2',
    ])
  })

  it('繞一圈回原點的交通（from = to）', () => {
    const day: Day = {
      id: 1,
      date: '2026-12-05',
      title: 't',
      stops: ['pier', 'ine'].map(stop),
      legs: [
        { from: 'pier', to: 'pier', mode: 'boat' },
        { from: 'pier', to: 'ine', mode: 'walk' },
      ],
      groups: [],
    }
    expect(summary(buildTimeline(day))).toEqual([
      '1:pier',
      '  pier->pier (跳)',
      '  pier->ine',
      '2:ine',
    ])
  })

  it('成群景點：第一個顯示群組名稱，最後一個標記結尾', () => {
    const day: Day = {
      id: 2,
      date: '2026-12-03',
      title: 't',
      stops: ['a', 'b', 'c', 'd'].map(stop),
      legs: [
        { from: 'a', to: 'b', mode: 'walk' },
        { from: 'b', to: 'c', mode: 'walk' },
        { from: 'c', to: 'd', mode: 'walk' },
      ],
      groups: [{ name: 'G', stops: ['b', 'c'] }],
    }
    expect(summary(buildTimeline(day))).toEqual([
      '1:a',
      '  a->b',
      '2:b[G*]',
      '  b->c [G]',
      '3:c[G$]',
      '  c->d',
      '4:d',
    ])
  })
})
