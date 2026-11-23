import { useEffect, useRef, type CSSProperties } from 'react'
import { dayColor } from '../data/modes.ts'
import type { Day } from '../data/schema.ts'
import { dayParts } from '../lib/format.ts'
import type { DaySelection } from '../lib/daySelection.ts'
import './DayTabs.css'

/** 橫向可滑動的天數切換：「全部」＋每一天＋「複選」開關。 */
export function DayTabs({
  days,
  selection,
  multi,
  onAll,
  onDay,
  onToggleMulti,
}: {
  days: Day[]
  selection: DaySelection
  multi: boolean
  onAll: () => void
  onDay: (id: number) => void
  onToggleMulti: () => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const first = selection?.[0] ?? null

  // 切換後把選到的第一天捲到看得見的位置
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [first])

  return (
    <nav className="day-tabs" aria-label="選擇天數">
      <div className="day-tabs-scroll" ref={listRef}>
        <button className="day-tab day-tab-all" aria-pressed={selection === null} onClick={onAll}>
          <span className="day-tab-num">全部</span>
          <span className="day-tab-date">{days.length} 天</span>
        </button>
        {days.map((day, i) => {
          const { md, weekday } = dayParts(day.date)
          const on = selection?.includes(day.id) ?? false
          return (
            <button
              key={day.id}
              className={`day-tab${multi ? ' is-multi' : ''}`}
              style={{ '--day': dayColor(day.color, i) } as CSSProperties}
              aria-pressed={on}
              aria-label={`Day ${day.id}，${md} 星期${weekday}，${day.title}`}
              onClick={() => onDay(day.id)}
            >
              <span className="day-tab-num">
                {multi && <span className="day-tab-check" aria-hidden />}
                Day {day.id}
              </span>
              <span className="day-tab-date">
                {md}（{weekday}）
              </span>
            </button>
          )
        })}
        <button
          className="day-tab day-tab-multi"
          aria-pressed={multi}
          onClick={onToggleMulti}
          title="一次看好幾天"
        >
          <span className="day-tab-num">複選</span>
          <span className="day-tab-date">{multi ? '開' : '關'}</span>
        </button>
      </div>
    </nav>
  )
}
