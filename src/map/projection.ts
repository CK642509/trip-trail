import type { LatLng } from '../data/schema.ts'

/**
 * Web Mercator 換算（和 Google 地圖相同）：縮放 0 時整個世界是 256×256 的「世界座標」，
 * 每放大一級乘 2。用純數學算，不依賴 google.maps，可以測試。
 */
export type Point = { x: number; y: number }

const TILE = 256
const EARTH_R = 6378137

export function toWorld([lat, lng]: LatLng): Point {
  const s = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999)
  return {
    x: TILE * (0.5 + lng / 360),
    y: TILE * (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)),
  }
}

export function fromWorld({ x, y }: Point): LatLng {
  const lng = (x / TILE - 0.5) * 360
  const n = Math.PI - (2 * Math.PI * y) / TILE
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n))
  return [lat, lng]
}

/** 某個縮放等級下的像素座標 */
export function toPixel(ll: LatLng, zoom: number): Point {
  const w = toWorld(ll)
  const k = 2 ** zoom
  return { x: w.x * k, y: w.y * k }
}

export function fromPixel(p: Point, zoom: number): LatLng {
  const k = 2 ** zoom
  return fromWorld({ x: p.x / k, y: p.y / k })
}

/**
 * 把路徑往行進方向的右側平移 offset 像素（負值往左）。
 * 每個點用前後兩點的方向決定法線，轉角處不會斷開。
 */
export function offsetPath(path: LatLng[], offset: number, zoom: number): LatLng[] {
  if (!offset || path.length < 2) return path
  const px = path.map((ll) => toPixel(ll, zoom))
  return px.map((p, i) => {
    const a = px[Math.max(0, i - 1)]
    const b = px[Math.min(px.length - 1, i + 1)]
    let dx = b.x - a.x
    let dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    dx /= len
    dy /= len
    // 螢幕座標 y 軸向下，(−dy, dx) 是行進方向的右側
    return fromPixel({ x: p.x - dy * offset, y: p.y + dx * offset }, zoom)
  })
}

/** 兩點的地表距離（公尺） */
export function metersBetween([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLng = (lng2 - lng1) * rad
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_R * Math.asin(Math.sqrt(h))
}

/** 以公尺為半徑的圓，回傳一圈座標（首尾相同），給虛線圓框用 */
export function circlePath([lat, lng]: LatLng, radius: number, steps = 72): LatLng[] {
  const dLat = (radius / EARTH_R) * (180 / Math.PI)
  const dLng = dLat / Math.cos((lat * Math.PI) / 180)
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * 2 * Math.PI
    return [lat + dLat * Math.cos(t), lng + dLng * Math.sin(t)] as LatLng
  })
}

/** 往北移動幾公尺後的座標（成群圈的名稱標在圓的上緣） */
export function northOf([lat, lng]: LatLng, meters: number): LatLng {
  return [lat + (meters / EARTH_R) * (180 / Math.PI), lng]
}
