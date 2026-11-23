import { MODES } from '../data/modes.ts'
import type { LatLng, Leg, Stop } from '../data/schema.ts'

const ll = ([lat, lng]: LatLng) => `${lat},${lng}`

/** 在 Google 地圖開啟景點。有 placeId 時用名稱＋placeId，比座標準。 */
export function placeUrl(stop: Pick<Stop, 'name' | 'll' | 'placeId'>): string {
  const params = new URLSearchParams({ api: '1' })
  if (stop.placeId) {
    params.set('query', stop.name)
    params.set('query_place_id', stop.placeId)
  } else {
    params.set('query', ll(stop.ll))
  }
  return `https://www.google.com/maps/search/?${params}`
}

/** Google 地圖導航連結；起訖點相同或交通方式不適合導航時回傳 null。 */
export function directionsUrl(leg: Pick<Leg, 'mode'>, from: Stop, to: Stop): string | null {
  const travelmode = MODES[leg.mode].travelmode
  if (!travelmode || from.id === to.id) return null
  const params = new URLSearchParams({
    api: '1',
    origin: ll(from.ll),
    destination: to.placeId ? to.name : ll(to.ll),
    travelmode,
  })
  if (from.placeId) {
    params.set('origin', from.name)
    params.set('origin_place_id', from.placeId)
  }
  if (to.placeId) params.set('destination_place_id', to.placeId)
  return `https://www.google.com/maps/dir/?${params}`
}
