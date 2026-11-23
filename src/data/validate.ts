import { z } from 'zod'
import { TripSchema, type Trip } from './schema.ts'

export type ValidateResult = { ok: true; trip: Trip } | { ok: false; errors: string[] }

function formatPath(path: PropertyKey[]): string {
  return path.reduce<string>((out, key) => {
    if (typeof key === 'number') return `${out}[${key}]`
    return out ? `${out}.${String(key)}` : String(key)
  }, '')
}

/**
 * 驗證一趟旅程的資料：先檢查格式，再檢查 id 參照、日期範圍等跨欄位規則。
 * 錯誤訊息帶有欄位路徑，例如 `days[1].legs[3].to: 找不到 stop "kyo3"`。
 */
export function validateTrip(raw: unknown, options: { slug?: string } = {}): ValidateResult {
  const parsed = TripSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (issue) => `${formatPath(issue.path) || '(根)'}: ${issue.message}`,
      ),
    }
  }

  const trip = parsed.data
  const errors: string[] = []

  if (options.slug !== undefined && trip.slug !== options.slug) {
    errors.push(`slug: "${trip.slug}" 和資料夾名稱 "${options.slug}" 不一致`)
  }
  if (trip.start > trip.end) {
    errors.push(`start: 開始日 ${trip.start} 晚於結束日 ${trip.end}`)
  }

  const dayIds = new Set<number>()
  const dates = new Set<string>()
  trip.days.forEach((day, d) => {
    const at = `days[${d}]`
    if (dayIds.has(day.id)) errors.push(`${at}.id: 重複的 day id ${day.id}`)
    dayIds.add(day.id)
    if (dates.has(day.date)) errors.push(`${at}.date: 重複的日期 ${day.date}`)
    dates.add(day.date)
    if (day.date < trip.start || day.date > trip.end) {
      errors.push(`${at}.date: ${day.date} 不在 ${trip.start}～${trip.end} 之間`)
    }

    const stopIds = new Set<string>()
    day.stops.forEach((stop, s) => {
      if (stopIds.has(stop.id)) errors.push(`${at}.stops[${s}].id: 同一天內重複的 id "${stop.id}"`)
      stopIds.add(stop.id)
    })

    day.legs.forEach((leg, l) => {
      for (const end of ['from', 'to'] as const) {
        if (!stopIds.has(leg[end])) {
          errors.push(`${at}.legs[${l}].${end}: 找不到 stop "${leg[end]}"`)
        }
      }
    })

    day.groups.forEach((group, g) => {
      group.stops.forEach((id, i) => {
        if (!stopIds.has(id)) errors.push(`${at}.groups[${g}].stops[${i}]: 找不到 stop "${id}"`)
      })
    })
  })

  return errors.length ? { ok: false, errors } : { ok: true, trip }
}

/** 由 Zod schema 產生 JSON Schema，給編輯器自動完成與檢查用。 */
export function tripJsonSchema(): unknown {
  return z.toJSONSchema(TripSchema, { io: 'input' })
}
