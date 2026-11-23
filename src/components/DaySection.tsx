import { useMemo, type CSSProperties } from 'react'
import { dayColor, MODES } from '../data/modes.ts'
import type { Day } from '../data/schema.ts'
import { buildTimeline, type LegItem, type StopItem } from '../data/timeline.ts'
import { dayParts } from '../lib/format.ts'
import { directionsUrl } from '../lib/googleMaps.ts'
import { markdownToText } from '../lib/markdown.ts'
import { Markdown } from './Markdown.tsx'
import './DaySection.css'

export function DaySection({
  day,
  index,
  selectedStop,
  onOpenDay,
  onSelectStop,
}: {
  day: Day
  index: number
  /** 目前打開詳細資訊的景點，列表上標示出來 */
  selectedStop?: string | null
  /** 全部天數模式下，點標題切換到這一天 */
  onOpenDay?: () => void
  onSelectStop: (stopId: string) => void
}) {
  const items = useMemo(() => buildTimeline(day), [day])
  const { md, weekday } = dayParts(day.date)
  const style = { '--day': dayColor(day.color, index) } as CSSProperties

  const heading = (
    <>
      <span className="seal" aria-hidden>
        <span className="seal-day">DAY</span>
        <span className="seal-num">{day.id}</span>
      </span>
      <span className="day-head-text">
        <span className="day-date">
          {md}（{weekday}）
        </span>
        <span className="day-title">{day.title}</span>
      </span>
    </>
  )

  return (
    <section className="day" style={style} aria-label={`Day ${day.id} ${day.title}`}>
      <h2 className="day-head">
        {onOpenDay ? (
          <button className="day-head-btn" onClick={onOpenDay}>
            {heading}
            <span className="day-open">只看這天 ›</span>
          </button>
        ) : (
          <span className="day-head-btn">{heading}</span>
        )}
      </h2>

      {day.note && <Markdown className="day-note" text={day.note} />}

      <ol className="timeline">
        {items.map((item, i) =>
          item.kind === 'stop' ? (
            <StopRow
              key={`s-${item.stop.id}`}
              item={item}
              n={i}
              selected={item.stop.id === selectedStop}
              onSelect={onSelectStop}
            />
          ) : (
            <LegRow key={`l-${i}`} item={item} n={i} />
          ),
        )}
      </ol>
    </section>
  )
}

function StopRow({
  item,
  n,
  selected,
  onSelect,
}: {
  item: StopItem
  n: number
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { stop, order, group } = item
  const summary = useMemo(() => (stop.note ? markdownToText(stop.note) : ''), [stop.note])
  const cls = [
    'tl-stop',
    stop.optional && 'is-optional',
    group && 'in-group',
    group?.label && 'group-start',
    group?.last && 'group-end',
    selected && 'is-selected',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li className={cls} style={{ '--i': n } as CSSProperties}>
      {group?.label && <span className="group-label">{group.name}</span>}
      <button
        className="stop-btn"
        aria-current={selected || undefined}
        onClick={() => onSelect(stop.id)}
      >
        <span className="stop-num" aria-label={`第 ${order} 站`}>
          {order}
        </span>
        <span className="stop-body">
          {stop.time && <span className="stop-time">{stop.time}</span>}
          <span className="stop-name">
            {stop.name}
            {stop.optional && <span className="tag">可選</span>}
          </span>
          {summary && <span className="stop-note">{summary}</span>}
          {stop.photos && stop.photos.length > 0 && (
            <span className="stop-photos">照片 {stop.photos.length} 張</span>
          )}
        </span>
        <span className="stop-chev" aria-hidden>
          ›
        </span>
      </button>
    </li>
  )
}

function LegRow({ item, n }: { item: LegItem; n: number }) {
  const { leg, from, to, toNext, inGroup } = item
  const mode = MODES[leg.mode]
  const nav = directionsUrl(leg, from, to)
  const text = leg.label ?? mode.label
  const loop = from.id === to.id

  return (
    <li
      className={`tl-leg line-${mode.line}${leg.optional ? ' is-optional' : ''}${inGroup ? ' in-group' : ''}`}
      style={{ '--i': n } as CSSProperties}
    >
      <span className="leg-rail" aria-hidden />
      <span className="leg-body">
        <span className="leg-icon" aria-hidden>
          {mode.icon}
        </span>
        <span className="leg-text">
          <span className="sr-only">{mode.label}：</span>
          {text}
          {!toNext && !loop && <span className="leg-dest">　→ {to.name}</span>}
          {loop && <span className="leg-dest">　（繞一圈回到原地）</span>}
          {leg.time && <span className="leg-time">{leg.time}</span>}
          {leg.note && <span className="leg-note">{markdownToText(leg.note)}</span>}
        </span>
        {nav && (
          <a
            className="leg-nav"
            href={nav}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`用 Google 地圖導航：${from.name} 到 ${to.name}`}
          >
            導航
          </a>
        )}
      </span>
    </li>
  )
}
