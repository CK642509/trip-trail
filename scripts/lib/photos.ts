import { extname, basename } from 'node:path'

/** 大圖和縮圖的長邊（像素） */
export const LARGE_EDGE = 2048
export const THUMB_EDGE = 400

export const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'])

/** iPhone 預設的 HEIC 格式 sharp 讀不了，要先轉成 JPEG */
export const HEIC_EXTS = new Set(['.heic', '.heif'])

/** 檔名轉成網址安全的名稱：IMG 1234 (2).JPG → img-1234-2 */
export function safeName(file: string): string {
  const name = basename(file, extname(file))
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')
  return name || 'photo'
}

/**
 * R2 上的路徑：<slug>/<名稱>-<內容雜湊>.webp。
 * 檔名含內容雜湊，內容不同網址就不同，所以可以永久快取。
 */
export function photoKeys(slug: string, file: string, hash: string) {
  const stem = `${slug}/${safeName(file)}-${hash.slice(0, 10)}`
  return { large: `${stem}.webp`, thumb: `${stem}-w${THUMB_EDGE}.webp` }
}

export type PhotoEntry = { src: string; thumb: string }

/** 可以直接貼進 trip.json 的 photos 片段 */
export function snippet(entries: PhotoEntry[]): string {
  const lines = entries.map((e) => `  { "src": "${e.src}", "thumb": "${e.thumb}" }`)
  return `"photos": [\n${lines.join(',\n')}\n]`
}

export function joinUrl(base: string, key: string): string {
  return `${base.replace(/\/+$/, '')}/${key}`
}
