import { useSyncExternalStore } from 'react'
import type { Day, Trip } from '../data/schema.ts'

/** 旅程當地的日期（YYYY-MM-DD）和從午夜起算的分鐘數 */
export type TripClock = { date: string; minutes: number }

const FIELDS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
}

/** 用旅程的時區看現在幾點（手機設定在台灣時間也一樣準）；時區寫錯時改用手機的時區 */
export function tripClock(timezone: string, now: Date = new Date()): TripClock {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-US', { ...FIELDS, timeZone: timezone }).formatToParts(now)
  } catch {
    parts = new Intl.DateTimeFormat('en-US', FIELDS).formatToParts(now)
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
  const minutes = (Number(get('hour')) % 24) * 60 + Number(get('minute'))
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes }
}

/** 今天是旅程的哪一天；不在旅程期間回傳 null */
export function todayDay(trip: Trip, clock: TripClock): Day | null {
  return trip.days.find((d) => d.date === clock.date) ?? null
}

/** 「上午」「下午」這類大概的時間，換算成大約幾點開始 */
const ROUGH: [RegExp, number][] = [
  [/^(清晨|早上|早晨)/, 7 * 60],
  [/^上午/, 9 * 60],
  [/^中午/, 12 * 60],
  [/^下午/, 13 * 60],
  [/^傍晚/, 17 * 60],
  [/^(晚上|晚間)/, 18 * 60],
  [/^(深夜|半夜)/, 22 * 60],
]

const EXACT = /^(\d{1,2}):(\d{2})/

/**
 * 從 time 欄位抓開始時間（分鐘）：開頭的 HH:MM，或「上午」「下午」等大概的時間。
 * 「13:20–14:40」→ 13:20；「上午–15:30」→ 上午；抓不到回傳 null。
 */
export function startMinutes(time: string | undefined): number | null {
  if (!time) return null
  const t = time.trim()
  const m = EXACT.exec(t)
  if (m) {
    const h = Number(m[1])
    const min = Number(m[2])
    return h < 24 && min < 60 ? h * 60 + min : null
  }
  for (const [re, v] of ROUGH) if (re.test(t)) return v
  return null
}

/**
 * 下一站：最後一個「開始時間已經到了」的景點的下一個。
 * 還沒到任何景點的時間 → 第一站；最後一站的時間也過了 → 沒有下一站。
 *
 * 這天要有至少一個寫了 HH:MM 的景點才標示。「上午」「下午」只當分界：
 * 連續好幾站都寫「下午」時，只有第一站算 13:00 開始，其他站不知道幾點，
 * 免得一到下午就跳過整段、直接標到最後一站。
 */
export function nextStopId(day: Day, minutes: number): string | null {
  if (!day.stops.some((s) => s.time && EXACT.test(s.time.trim()))) return null
  const starts = day.stops.map((s, i) => {
    const v = startMinutes(s.time)
    const prev = i > 0 ? startMinutes(day.stops[i - 1].time) : null
    const rough = !EXACT.test(s.time?.trim() ?? '')
    return rough && v !== null && v === prev ? null : v
  })
  let current = -1
  starts.forEach((s, i) => {
    if (s !== null && s <= minutes) current = i
  })
  return day.stops[current + 1]?.id ?? null
}

/** 每 30 秒、以及切回這個 App 時重新看一次時間 */
function subscribeClock(cb: () => void) {
  const id = setInterval(cb, 30_000)
  document.addEventListener('visibilitychange', cb)
  return () => {
    clearInterval(id)
    document.removeEventListener('visibilitychange', cb)
  }
}

/** 旅程當地現在的日期和時間，到下一分鐘會自動更新 */
export function useTripClock(timezone: string): TripClock {
  const key = useSyncExternalStore(subscribeClock, () => {
    const c = tripClock(timezone)
    return `${c.date} ${c.minutes}`
  })
  const [date, minutes] = key.split(' ')
  return { date, minutes: Number(minutes) }
}
