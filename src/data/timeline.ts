import type { Day, Leg, Stop } from './schema.ts'

export type StopItem = {
  kind: 'stop'
  stop: Stop
  /** 當天順序，從 1 開始 */
  order: number
  /** 所屬的成群景點；label 只在該群第一個出現的景點上 */
  group: { name: string; label: boolean; last: boolean } | null
}

export type LegItem = {
  kind: 'leg'
  leg: Leg
  from: Stop
  to: Stop
  /** 目的地就是列表中的下一站；不是的話（分支、繞回原點）要顯示目的地名稱 */
  toNext: boolean
  /** 前後兩站屬於同一個成群景點，列表上畫在同一塊底色裡 */
  inGroup: boolean
}

export type TimelineItem = StopItem | LegItem

/**
 * 把一天的景點和交通排成列表：每個景點後面接著從它出發的交通。
 * 景點順序就是 stops 陣列的順序；交通依 legs 陣列的順序。
 */
export function buildTimeline(day: Day): TimelineItem[] {
  const byId = new Map(day.stops.map((s) => [s.id, s]))
  const groupOf = new Map<string, string>()
  for (const g of day.groups)
    for (const id of g.stops) if (!groupOf.has(id)) groupOf.set(id, g.name)

  const labeled = new Set<string>()
  const items: TimelineItem[] = []

  day.stops.forEach((stop, i) => {
    const groupName = groupOf.get(stop.id) ?? null
    let group: StopItem['group'] = null
    if (groupName) {
      const next = day.stops[i + 1]
      group = {
        name: groupName,
        label: !labeled.has(groupName),
        last: !next || groupOf.get(next.id) !== groupName,
      }
      labeled.add(groupName)
    }
    items.push({ kind: 'stop', stop, order: i + 1, group })

    for (const leg of day.legs) {
      if (leg.from !== stop.id) continue
      const to = byId.get(leg.to)!
      items.push({
        kind: 'leg',
        leg,
        from: stop,
        to,
        toNext: day.stops[i + 1]?.id === to.id,
        inGroup: group !== null && !group.last,
      })
    }
  })
  return items
}
