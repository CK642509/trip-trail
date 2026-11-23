// 一次性轉換：原型資料（schemaVersion 1）→ trips/kansai-2026/trip.json（schemaVersion 2）
// 用法：node scripts/migrate-v1.ts
// 行程內容以 legacy/kansai-autumn-map/docs/itinerary.md 為準，下面的 FIXES 是兩份資料不一致之處。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { validateTrip } from '../src/data/validate.ts'

const LEGACY = 'legacy/kansai-autumn-map'
const SLUG = 'kansai-2026'

type V1Stop = {
  id: string
  name: string
  ll: [number, number]
  time?: string
  note?: string
  optional?: boolean
}
type V1Leg = {
  from: string
  to: string
  mode: string
  label?: string
  path?: [number, number][] | null
  optional?: boolean
}
type V1Day = {
  id: number
  title: string
  color: string
  stops: V1Stop[]
  legs: V1Leg[]
  groups?: { name: string; stops: string[] }[]
}
type V1 = { trip: { title: string; start: string; end: string; timezone: string }; days: V1Day[] }

/** JSON 與 itinerary.md 不一致的地方，以 md 為準。 */
const FIXES: { day: number; apply: (day: V1Day) => void }[] = [
  {
    // md：特急橋立 1 號 08:38 → 10:39
    day: 4,
    apply(day) {
      day.stops.find((s) => s.id === 'amano')!.time = '10:39'
      const leg = day.legs.find((l) => l.from === 'kyo' && l.to === 'amano')!
      leg.label = leg.label!.replace('10:40', '10:39')
    },
  },
  {
    // 「（已修正）」是編輯過程的註記，不是給旅客看的
    day: 7,
    apply(day) {
      for (const leg of day.legs) leg.label = leg.label?.replace('（已修正）', '')
    },
  },
]

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** 取出 itinerary.md 從「## 航班與住宿」到「## Day 1」之間的內容，當成旅程總覽。 */
function extractInfo(md: string): string {
  const start = md.indexOf('## 航班與住宿')
  const end = md.indexOf('## Day 1')
  if (start < 0 || end < 0) throw new Error('itinerary.md 找不到「航班與住宿」或「Day 1」段落')
  return md.slice(start, end).replaceAll('（已修正）', '').trim()
}

const v1 = JSON.parse(readFileSync(`${LEGACY}/data/itinerary.json`, 'utf8')) as V1
const md = readFileSync(`${LEGACY}/docs/itinerary.md`, 'utf8')

for (const fix of FIXES) fix.apply(v1.days.find((d) => d.id === fix.day)!)

const trip = {
  $schema: '../../schema/trip.schema.json',
  schemaVersion: 2,
  slug: SLUG,
  title: v1.trip.title,
  start: v1.trip.start,
  end: v1.trip.end,
  timezone: v1.trip.timezone,
  info: extractInfo(md).split('\n'),
  days: v1.days.map((day, i) => ({
    id: day.id,
    date: addDays(v1.trip.start, i),
    title: day.title,
    color: day.color,
    stops: day.stops.map((s) => ({
      id: s.id,
      name: s.name,
      ll: s.ll,
      ...(s.time && { time: s.time }),
      ...(s.note && { note: s.note }),
      ...(s.optional && { optional: true }),
    })),
    legs: day.legs.map((l) => ({
      from: l.from,
      to: l.to,
      mode: l.mode,
      ...(l.label && { label: l.label }),
      ...(l.path && { path: l.path }),
      ...(l.optional && { optional: true }),
    })),
    ...(day.groups?.length && { groups: day.groups }),
  })),
}

const result = validateTrip(trip, { slug: SLUG })
if (!result.ok) {
  console.error(result.errors.join('\n'))
  process.exit(1)
}

mkdirSync(`trips/${SLUG}`, { recursive: true })
writeFileSync(`trips/${SLUG}/trip.json`, JSON.stringify(trip, null, 2) + '\n')
console.log(`✓ 已寫入 trips/${SLUG}/trip.json`)
