import { describe, expect, it } from 'vitest'
import { joinUrl, photoKeys, safeName, snippet } from './photos.ts'

describe('safeName', () => {
  it('轉成網址安全的小寫名稱', () => {
    expect(safeName('/a/b/IMG 1234 (2).JPG')).toBe('img-1234-2')
    expect(safeName('Café_Ü.png')).toBe('cafe-u')
  })

  it('只有中文等非英數字時用 photo', () => {
    expect(safeName('清水寺.jpg')).toBe('photo')
  })
})

describe('photoKeys', () => {
  it('路徑含旅程代號和內容雜湊，縮圖加 -w400', () => {
    expect(photoKeys('kansai-2026', 'IMG_1.jpg', 'abcdef0123456789')).toEqual({
      large: 'kansai-2026/img-1-abcdef0123.webp',
      thumb: 'kansai-2026/img-1-abcdef0123-w400.webp',
    })
  })
})

describe('snippet', () => {
  it('印出可貼進 trip.json 的 JSON 片段', () => {
    const base = 'https://pub-x.r2.dev/'
    const text = snippet([{ src: joinUrl(base, 'a.webp'), thumb: joinUrl(base, 'a-w400.webp') }])
    expect(JSON.parse(`{${text}}`)).toEqual({
      photos: [{ src: 'https://pub-x.r2.dev/a.webp', thumb: 'https://pub-x.r2.dev/a-w400.webp' }],
    })
  })
})
