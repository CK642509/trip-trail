// 照片上傳：npm run photos -- <slug> <照片或資料夾>... [--dry]
//
// 把照片縮成大圖（長邊 2048px）和縮圖（長邊 400px）、轉成 WebP，上傳到 Cloudflare R2，
// 最後印出可以直接貼進 trip.json 的 "photos" 片段（說明文字 caption 再自己補）。
// 會自動依 EXIF 轉正，並移除 EXIF（包含 GPS 位置）。
//
// 需要的環境變數（寫在 .env，不要提交）：
//   R2_ACCOUNT_ID、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY、R2_BUCKET、R2_PUBLIC_URL
// --dry：不上傳，只把轉好的檔案存到 photos-out/ 看看效果。
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { AwsClient } from 'aws4fetch'
import sharp from 'sharp'
import {
  HEIC_EXTS,
  IMAGE_EXTS,
  joinUrl,
  LARGE_EDGE,
  photoKeys,
  snippet,
  THUMB_EDGE,
  type PhotoEntry,
} from './lib/photos.ts'

const OUT_DIR = 'photos-out'

try {
  process.loadEnvFile('.env')
} catch {
  // 沒有 .env 時只能用 --dry
}

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const [slug, ...inputs] = args.filter((a) => a !== '--dry')

if (!slug || inputs.length === 0 || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('用法：npm run photos -- <slug> <照片或資料夾>... [--dry]')
  console.error('例如：npm run photos -- kansai-2026 ~/Pictures/day2 --dry')
  process.exit(1)
}

const env = (name: string) => process.env[name]?.trim() ?? ''
const publicUrl = env('R2_PUBLIC_URL') || 'https://example.r2.dev'

let client: AwsClient | null = null
let endpoint = ''
if (!dry) {
  const missing = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
    'R2_PUBLIC_URL',
  ].filter((n) => !env(n))
  if (missing.length) {
    console.error(`.env 缺少：${missing.join('、')}（或加上 --dry 只在本機轉檔）`)
    process.exit(1)
  }
  client = new AwsClient({
    accessKeyId: env('R2_ACCESS_KEY_ID'),
    secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    service: 's3',
    region: 'auto',
  })
  endpoint = `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${env('R2_BUCKET')}`
}

/** 展開資料夾（不含子資料夾），依檔名排序 */
async function collect(paths: string[]): Promise<string[]> {
  const files: string[] = []
  for (const p of paths) {
    if ((await stat(p)).isDirectory()) {
      const names = (await readdir(p)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
      files.push(
        ...names.map((n) => join(p, n)).filter((f) => !/^\./.test(f.split(/[\\/]/).pop()!)),
      )
    } else {
      files.push(p)
    }
  }
  return files
}

async function upload(key: string, body: Buffer) {
  const url = `${endpoint}/${key}`
  // 已經上傳過（內容雜湊相同）就跳過
  const head = await client!.fetch(url, { method: 'HEAD' })
  if (head.ok) return 'skip'
  const res = await client!.fetch(url, {
    method: 'PUT',
    body: new Uint8Array(body),
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
  if (!res.ok) throw new Error(`上傳失敗 ${res.status}：${(await res.text()).slice(0, 200)}`)
  return 'ok'
}

const files = await collect(inputs)
const entries: PhotoEntry[] = []
let failed = 0

for (const file of files) {
  const ext = extname(file).toLowerCase()
  if (HEIC_EXTS.has(ext)) {
    console.warn(`略過 ${file}：HEIC 格式無法處理，請先轉成 JPEG`)
    console.warn('  （iPhone：設定 → 相機 → 格式 → 最相容；或分享時選「選項 → 最相容」）')
    failed++
    continue
  }
  if (!IMAGE_EXTS.has(ext)) continue

  try {
    const original = await readFile(file)
    const hash = createHash('sha256').update(original).digest('hex')
    const keys = photoKeys(slug, file, hash)
    // rotate() 依 EXIF 轉正；sharp 預設不保留 EXIF，GPS 位置不會外流
    const resize = (edge: number, quality: number) =>
      sharp(original)
        .rotate()
        .resize(edge, edge, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer()
    const [large, thumb] = await Promise.all([resize(LARGE_EDGE, 80), resize(THUMB_EDGE, 72)])
    const kb = (b: Buffer) => `${Math.round(b.length / 1024)} KB`

    if (dry) {
      for (const [key, body] of [
        [keys.large, large],
        [keys.thumb, thumb],
      ] as const) {
        const out = join(OUT_DIR, key)
        await mkdir(dirname(out), { recursive: true })
        await writeFile(out, body)
      }
      console.error(`✓ ${file} → ${keys.large}（${kb(large)}，縮圖 ${kb(thumb)}）`)
    } else {
      const results = [await upload(keys.large, large), await upload(keys.thumb, thumb)]
      const note = results.every((r) => r === 'skip') ? '，之前已上傳' : ''
      console.error(`✓ ${file} → ${keys.large}（${kb(large)}，縮圖 ${kb(thumb)}${note}）`)
    }
    entries.push({ src: joinUrl(publicUrl, keys.large), thumb: joinUrl(publicUrl, keys.thumb) })
  } catch (err) {
    failed++
    console.error(`✗ ${file}：${err instanceof Error ? err.message : String(err)}`)
  }
}

if (entries.length === 0) {
  console.error('沒有處理任何照片。支援 JPEG、PNG、WebP、AVIF、TIFF。')
  process.exit(1)
}

console.error(
  dry
    ? `\n已轉好 ${entries.length} 張，存在 ${OUT_DIR}/（沒有上傳）。`
    : `\n已上傳 ${entries.length} 張${failed ? `，${failed} 張失敗` : ''}。把下面這段貼到 trip.json 對應景點裡，需要的話再加上 "caption":`,
)
console.log(snippet(entries))
if (failed) process.exitCode = 1
