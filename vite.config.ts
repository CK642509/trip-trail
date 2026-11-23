import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { tripsPlugin } from './scripts/vite-plugin-trips.ts'

export default defineConfig(({ mode }) => {
  // 第三個參數 '' 表示讀取所有變數（含非 VITE_ 開頭的 TRIP_*_HASH），只在建置時使用
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tripsPlugin({ env, requireHashes: env.VERCEL_ENV === 'production' })],
  }
})
