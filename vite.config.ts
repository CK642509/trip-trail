import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { tripsPlugin } from './scripts/vite-plugin-trips.ts'

const PAPER = '#f4eee2'
// 快取名稱：src/lib/offline.ts 也會直接讀寫，兩邊要一致
const TRIP_CACHE = 'trip-data'
const PHOTO_CACHE = 'trip-photos'

export default defineConfig(({ mode }) => {
  // 第三個參數 '' 表示讀取所有變數（含非 VITE_ 開頭的 TRIP_*_HASH），只在建置時使用
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tripsPlugin({ env, requireHashes: env.VERCEL_ENV === 'production' }),
      VitePWA({
        // 新版背景下載好，下次打開時生效；不會在使用中突然重新整理
        registerType: 'autoUpdate',
        injectRegister: 'script-defer',
        manifest: {
          name: '旅程手帖',
          short_name: '旅程手帖',
          description: '家人一起看的旅遊行程地圖',
          lang: 'zh-Hant-TW',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: PAPER,
          theme_color: PAPER,
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // App shell：建置時預先快取（行程 JSON 不放這裡，改用執行時快取）
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/trips\//],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              // 行程資料：有網路就拿最新的，離線時用上次的
              urlPattern: ({ sameOrigin, url }) =>
                sameOrigin && /^\/trips\/[a-z0-9-]+\.json$/.test(url.pathname),
              handler: 'NetworkFirst',
              options: {
                cacheName: TRIP_CACHE,
                networkTimeoutSeconds: 6,
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              // 照片：檔名含內容雜湊、不會變，看過就存著；只存 CORS 回應（opaque 會占大量配額）
              urlPattern: ({ url }) => url.hostname.endsWith('.r2.dev'),
              handler: 'CacheFirst',
              options: {
                cacheName: PHOTO_CACHE,
                cacheableResponse: { statuses: [200] },
                expiration: { maxEntries: 2000, purgeOnQuotaError: true },
              },
            },
            {
              // 標題字型
              urlPattern: ({ url }) =>
                url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts',
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 30 },
              },
            },
            // Google 地圖的程式和圖磚不快取（條款不允許），離線時地圖區塊會顯示提示
          ],
        },
      }),
    ],
  }
})
