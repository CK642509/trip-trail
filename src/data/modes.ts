import type { TravelMode } from './schema.ts'

/** 線型：行程列表的連接線和地圖路線共用同一套樣式。 */
export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'faint'

export type ModeInfo = {
  label: string
  icon: string
  line: LineStyle
  /** Google 地圖導航的 travelmode；null 表示不提供導航 */
  travelmode: 'transit' | 'walking' | 'driving' | null
}

export const MODES: Record<TravelMode, ModeInfo> = {
  rail: { label: '鐵道', icon: '🚆', line: 'solid', travelmode: 'transit' },
  subway: { label: '地鐵', icon: '🚇', line: 'solid', travelmode: 'transit' },
  bus: { label: '巴士', icon: '🚌', line: 'dashed', travelmode: 'transit' },
  boat: { label: '船', icon: '⛴️', line: 'dotted', travelmode: null },
  walk: { label: '步行', icon: '🚶', line: 'dotted', travelmode: 'walking' },
  taxi: { label: '計程車', icon: '🚕', line: 'dashed', travelmode: 'driving' },
  flight: { label: '飛機', icon: '✈️', line: 'dashed', travelmode: null },
  open: { label: '交通方式未定', icon: '・', line: 'faint', travelmode: 'transit' },
}

/** 沒有指定顏色時的每日色盤（沿用原型的 7 色） */
export const DAY_COLORS = [
  '#2457c5',
  '#c8312b',
  '#c47a00',
  '#18865a',
  '#6d3fc4',
  '#c42a7a',
  '#0a7d93',
]

export function dayColor(color: string | undefined, index: number): string {
  return color ?? DAY_COLORS[index % DAY_COLORS.length]
}
