import { useEffect, useMemo, useRef, useState } from 'react'
import type { Trip } from '../data/schema.ts'
import { useOnline } from '../hooks/useMediaQuery.ts'
import {
  cacheSupported,
  countCached,
  downloadForOffline,
  formatUpdated,
  photoUrls,
  saveTripData,
  STALE_MS,
  type Progress,
} from '../lib/offline.ts'
import './OfflinePanel.css'

/** 標題列上的小提示：離線中、或正在看之前存下來的資料 */
export function OfflineBadge({ updatedAt }: { updatedAt: Date | null }) {
  const online = useOnline()
  // 載入時判斷一次：伺服器給的時間太舊，表示拿到的是 Service Worker 存的舊資料
  const [stale] = useState(() => updatedAt !== null && Date.now() - updatedAt.getTime() > STALE_MS)
  if (online && !stale) return null
  return (
    <p className="offline-badge" role="status">
      <span className="offline-dot" aria-hidden />
      {online ? '沒有連上網路' : '離線中'}
      {updatedAt && `・資料更新於 ${formatUpdated(updatedAt)}`}
    </p>
  )
}

type State =
  | { kind: 'idle' }
  | { kind: 'running'; progress: Progress }
  | { kind: 'done'; progress: Progress }
  | { kind: 'error'; message: string }

/** 「下載供離線使用」：一次把行程和全部照片存到手機上 */
export function OfflineButton({ trip }: { trip: Trip }) {
  const ref = useRef<HTMLDialogElement>(null)
  const urls = useMemo(() => photoUrls(trip), [trip])
  const online = useOnline()
  const [cached, setCached] = useState<number | null>(null)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])

  // 第一次打開時 Service Worker 還沒接管這一頁，行程資料不會自動存下來，這裡補存一次
  useEffect(() => {
    if (cacheSupported() && navigator.onLine && !navigator.serviceWorker?.controller) {
      saveTripData(trip.slug).catch(() => {})
    }
  }, [trip.slug])

  if (!cacheSupported()) return null

  function open() {
    ref.current?.showModal()
    void countCached(urls).then(setCached)
  }

  async function start() {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setState({ kind: 'running', progress: { done: 0, total: urls.length, failed: 0 } })
    try {
      const progress = await downloadForOffline(
        trip.slug,
        urls,
        (p) => setState({ kind: 'running', progress: p }),
        ctrl.signal,
      )
      if (ctrl.signal.aborted) return
      setState({ kind: 'done', progress })
      setCached(await countCached(urls))
    } catch {
      if (!ctrl.signal.aborted)
        setState({ kind: 'error', message: '下載失敗，請確認網路後再試一次。' })
    }
  }

  const total = urls.length
  const allCached = cached !== null && cached >= total

  return (
    <>
      <button type="button" className="offline-btn" onClick={open}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path
            d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>離線</span>
      </button>

      <dialog
        ref={ref}
        className="offline-panel"
        aria-labelledby="offline-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) ref.current?.close()
        }}
      >
        <div className="offline-inner">
          <header>
            <h2 id="offline-title">離線使用</h2>
            <button type="button" aria-label="關閉" onClick={() => ref.current?.close()}>
              ×
            </button>
          </header>

          <p>
            打開過的行程會自動存在這支手機上，沒有網路時也能看行程和備註。
            {total > 0 && '照片要先下載，才能在沒有網路的地方看。'}
          </p>
          <p className="offline-note">沒有網路時無法顯示地圖（Google 地圖不能存下來）。</p>

          {total > 0 && (
            <section className="offline-photos" aria-live="polite">
              <p className="offline-count">
                照片 <strong>{total}</strong> 張
                {cached !== null && state.kind !== 'running' && (
                  <span>{allCached ? '，全部已存在手機上' : `，已存 ${cached} 張`}</span>
                )}
              </p>

              {state.kind === 'running' && (
                <>
                  <progress value={state.progress.done + state.progress.failed} max={total} />
                  <p className="offline-status">
                    下載中… {state.progress.done + state.progress.failed} / {total}
                  </p>
                </>
              )}
              {state.kind === 'done' && (
                <p className="offline-status">
                  {state.progress.failed > 0
                    ? `有 ${state.progress.failed} 張沒有下載成功，可以再按一次重試。`
                    : '完成！沒有網路時也看得到照片。'}
                </p>
              )}
              {state.kind === 'error' && (
                <p className="offline-status is-error" role="alert">
                  {state.message}
                </p>
              )}

              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={state.kind === 'running' || !online || allCached}
                onClick={start}
              >
                {state.kind === 'running'
                  ? '下載中…'
                  : allCached
                    ? '照片都已下載'
                    : !online
                      ? '需要網路才能下載'
                      : '下載全部照片'}
              </button>
              {!allCached && (
                <p className="offline-note">建議在有 Wi-Fi 的地方下載（大約每張 0.3–0.6 MB）。</p>
              )}
            </section>
          )}
        </div>
      </dialog>
    </>
  )
}
