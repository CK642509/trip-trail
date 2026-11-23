/**
 * 前端密碼遮罩：只比對 sha256(slug + ":" + password)，擋一般訪客，不是真正的存取控制。
 * hash 存在環境變數 TRIP_<SLUG>_HASH，不進 git。
 */

/** kansai-2026 → TRIP_KANSAI_2026_HASH */
export function tripHashEnvName(slug: string): string {
  return `TRIP_${slug.toUpperCase().replace(/-/g, '_')}_HASH`
}

export async function hashPassword(slug: string, password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${slug}:${password}`)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
