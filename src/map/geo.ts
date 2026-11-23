import type { Day, LatLng, Leg, Stop } from '../data/schema.ts'

export type Bounds = { north: number; south: number; east: number; west: number }

export const toLiteral = ([lat, lng]: LatLng): google.maps.LatLngLiteral => ({ lat, lng })

/** 包含這幾天所有景點和自訂路徑的範圍；沒有點時回傳 null。 */
export function boundsOf(days: Day[]): Bounds | null {
  let b: Bounds | null = null
  const add = ([lat, lng]: LatLng) => {
    if (!b) b = { north: lat, south: lat, east: lng, west: lng }
    else {
      b.north = Math.max(b.north, lat)
      b.south = Math.min(b.south, lat)
      b.east = Math.max(b.east, lng)
      b.west = Math.min(b.west, lng)
    }
  }
  for (const d of days) {
    d.stops.forEach((s) => add(s.ll))
    d.legs.forEach((l) => l.path?.forEach(add))
  }
  return b
}

/** 交通在地圖上的路徑：有 path 用 path，否則直線連起訖點；原地繞圈又沒有 path 時不畫。 */
export function legPath(leg: Leg, from: Stop, to: Stop): LatLng[] | null {
  if (leg.path) return leg.path
  if (from.id === to.id) return null
  return [from.ll, to.ll]
}
