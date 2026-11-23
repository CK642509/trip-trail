import type { Trip } from '../data/schema.ts'

/** 快取名稱，和 vite.config.ts 裡 Service Worker 的設定一致 */
export const TRIP_CACHE = 'trip-data'
export const PHOTO_CACHE = 'trip-photos'

export const cacheSupported = () => typeof caches !== 'undefined'

/** 這趟旅程所有照片的網址（大圖和縮圖，不重複） */
export function photoUrls(trip: Trip): string[] {
  const urls = new Set<string>()
  for (const day of trip.days) {
    for (const stop of day.stops) {
      for (const p of stop.photos ?? []) {
        urls.add(p.src)
        if (p.thumb) urls.add(p.thumb)
      }
    }
  }
  return [...urls]
}

/** 已經存在這支手機上的照片數量 */
export async function countCached(urls: string[]): Promise<number> {
  if (!cacheSupported() || urls.length === 0) return 0
  const cache = await caches.open(PHOTO_CACHE)
  const hits = await Promise.all(urls.map((u) => cache.match(u)))
  return hits.filter(Boolean).length
}

/** 把行程資料存進快取（Service Worker 平常也會存，這裡是為了第一次打開、還沒被它接管的時候） */
export async function saveTripData(slug: string, signal?: AbortSignal) {
  const data = await caches.open(TRIP_CACHE)
  await Promise.all(
    ['/trips/index.json', `/trips/${slug}.json`].map(async (url) => {
      const res = await fetch(url, { cache: 'no-store', signal })
      if (res.ok) await data.put(url, res)
    }),
  )
}

export type Progress = { done: number; total: number; failed: number }

/**
 * 把行程資料和全部照片存進快取，離線時 Service Worker 會從這裡拿。
 * 已經存過的照片會跳過；一次同時下載 4 張。
 */
export async function downloadForOffline(
  slug: string,
  urls: string[],
  onProgress: (p: Progress) => void,
  signal?: AbortSignal,
): Promise<Progress> {
  // 請瀏覽器不要在空間不足時自動清掉（不一定會被允許，失敗也沒關係）
  void navigator.storage?.persist?.().catch(() => {})

  await saveTripData(slug, signal)

  const cache = await caches.open(PHOTO_CACHE)
  const progress: Progress = { done: 0, total: urls.length, failed: 0 }
  onProgress({ ...progress })

  const queue = [...urls]
  async function worker() {
    for (let url = queue.shift(); url; url = queue.shift()) {
      if (signal?.aborted) return
      try {
        if (!(await cache.match(url))) {
          // 一定要用 CORS 模式：opaque 回應在 Chrome 會被算成每張 7MB 的儲存空間
          const res = await fetch(url, { mode: 'cors', signal })
          if (!res.ok) throw new Error(String(res.status))
          await cache.put(url, res)
        }
        progress.done++
      } catch {
        if (signal?.aborted) return
        progress.failed++
      }
      onProgress({ ...progress })
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  return progress
}

/** 資料更新時間：顯示「11/23 14:05」，不同年時加上年份 */
export function formatUpdated(date: Date, now = new Date()): string {
  const hm = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
  const md = `${date.getMonth() + 1}/${date.getDate()}`
  return date.getFullYear() === now.getFullYear()
    ? `${md} ${hm}`
    : `${date.getFullYear()}/${md} ${hm}`
}

/** 資料超過這麼久沒更新，就表示目前看到的是之前存下來的版本 */
export const STALE_MS = 10 * 60 * 1000
