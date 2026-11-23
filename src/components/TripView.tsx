import { useCallback, useEffect, useRef, useState } from 'react'
import type { Trip } from '../data/schema.ts'
import { useMediaQuery } from '../hooks/useMediaQuery.ts'
import { normalizeSelection, tapDay, toSingle, type DaySelection } from '../lib/daySelection.ts'
import { formatLength, formatRange } from '../lib/format.ts'
import { daysFromHash, hashForDays, navigate, useLocation } from '../lib/router.ts'
import { nextStopId, todayDay, tripClock, useTripClock } from '../lib/today.ts'
import { TripMap, type MapFocus, type MapPadding } from '../map/TripMap.tsx'
import { DayTabs } from './DayTabs.tsx'
import { DaySection } from './DaySection.tsx'
import { snapHeight, type Snap } from '../lib/drawer.ts'
import { ListDrawer } from './ListDrawer.tsx'
import { Markdown } from './Markdown.tsx'
import { OfflineBadge, OfflineButton } from './OfflinePanel.tsx'
import { StopSheet, type StopRef } from './StopSheet.tsx'
import './TripView.css'

type Tab = 'plan' | 'info'

/** 手機上詳細資訊卡最多占畫面的比例（StopSheet.css 也要一致） */
const SHEET_RATIO = 0.62

export function TripView({ trip, updatedAt }: { trip: Trip; updatedAt: Date | null }) {
  // 旅途中打開（網址沒有指定天數）時，直接切到今天
  const [autoToday] = useState(() => {
    if (location.hash) return false
    const day = todayDay(trip, tripClock(trip.timezone))
    if (day) history.replaceState(null, '', `${location.pathname}${location.search}#day-${day.id}`)
    return day !== null
  })
  const url = useLocation()
  const clock = useTripClock(trip.timezone)
  const today = todayDay(trip, clock)
  const nextId = today ? nextStopId(today, clock.minutes) : null
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const allIds = trip.days.map((d) => d.id)
  const selection = normalizeSelection(daysFromHash(url.hash), allIds)
  const visibleDays =
    selection === null ? trip.days : trip.days.filter((d) => selection.includes(d.id))

  const [multi, setMulti] = useState(() => (selection?.length ?? 0) > 1)
  const [tab, setTab] = useState<Tab>('plan')
  const [selected, setSelected] = useState<StopRef | null>(null)
  const [focus, setFocus] = useState<MapFocus | null>(null)
  const [snap, setSnap] = useState<Snap>('half')
  const stageRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 自動切到今天時，把列表捲到下一站
  useEffect(() => {
    const box = listRef.current
    const row = box?.querySelector<HTMLElement>('.tl-stop.is-next')
    if (!autoToday || !box || !row) return
    // 手機的抽屜只露出一半，下一站要捲到最上面才看得到；桌機上方有固定的天數列
    const margin = isDesktop ? 130 : 20
    const offset = row.getBoundingClientRect().top - box.getBoundingClientRect().top
    if (offset > margin) box.scrollTo({ top: box.scrollTop + offset - margin })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在打開時做一次
  }, [])

  function setSelection(sel: DaySelection) {
    setTab('plan')
    navigate(`${url.pathname}${hashForDays(sel)}`, { replace: true })
    listRef.current?.scrollTo({ top: 0 })
    if (!isDesktop && snap === 'peek') setSnap('half')
  }

  /** 地圖被蓋住的範圍：手機是下方的抽屜，桌機是右上角的按鈕 */
  const getPadding = useCallback((): MapPadding => {
    if (isDesktop) return { top: 40, right: 90, bottom: 40, left: 40 }
    const stageH = stageRef.current?.clientHeight ?? 0
    const drawer = snapHeight(snap === 'full' ? 'half' : snap, stageH)
    return { top: 20, right: 80, bottom: drawer + 16, left: 20 }
  }, [isDesktop, snap])

  /** 從列表或上一站／下一站選景點：打開詳細資訊並把地圖移過去 */
  function openStop(ref: StopRef) {
    setSelected(ref)
    const stop = trip.days.find((d) => d.id === ref.dayId)?.stops.find((s) => s.id === ref.stopId)
    if (!stop) return
    let padding: MapPadding | undefined
    if (!isDesktop) {
      // 手機的詳細資訊卡會蓋住下半部，讓景點落在卡片上方看得到的地方
      if (snap === 'full') setSnap('half')
      const stage = stageRef.current?.getBoundingClientRect()
      const sheetTop = window.innerHeight * (1 - SHEET_RATIO)
      const bottom = stage ? Math.max(0, stage.bottom - sheetTop) : 0
      padding = { top: 12, right: 12, bottom: bottom + 12, left: 12 }
    }
    setFocus({ ll: stop.ll, seq: Date.now(), padding })
  }

  // 點地圖上的標記：地圖已經在那裡了，只打開詳細資訊
  const onMarker = useCallback((ref: StopRef) => setSelected(ref), [])

  const header = (
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
          <OfflineBadge updatedAt={updatedAt} />
        </div>
        <OfflineButton trip={trip} />
      </div>
    </header>
  )

  const tabs = trip.info ? (
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
          onClick={() => {
            setTab(id)
            if (!isDesktop && snap === 'peek') setSnap('half')
          }}
        >
          {label}
        </button>
      ))}
    </div>
  ) : (
    <p className="trip-tabs-label">每日行程</p>
  )

  const dayTabs = (
    <DayTabs
      days={trip.days}
      selection={selection}
      todayId={today?.id ?? null}
      multi={multi}
      onAll={() => setSelection(null)}
      onDay={(id) => setSelection(tapDay(selection, id, multi, allIds))}
      onToggleMulti={() => {
        if (multi) setSelection(toSingle(selection))
        setMulti(!multi)
      }}
    />
  )

  const list =
    tab === 'info' && trip.info ? (
      <article className="info-card">
        <Markdown text={trip.info} />
      </article>
    ) : (
      visibleDays.map((day) => (
        <DaySection
          key={day.id}
          day={day}
          index={trip.days.indexOf(day)}
          isToday={day.id === today?.id}
          nextStop={day.id === today?.id ? nextId : null}
          selectedStop={selected?.dayId === day.id ? selected.stopId : null}
          onOpenDay={
            visibleDays.length > 1
              ? () => {
                  setMulti(false)
                  setSelection([day.id])
                }
              : undefined
          }
          onSelectStop={(stopId) => openStop({ dayId: day.id, stopId })}
        />
      ))
    )

  const map = (
    <TripMap
      trip={trip}
      days={visibleDays}
      selected={selected}
      focus={focus}
      getPadding={getPadding}
      onSelectStop={onMarker}
    />
  )

  const sheet = (
    <StopSheet
      trip={trip}
      selected={selected}
      onSelect={openStop}
      onClose={() => setSelected(null)}
    />
  )

  if (isDesktop) {
    return (
      <div className="trip trip-desktop">
        <aside className="trip-side" ref={listRef}>
          {header}
          <div className="trip-side-tabs">{tabs}</div>
          {tab === 'plan' && dayTabs}
          <main className="trip-main">{list}</main>
        </aside>
        <div className="trip-stage" ref={stageRef}>
          {map}
        </div>
        {sheet}
      </div>
    )
  }

  return (
    <div className="trip trip-mobile">
      {header}
      {dayTabs}
      <div className="trip-stage" ref={stageRef}>
        {map}
        <ListDrawer snap={snap} onSnap={setSnap} stageRef={stageRef} head={tabs} bodyRef={listRef}>
          <main className="trip-main">{list}</main>
        </ListDrawer>
      </div>
      {sheet}
    </div>
  )
}
