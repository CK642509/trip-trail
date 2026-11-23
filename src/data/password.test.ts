import { describe, expect, it } from 'vitest'
import { hashPassword, tripHashEnvName } from './password.ts'

describe('password', () => {
  it('環境變數名稱', () => {
    expect(tripHashEnvName('kansai-2026')).toBe('TRIP_KANSAI_2026_HASH')
  })

  it('hash 是 sha256(slug:password) 的 hex（以 Python hashlib 計算的值對照）', async () => {
    // 範例密碼，不是任何旅程真正的密碼
    expect(await hashPassword('test-trip', 'example-password')).toBe(
      '621f95fe2babead4b7fcc12d4c3982f93854d61d493afb36ace7fe81d3e5d37b',
    )
  })
})
