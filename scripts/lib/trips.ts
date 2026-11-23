import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Trip } from '../../src/data/schema.ts'
import { validateTrip } from '../../src/data/validate.ts'
import { tripHashEnvName } from '../../src/data/password.ts'
import type { TripsIndex } from '../../src/data/tripsIndex.ts'

export const TRIPS_DIR = 'trips'

export type LoadedTrip = { slug: string; trip: Trip }
export type LoadResult = { trips: LoadedTrip[]; errors: string[] }

/** 讀取並驗證 trips/<slug>/trip.json。錯誤訊息前面會加上檔案路徑。 */
export function loadTrips(root: string): LoadResult {
  const dir = join(root, TRIPS_DIR)
  const trips: LoadedTrip[] = []
  const errors: string[] = []
  if (!existsSync(dir)) return { trips, errors }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const slug = entry.name
    const file = `${TRIPS_DIR}/${slug}/trip.json`
    let raw: unknown
    try {
      raw = JSON.parse(readFileSync(join(root, file), 'utf8'))
    } catch (err) {
      errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }
    const result = validateTrip(raw, { slug })
    if (result.ok) trips.push({ slug, trip: result.trip })
    else errors.push(...result.errors.map((e) => `${file} ${e}`))
  }
  return { trips, errors }
}

/**
 * 依環境變數產生 slug → 密碼 hash 對照表。
 * `requireHashes` 為 true 時（正式環境），缺少 hash 會列為錯誤，避免不小心公開。
 */
export function buildIndex(
  trips: LoadedTrip[],
  env: Record<string, string | undefined>,
  requireHashes: boolean,
): { index: TripsIndex; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const index: TripsIndex = {
    trips: trips.map(({ slug }) => {
      const name = tripHashEnvName(slug)
      const hash = env[name]?.trim().toLowerCase() || null
      if (hash && !/^[0-9a-f]{64}$/.test(hash)) {
        errors.push(`${name} 不是 64 字元的 SHA-256 hex，請用 npm run hash-password 產生`)
      } else if (!hash) {
        const msg = `${name} 未設定，旅程 "${slug}" 不需要密碼`
        if (requireHashes) errors.push(`${msg}（正式環境必須設定）`)
        else warnings.push(msg)
      }
      return { slug, hash }
    }),
  }
  return { index, errors, warnings }
}
