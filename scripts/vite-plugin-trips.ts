import { resolve, sep } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import { buildIndex, loadTrips, TRIPS_DIR, type LoadedTrip, type TripsIndex } from './lib/trips.ts'

type Options = {
  env: Record<string, string | undefined>
  /** 正式環境：缺少密碼 hash 時建置失敗 */
  requireHashes: boolean
}

function load(
  root: string,
  options: Options,
): { trips: LoadedTrip[]; index: TripsIndex; warnings: string[] } {
  const { trips, errors } = loadTrips(root)
  const built = buildIndex(trips, options.env, options.requireHashes)
  const all = [...errors, ...built.errors]
  if (all.length) {
    throw new Error(`行程資料有 ${all.length} 個錯誤：\n  ${all.join('\n  ')}`)
  }
  return { trips, index: built.index, warnings: built.warnings }
}

/**
 * 讀取 trips/<slug>/trip.json，驗證後輸出成 /trips/<slug>.json 和 /trips/index.json。
 * 開發時每次請求都重新讀檔，改 JSON 後瀏覽器會自動重新整理。
 */
export function tripsPlugin(options: Options): Plugin {
  let config: ResolvedConfig

  return {
    name: 'trip-trail:trips',

    configResolved(resolved) {
      config = resolved
    },

    configureServer(server) {
      const tripsDir = resolve(config.root, TRIPS_DIR)
      server.watcher.add(tripsDir)
      server.watcher.on('all', (_event, file) => {
        if (resolve(file).startsWith(tripsDir + sep)) server.ws.send({ type: 'full-reload' })
      })

      server.middlewares.use('/trips/', (req, res, next) => {
        const match = /^\/([a-z0-9-]+)\.json(?:\?.*)?$/.exec(req.url ?? '')
        if (!match) return next()
        try {
          const { trips, index, warnings } = load(config.root, options)
          warnings.forEach((w) => config.logger.warn(`[trips] ${w}`, { timestamp: true }))
          const body = match[1] === 'index' ? index : trips.find((t) => t.slug === match[1])?.trip
          if (!body) return next()
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(body))
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          config.logger.error(`[trips] ${message}`, { timestamp: true })
          res.statusCode = 500
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(message)
        }
      })
    },

    generateBundle() {
      const { trips, index, warnings } = load(config.root, options)
      warnings.forEach((w) => this.warn(w))
      for (const { slug, trip } of trips) {
        this.emitFile({
          type: 'asset',
          fileName: `trips/${slug}.json`,
          source: JSON.stringify(trip),
        })
      }
      this.emitFile({ type: 'asset', fileName: 'trips/index.json', source: JSON.stringify(index) })
    },
  }
}
