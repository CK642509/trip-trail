import { useEffect, useRef, type CSSProperties } from 'react'
import { dayColor } from '../data/modes.ts'
import type { Day } from '../data/schema.ts'
import { dayParts } from '../lib/format.ts'
import './DayTabs.css'

/** 橫向可滑動的天數切換：「全部」＋每一天。 */
export function DayTabs({
  days,
  active,
  onSelect,
}: {
  days: Day[]
  active: number | null
  onSelect: (id: number | null) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)

  // 切換後把目前的那一天捲到看得見的位置
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [active])

  return (
    <nav className="day-tabs" aria-label="選擇天數">
      <div className="day-tabs-scroll" ref={listRef}>
        <button
          className="day-tab day-tab-all"
          aria-pressed={active === null}
          onClick={() => onSelect(null)}
        >
          <span className="day-tab-num">全部</span>
          <span className="day-tab-date">{days.length} 天</span>
        </button>
        {days.map((day, i) => {
          const { md, weekday } = dayParts(day.date)
          return (
            <button
              key={day.id}
              className="day-tab"
              style={{ '--day': dayColor(day.color, i) } as CSSProperties}
              aria-pressed={active === day.id}
              aria-label={`Day ${day.id}，${md} 星期${weekday}，${day.title}`}
              onClick={() => onSelect(day.id)}
            >
              <span className="day-tab-num">Day {day.id}</span>
              <span className="day-tab-date">
                {md}（{weekday}）
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
