import { dayColor } from '../data/modes.ts'
import type { Day, LatLng, Trip } from '../data/schema.ts'
import { circlePath, metersBetween, toPixel, type Point } from './projection.ts'

/** 地圖上某個位置的一次到訪 */
export type Visit = {
  dayId: number
  stopId: string
  /** 當天第幾站（從 1 開始） */
  num: number
  name: string
  color: string
  optional: boolean
}

/** 同一天在同一位置的到訪，合成一個「D2·1·10」 */
export type DayVisits = { dayId: number; color: string; nums: number[]; optional: boolean }

/** 相同位置合併後的一個標記 */
export type Place = {
  key: string
  ll: LatLng
  visits: Visit[]
  byDay: DayVisits[]
}

/** 座標取到小數第 4 位（約 10 公尺）相同就視為同一個地點（沿用原型） */
export const placeKey = ([lat, lng]: LatLng) => `${lat.toFixed(4)},${lng.toFixed(4)}`

/** 把這幾天的景點依位置合併。順序依天數、站序，第一次出現的位置排前面。 */
export function mergePlaces(trip: Trip, days: Day[]): Place[] {
  const map = new Map<string, Place>()
  for (const day of days) {
    const color = dayColor(day.color, trip.days.indexOf(day))
    day.stops.forEach((stop, i) => {
      const key = placeKey(stop.ll)
      let place = map.get(key)
      if (!place) {
        place = { key, ll: stop.ll, visits: [], byDay: [] }
        map.set(key, place)
      }
      const optional = stop.optional ?? false
      place.visits.push({
        dayId: day.id,
        stopId: stop.id,
        num: i + 1,
        name: stop.name,
        color,
        optional,
      })
      const g = place.byDay.find((x) => x.dayId === day.id)
      if (g) {
        g.nums.push(i + 1)
        g.optional &&= optional
      } else {
        place.byDay.push({ dayId: day.id, color, nums: [i + 1], optional })
      }
    })
  }
  return [...map.values()]
}

/** 超過幾天共用同一個地點時，標記改成精簡的色點樣式 */
export const COMPACT_DAYS = 3

/** 標記的大約寬度（像素），和 TripMap.css 的 .mk 尺寸一致，用來判斷是否重疊 */
export function placeWidth(place: Place): number {
  const n = place.byDay.length
  if (n >= COMPACT_DAYS) return 26 + n * 16
  const multi = n > 1
  return place.byDay.reduce((w, g) => {
    const text = (multi ? `D${g.dayId}·` : '') + g.nums.join('·')
    return w + Math.max(30, 16 + text.length * 8.5)
  }, 0)
}

const MARKER_H = 30

export type Cluster = { key: string; ll: LatLng; places: Place[] }

/**
 * 在目前縮放等級下互相重疊的標記收成一個叢集（重疊會連鎖：A 疊 B、B 疊 C 就三個一起）。
 * keep 裡的地點（例如目前選取的景點）永遠單獨顯示。
 */
export function clusterPlaces(
  places: Place[],
  zoom: number,
  keep: ReadonlySet<string> = new Set(),
): { singles: Place[]; clusters: Cluster[] } {
  const px: Point[] = places.map((p) => toPixel(p.ll, zoom))
  const half = places.map((p) => placeWidth(p) / 2)
  const parent = places.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))

  for (let i = 0; i < places.length; i++) {
    if (keep.has(places[i].key)) continue
    for (let j = i + 1; j < places.length; j++) {
      if (keep.has(places[j].key)) continue
      const dx = Math.abs(px[i].x - px[j].x)
      const dy = Math.abs(px[i].y - px[j].y)
      if (dx < half[i] + half[j] + 2 && dy < MARKER_H + 2) parent[find(i)] = find(j)
    }
  }

  const groups = new Map<number, number[]>()
  places.forEach((_, i) => {
    const r = find(i)
    groups.set(r, [...(groups.get(r) ?? []), i])
  })

  const singles: Place[] = []
  const clusters: Cluster[] = []
  for (const idx of groups.values()) {
    if (idx.length === 1) {
      singles.push(places[idx[0]])
      continue
    }
    const members = idx.map((i) => places[i])
    const lat = members.reduce((s, p) => s + p.ll[0], 0) / members.length
    const lng = members.reduce((s, p) => s + p.ll[1], 0) / members.length
    clusters.push({ key: members.map((p) => p.key).join('|'), ll: [lat, lng], places: members })
  }
  return { singles, clusters }
}

/** 叢集裡有哪些天的顏色（依天數排序、不重複） */
export function clusterDays(cluster: Cluster): { dayId: number; color: string }[] {
  const seen = new Map<number, string>()
  for (const p of cluster.places) for (const g of p.byDay) seen.set(g.dayId, g.color)
  return [...seen].sort((a, b) => a[0] - b[0]).map(([dayId, color]) => ({ dayId, color }))
}

export type GroupArea = {
  key: string
  name: string
  color: string
  center: LatLng
  /** 公尺 */
  radius: number
  ring: LatLng[]
}

/** 成群景點的圓圈：圓心是成員的平均位置，半徑包住最遠的成員再多留一點空間。 */
export function groupAreas(trip: Trip, days: Day[]): GroupArea[] {
  return days.flatMap((day) => {
    const color = dayColor(day.color, trip.days.indexOf(day))
    const byId = new Map(day.stops.map((s) => [s.id, s]))
    return day.groups.flatMap((g, i) => {
      const lls = g.stops.map((id) => byId.get(id)?.ll).filter((ll): ll is LatLng => !!ll)
      if (lls.length === 0) return []
      const center: LatLng = [
        lls.reduce((s, ll) => s + ll[0], 0) / lls.length,
        lls.reduce((s, ll) => s + ll[1], 0) / lls.length,
      ]
      const far = Math.max(...lls.map((ll) => metersBetween(center, ll)))
      const radius = Math.round(far + Math.max(90, far * 0.15))
      return [
        {
          key: `${day.id}-${i}`,
          name: g.name,
          color,
          center,
          radius,
          ring: circlePath(center, radius),
        },
      ]
    })
  })
}

/** 多天同時顯示時，每天的路線往左右錯開幾像素；另外整體往右偏一點，來回同一條路才分得開 */
export function dayOffset(index: number, count: number): number {
  return (count > 1 ? (index - (count - 1) / 2) * 5 : 0) + 3
}
