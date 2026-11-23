import type { Trip } from './schema.ts'
import type { TripsIndex } from './tripsIndex.ts'

export class LoadError extends Error {
  readonly kind: 'notFound' | 'network'

  constructor(message: string, kind: 'notFound' | 'network') {
    super(message)
    this.kind = kind
  }
}

async function getJson<T>(url: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new LoadError('無法連線，請確認網路後再試一次', 'network')
  }
  if (res.status === 404) throw new LoadError('找不到資料', 'notFound')
  if (!res.ok) throw new LoadError(`載入失敗（${res.status}）`, 'network')
  return (await res.json()) as T
}

export const fetchIndex = () => getJson<TripsIndex>('/trips/index.json')

/** 資料在建置時已經驗證過，這裡直接使用。 */
export const fetchTrip = (slug: string) => getJson<Trip>(`/trips/${slug}.json`)
