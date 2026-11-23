import { useEffect, useRef, type CSSProperties } from 'react'
import { dayColor, MODES } from '../data/modes.ts'
import type { Trip } from '../data/schema.ts'
import { formatDay } from '../lib/format.ts'
import { directionsUrl, placeUrl } from '../lib/googleMaps.ts'
import { Markdown } from './Markdown.tsx'
import { PhotoStrip } from './Photos.tsx'
import './StopSheet.css'

export type StopRef = { dayId: number; stopId: string }

/** 景點詳細資訊：手機是從下方滑出的抽屜，桌機是置中的卡片。 */
export function StopSheet({
  trip,
  selected,
  onSelect,
  onClose,
}: {
  trip: Trip
  selected: StopRef | null
  onSelect: (ref: StopRef) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const dayIndex = selected ? trip.days.findIndex((d) => d.id === selected.dayId) : -1
  const day = dayIndex >= 0 ? trip.days[dayIndex] : null
  const stopIndex = day ? day.stops.findIndex((s) => s.id === selected!.stopId) : -1
  const stop = day && stopIndex >= 0 ? day.stops[stopIndex] : null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (stop && !dialog.open) dialog.showModal()
    if (!stop && dialog.open) dialog.close()
  }, [stop])

  // 換站時捲回頂端
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [stop])

  const prev = day && stopIndex > 0 ? day.stops[stopIndex - 1] : null
  const next = day && stopIndex >= 0 ? day.stops[stopIndex + 1] : null
  const legs = day && stop ? day.legs.filter((l) => l.from === stop.id) : []
  const byId = new Map(day?.stops.map((s) => [s.id, s]))

  return (
    <dialog
      ref={ref}
      className="sheet"
      style={day ? ({ '--day': dayColor(day.color, dayIndex) } as CSSProperties) : undefined}
      aria-labelledby="sheet-title"
      onClose={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onClick={(e) => {
        // 點背景關閉
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {day && stop && (
        <div className="sheet-inner">
          <div className="sheet-grip" aria-hidden />
          <header className="sheet-head">
            <span className="sheet-kicker">
              <span className="sheet-chip">Day {day.id}</span>
              {formatDay(day.date)}・第 {stopIndex + 1} 站
            </span>
            <button className="sheet-close" onClick={onClose} aria-label="關閉">
              ×
            </button>
          </header>

          <div className="sheet-body" ref={bodyRef}>
            <h2 id="sheet-title" className="sheet-title">
              {stop.name}
              {stop.optional && <span className="tag">可選</span>}
            </h2>
            {stop.time && <p className="sheet-time">{stop.time}</p>}

            {stop.note && <Markdown className="sheet-note" text={stop.note} />}

            {stop.photos && stop.photos.length > 0 && (
              <PhotoStrip key={stop.id} photos={stop.photos} name={stop.name} />
            )}

            <a
              className="btn btn-primary btn-block"
              href={placeUrl(stop)}
              target="_blank"
              rel="noopener noreferrer"
            >
              在 Google 地圖開啟
            </a>

            {legs.length > 0 && (
              <section className="sheet-legs" aria-label="接下來的交通">
                <h3>接下來</h3>
                <ul>
                  {legs.map((leg, i) => {
                    const to = byId.get(leg.to)!
                    const nav = directionsUrl(leg, stop, to)
                    const mode = MODES[leg.mode]
                    return (
                      <li key={i} className={leg.optional ? 'is-optional' : undefined}>
                        <span className="sheet-leg-icon" aria-hidden>
                          {mode.icon}
                        </span>
                        <span className="sheet-leg-text">
                          <strong>{leg.label ?? mode.label}</strong>
                          <span>
                            {to.id === stop.id ? '繞一圈回到原地' : `到 ${to.name}`}
                            {leg.time && `・${leg.time}`}
                          </span>
                          {leg.note && <Markdown text={leg.note} />}
                        </span>
                        {nav && (
                          <a
                            className="btn btn-small"
                            href={nav}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            導航
                          </a>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </div>

          <nav className="sheet-nav" aria-label="上一站、下一站">
            <button
              className="btn btn-ghost"
              disabled={!prev}
              onClick={() => prev && onSelect({ dayId: day.id, stopId: prev.id })}
            >
              ‹ {prev ? prev.name : '上一站'}
            </button>
            <button
              className="btn btn-ghost"
              disabled={!next}
              onClick={() => next && onSelect({ dayId: day.id, stopId: next.id })}
            >
              {next ? next.name : '下一站'} ›
            </button>
          </nav>
        </div>
      )}
    </dialog>
  )
}
