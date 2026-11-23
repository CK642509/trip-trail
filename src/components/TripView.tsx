import { useState } from 'react'
import type { Trip } from '../data/schema.ts'
import { formatLength, formatRange } from '../lib/format.ts'
import { dayFromHash, navigate, useLocation } from '../lib/router.ts'
import { DayTabs } from './DayTabs.tsx'
import { DaySection } from './DaySection.tsx'
import { Markdown } from './Markdown.tsx'
import { StopSheet, type StopRef } from './StopSheet.tsx'
import './TripView.css'

type Tab = 'plan' | 'info'

export function TripView({ trip }: { trip: Trip }) {
  const url = useLocation()
  const hashDay = dayFromHash(url.hash)
  const activeDay = trip.days.some((d) => d.id === hashDay) ? hashDay : null
  const visibleDays = activeDay === null ? trip.days : trip.days.filter((d) => d.id === activeDay)

  const [tab, setTab] = useState<Tab>('plan')
  const [selected, setSelected] = useState<StopRef | null>(null)

  function selectDay(id: number | null) {
    setTab('plan')
    navigate(`${url.pathname}${id === null ? '' : `#day-${id}`}`, { replace: true })
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="trip">
      <header className="trip-head">
        <div className="trip-head-inner">
          <a className="trip-home" href="/" aria-label="回首頁">
            <span className="brand-seal brand-seal-sm" aria-hidden>
              旅
            </span>
          </a>
          <div className="trip-titles">
            <h1 className="trip-title">{trip.title}</h1>
            <p className="trip-meta">
              {formatRange(trip.start, trip.end)}・{formatLength(trip.start, trip.end)}
            </p>
          </div>
        </div>
        {trip.info && (
          <div className="trip-tabs" role="tablist" aria-label="檢視">
            {(
              [
                ['plan', '每日行程'],
                ['info', '旅程資訊'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                className="trip-tab"
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>
      {tab === 'plan' && <DayTabs days={trip.days} active={activeDay} onSelect={selectDay} />}

      <main className="trip-main">
        {tab === 'info' && trip.info ? (
          <article className="info-card">
            <Markdown text={trip.info} />
          </article>
        ) : (
          visibleDays.map((day) => (
            <DaySection
              key={day.id}
              day={day}
              index={trip.days.indexOf(day)}
              onOpenDay={activeDay === null ? () => selectDay(day.id) : undefined}
              onSelectStop={(stopId) => setSelected({ dayId: day.id, stopId })}
            />
          ))
        )}
      </main>

      <StopSheet
        trip={trip}
        selected={selected}
        onSelect={setSelected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
