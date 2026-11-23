import type { Trip } from './schema.ts'
import type { TripsIndex } from './tripsIndex.ts'

export class LoadError extends Error {
  readonly kind: 'notFound' | 'network'

  constructor(message: string, kind: 'notFound' | 'network') {
    super(message)
    this.kind = kind
  }
}

async function getResponse(url: string): Promise<Response> {
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new LoadError('無法連線，請確認網路後再試一次', 'network')
  }
  if (res.status === 404) throw new LoadError('找不到資料', 'notFound')
  if (!res.ok) throw new LoadError(`載入失敗（${res.status}）`, 'network')
  return res
}

export const fetchIndex = async () =>
  (await (await getResponse('/trips/index.json')).json()) as TripsIndex

export type LoadedTrip = {
  trip: Trip
  /** 伺服器產生這份資料的時間；離線時 Service Worker 給的是快取，時間會比較舊 */
  updatedAt: Date | null
}

/** 資料在建置時已經驗證過，這裡直接使用。 */
export async function fetchTrip(slug: string): Promise<LoadedTrip> {
  const res = await getResponse(`/trips/${slug}.json`)
  const date = Date.parse(res.headers.get('date') ?? '')
  return { trip: (await res.json()) as Trip, updatedAt: Number.isNaN(date) ? null : new Date(date) }
}
