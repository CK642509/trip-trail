/** /trips/index.json 的格式：slug → 密碼 hash（null 表示不需要密碼）。 */
export type TripsIndex = { trips: { slug: string; hash: string | null }[] }
