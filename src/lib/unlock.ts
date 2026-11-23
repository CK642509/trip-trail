/**
 * 記住這台裝置解鎖過哪些旅程。存的是密碼 hash（不是原文），
 * 換密碼後 hash 不同，就會要求重新輸入。
 */
export type RememberedTrip = {
  slug: string
  hash?: string | null
  title?: string
  start?: string
  end?: string
}

const STORAGE_KEY = 'trip-trail:unlocked'

function readAll(): Record<string, RememberedTrip> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, RememberedTrip>
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, RememberedTrip>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // 無痕模式或儲存空間不足：這次可以用，下次要重新輸入密碼
  }
}

export function isUnlocked(slug: string, expectedHash: string | null): boolean {
  if (expectedHash === null) return true
  return readAll()[slug]?.hash === expectedHash
}

export function remember(trip: RememberedTrip) {
  const all = readAll()
  all[trip.slug] = { ...all[trip.slug], ...trip }
  writeAll(all)
}

export function forget(slug: string) {
  const all = readAll()
  delete all[slug]
  writeAll(all)
}

export function listRemembered(): RememberedTrip[] {
  return Object.values(readAll()).sort((a, b) => (b.start ?? '').localeCompare(a.start ?? ''))
}
