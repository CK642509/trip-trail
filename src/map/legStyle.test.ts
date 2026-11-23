import { describe, expect, it } from 'vitest'
import { legLines } from './legStyle.ts'

describe('legLines', () => {
  it('鐵道：實線＋白邊＋箭頭', () => {
    const { casing, line } = legLines('rail', '#2457c5')
    expect(casing?.strokeColor).toBe('#ffffff')
    expect(line.strokeOpacity).toBeGreaterThan(0.9)
    expect(line.icons).toHaveLength(1)
    expect(line.icons?.[0].offset).toBe('50%')
  })

  it('可選的鐵道改成虛線、半透明、沒有白邊、排在下層', () => {
    const normal = legLines('rail', '#2457c5')
    const opt = legLines('rail', '#2457c5', { optional: true })
    expect(opt.casing).toBeUndefined()
    expect(opt.line.strokeOpacity).toBe(0)
    expect(opt.line.icons?.[0].repeat).toMatch(/px$/)
    expect(opt.line.icons?.[0].icon?.strokeOpacity).toBe(0.6)
    expect(opt.line.zIndex!).toBeLessThan(normal.line.zIndex!)
  })

  it('步行是點線，未定是淡色細虛線', () => {
    const walk = legLines('walk', '#000').line
    expect(walk.strokeOpacity).toBe(0)
    expect(walk.icons?.[0].icon?.fillOpacity).toBeGreaterThan(0.9)
    const open = legLines('open', '#000').line
    expect(open.strokeWeight).toBe(2)
    expect(open.icons?.[0].icon?.strokeOpacity).toBe(0.55)
  })

  it('後面的天數疊在上面', () => {
    expect(legLines('bus', '#000', { zIndex: 3 }).line.zIndex!).toBeGreaterThan(
      legLines('bus', '#000', { zIndex: 1 }).line.zIndex!,
    )
  })
})
