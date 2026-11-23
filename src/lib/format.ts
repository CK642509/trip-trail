const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function parts(iso: string): { y: number; m: number; d: number; w: string } {
  const [y, m, d] = iso.split('-').map(Number)
  // 用 UTC 計算星期，不受裝置時區影響
  const w = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return { y, m, d, w }
}

/** 2026-12-02 → 12/2 (三) */
export function formatDay(iso: string): string {
  const { m, d, w } = parts(iso)
  return `${m}/${d} (${w})`
}

/** 2026-12-02 → { md: '12/2', weekday: '三' } */
export function dayParts(iso: string): { md: string; weekday: string } {
  const { m, d, w } = parts(iso)
  return { md: `${m}/${d}`, weekday: w }
}

/** 2026-12-02, 2026-12-08 → 2026/12/2 – 12/8；跨年時兩邊都寫年份 */
export function formatRange(start: string, end: string): string {
  const a = parts(start)
  const b = parts(end)
  const right = a.y === b.y ? `${b.m}/${b.d}` : `${b.y}/${b.m}/${b.d}`
  return `${a.y}/${a.m}/${a.d} – ${right}`
}

/** 旅程天數與夜數，例如「7 天 6 夜」 */
export function formatLength(start: string, end: string): string {
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1
  return days > 1 ? `${days} 天 ${days - 1} 夜` : '1 天'
}
