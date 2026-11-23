import { MODES } from '../data/modes.ts'
import type { TravelMode } from '../data/schema.ts'

/**
 * 每段交通在地圖上的線型。Google 地圖的 Polyline 沒有 dash 參數，
 * 虛線和點線都是用重複的符號（icons）組出來；箭頭也是一個符號，放在線段中間。
 * 只用型別、不碰 google.maps 執行環境，方便測試。
 */
export type PolylineOptions = Omit<google.maps.PolylineOptions, 'path' | 'map'>

/** 線寬：鐵道最粗，未定最細（沿用原型） */
const WEIGHT: Record<TravelMode, number> = {
  rail: 5,
  subway: 5,
  bus: 4,
  taxi: 4,
  flight: 3,
  boat: 4,
  walk: 3,
  open: 2,
}

// 符號座標：y 軸負方向 = 前進方向
const DASH = 'M 0,-1 0,1'
const DOT = 'M 0,-1 A 1,1 0 1 1 0,1 A 1,1 0 1 1 0,-1 Z'
const ARROW = 'M 0,-2.6 L 2.4,1.8 L 0,0.7 L -2.4,1.8 Z'

export type LegLines = {
  /** 鐵道底下的白邊，讓線在地圖上更清楚 */
  casing?: PolylineOptions
  line: PolylineOptions
}

export function legLines(
  mode: TravelMode,
  color: string,
  opts: { optional?: boolean; zIndex?: number } = {},
): LegLines {
  const weight = WEIGHT[mode]
  const style = MODES[mode].line
  const opacity = mode === 'open' ? 0.55 : opts.optional ? 0.6 : 0.95
  const zIndex = (opts.zIndex ?? 0) * 10 + (opts.optional ? 0 : 5)
  // 可選的鐵道改成長虛線，和一定會走的路線區分
  const pattern = style === 'solid' && opts.optional ? 'dashed' : style

  const arrow: google.maps.IconSequence = {
    icon: {
      path: ARROW,
      scale: weight <= 3 ? 1.8 : 2,
      fillColor: color,
      fillOpacity: opacity,
      strokeColor: '#ffffff',
      strokeOpacity: opacity,
      strokeWeight: 1.4,
    },
    offset: '50%',
  }

  const base: PolylineOptions = {
    strokeColor: color,
    strokeWeight: weight,
    clickable: false,
    zIndex: zIndex + 2,
  }

  let line: PolylineOptions
  if (pattern === 'solid') {
    line = { ...base, strokeOpacity: opacity, icons: [arrow] }
  } else if (pattern === 'dotted') {
    line = {
      ...base,
      strokeOpacity: 0,
      icons: [
        {
          icon: {
            path: DOT,
            scale: weight / 2,
            fillColor: color,
            fillOpacity: opacity,
            strokeOpacity: 0,
          },
          offset: '0',
          repeat: `${weight * 3}px`,
        },
        arrow,
      ],
    }
  } else {
    // dashed／faint：線段長度與間隔依線寬調整
    const dash = pattern === 'faint' ? 4 : weight * 2.4
    const gap = pattern === 'faint' ? 8 : weight * 1.8
    line = {
      ...base,
      strokeOpacity: 0,
      icons: [
        {
          icon: {
            path: DASH,
            scale: dash / 2,
            strokeColor: color,
            strokeOpacity: opacity,
            strokeWeight: weight,
          },
          offset: '0',
          repeat: `${dash + gap}px`,
        },
        arrow,
      ],
    }
  }

  const casing: PolylineOptions | undefined =
    (mode === 'rail' || mode === 'subway') && pattern === 'solid'
      ? {
          strokeColor: '#ffffff',
          strokeOpacity: 0.9,
          strokeWeight: weight + 3,
          clickable: false,
          zIndex,
        }
      : undefined

  return casing ? { casing, line } : { line }
}
