import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import type { Photo } from '../data/schema.ts'
import './Photos.css'

/**
 * 照片一律用 CORS 模式載入（R2 已設定 CORS）：Service Worker 才能存成一般回應，
 * 存成 opaque 的話每張會被算成好幾 MB 的儲存空間。
 */
const CORS = 'anonymous'

/** 詳細資訊卡裡的縮圖列，點一下全螢幕瀏覽 */
export function PhotoStrip({ photos, name }: { photos: Photo[]; name: string }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <>
      <ul className="photo-strip" aria-label={`${name}的照片`}>
        {photos.map((p, i) => (
          <li key={p.src}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`看第 ${i + 1} 張照片${p.caption ? `：${p.caption}` : ''}`}
            >
              <img
                src={p.thumb ?? p.src}
                alt=""
                loading="lazy"
                crossOrigin={CORS}
                onError={markBroken}
              />
            </button>
          </li>
        ))}
      </ul>
      {open !== null && (
        <Lightbox photos={photos} name={name} start={open} onClose={() => setOpen(null)} />
      )}
    </>
  )
}

function markBroken(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.classList.add('is-broken')
}

/** 全螢幕照片瀏覽：左右滑動（或按箭頭、鍵盤左右鍵）換張，Esc 或 × 關閉 */
function Lightbox({
  photos,
  name,
  start,
  onClose,
}: {
  photos: Photo[]
  name: string
  start: number
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(start)
  // 看過或相鄰的才載入大圖，其他先用縮圖
  const [seen, setSeen] = useState(() => new Set([start - 1, start, start + 1]))
  const [loaded, setLoaded] = useState(() => new Set<string>())

  useEffect(() => {
    const dialog = ref.current
    const track = trackRef.current
    if (!dialog || !track) return
    dialog.showModal()
    track.scrollTo({ left: start * track.clientWidth, behavior: 'instant' })
    // 只在打開時執行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function go(i: number) {
    const track = trackRef.current
    if (!track || i < 0 || i >= photos.length) return
    track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' })
  }

  function onScroll() {
    const track = trackRef.current
    if (!track) return
    const i = Math.round(track.scrollLeft / track.clientWidth)
    if (i === index || i < 0 || i >= photos.length) return
    setIndex(i)
    if (!seen.has(i + 1) || !seen.has(i - 1)) setSeen(new Set([...seen, i - 1, i, i + 1]))
  }

  const photo = photos[index]
  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={`${name}的照片`}
      onClose={(e) => {
        // 詳細資訊卡也是 dialog，事件會沿著 React 樹往上傳，只處理自己的
        e.stopPropagation()
        onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(index + 1)
        if (e.key === 'ArrowLeft') go(index - 1)
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="lightbox-track" ref={trackRef} onScroll={onScroll}>
        {photos.map((p, i) => (
          <figure key={p.src} className="lightbox-slide" aria-hidden={i !== index}>
            {/* 大圖還沒載完前，先看到放大的縮圖（兩張疊在同一個位置） */}
            {p.thumb && seen.has(i) && !loaded.has(p.src) && (
              <img className="lightbox-under" src={p.thumb} alt="" crossOrigin={CORS} />
            )}
            <img
              src={seen.has(i) ? p.src : (p.thumb ?? p.src)}
              alt={p.caption ?? `${name} 第 ${i + 1} 張`}
              crossOrigin={CORS}
              draggable={false}
              onLoad={(e) => {
                if (e.currentTarget.currentSrc === p.src) setLoaded((s) => new Set(s).add(p.src))
              }}
              onError={markBroken}
            />
          </figure>
        ))}
      </div>

      <div className="lightbox-bar">
        <p className="lightbox-caption">
          <span className="lightbox-count">
            {index + 1} / {photos.length}
          </span>
          {photo.caption ?? name}
        </p>
      </div>

      <button
        type="button"
        className="lightbox-btn lightbox-close"
        aria-label="關閉照片"
        onClick={() => ref.current?.close()}
      >
        ×
      </button>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="lightbox-btn lightbox-prev"
            aria-label="上一張"
            disabled={index === 0}
            onClick={() => go(index - 1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="lightbox-btn lightbox-next"
            aria-label="下一張"
            disabled={index === photos.length - 1}
            onClick={() => go(index + 1)}
          >
            ›
          </button>
        </>
      )}
    </dialog>
  )
}
