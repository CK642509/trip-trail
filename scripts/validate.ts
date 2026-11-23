// 驗證所有行程資料：npm run validate
import { loadTrips } from './lib/trips.ts'

const { trips, errors } = loadTrips(process.cwd())
if (errors.length) {
  console.error(`✗ 行程資料有 ${errors.length} 個錯誤：`)
  errors.forEach((e) => console.error(`  ${e}`))
  process.exit(1)
}
for (const { slug, trip } of trips) {
  const stops = trip.days.reduce((n, d) => n + d.stops.length, 0)
  const legs = trip.days.reduce((n, d) => n + d.legs.length, 0)
  console.log(`✓ ${slug}：${trip.days.length} 天、${stops} 個景點、${legs} 段交通`)
}
