import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { PEEK, snapHeight, type Snap } from '../lib/drawer.ts'
import './ListDrawer.css'

const ORDER: Snap[] = ['peek', 'half', 'full']

/**
 * 手機版的行程抽屜：蓋在地圖下方，可拖拉成收合／半開／全開三段。
 * 拖拉範圍是上方的把手和標題列；點把手也能切換。
 */
export function ListDrawer({
  snap,
  onSnap,
  stageRef,
  head,
  bodyRef,
  children,
}: {
  snap: Snap
  onSnap: (snap: Snap) => void
  stageRef: RefObject<HTMLElement | null>
  head: ReactNode
  bodyRef: RefObject<HTMLDivElement | null>
  children: ReactNode
}) {
  const [stageH, setStageH] = useState(0)
  const [dragH, setDragH] = useState<number | null>(null)
  const drag = useRef<{ y: number; h: number; t: number; active: boolean; id: number } | null>(null)
  const justDragged = useRef(false)

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStageH(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [stageRef])

  const height = dragH ?? snapHeight(snap, stageH)

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = { y: e.clientY, h: height, t: e.timeStamp, active: false, id: e.pointerId }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dy = e.clientY - d.y
    if (!d.active) {
      if (Math.abs(dy) < 6) return
      d.active = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setDragH(Math.min(stageH, Math.max(PEEK, d.h - dy)))
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    drag.current = null
    if (!d || !d.active) return
    justDragged.current = true
    const dy = e.clientY - d.y
    const v = dy / Math.max(1, e.timeStamp - d.t) // px/ms，往下為正
    const h = d.h - dy
    let target: Snap
    if (Math.abs(v) > 0.5) {
      // 快速甩動：往甩的方向切一段
      const i = ORDER.indexOf(nearest(d.h, stageH))
      target = ORDER[Math.min(2, Math.max(0, i + (v < 0 ? 1 : -1)))]
    } else {
      target = nearest(h, stageH)
    }
    setDragH(null)
    onSnap(target)
  }

  return (
    <section
      className={`drawer${dragH !== null ? ' is-dragging' : ''}`}
      style={{ height }}
      aria-label="行程列表"
    >
      <div
        className="drawer-head"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          // 拖拉結束時不要觸發底下的按鈕
          if (justDragged.current) {
            justDragged.current = false
            e.stopPropagation()
            e.preventDefault()
          }
        }}
      >
        <button
          type="button"
          className="drawer-grip"
          aria-label={snap === 'full' ? '縮小行程列表' : '展開行程列表'}
          aria-expanded={snap !== 'peek'}
          onClick={() => onSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'half')}
        >
          <span aria-hidden />
        </button>
        {head}
      </div>
      <div className="drawer-body" ref={bodyRef} inert={snap === 'peek' && dragH === null}>
        {children}
      </div>
    </section>
  )
}

function nearest(h: number, stageH: number): Snap {
  let best: Snap = 'half'
  let dist = Infinity
  for (const s of ORDER) {
    const d = Math.abs(snapHeight(s, stageH) - h)
    if (d < dist) {
      dist = d
      best = s
    }
  }
  return best
}
