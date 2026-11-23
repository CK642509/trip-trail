import { AdvancedMarker, Circle, Polyline } from '@vis.gl/react-google-maps'
import { memo, useMemo, type CSSProperties } from 'react'
import { dayColor } from '../data/modes.ts'
import type { Day, Trip } from '../data/schema.ts'
import type { StopRef } from '../components/StopSheet.tsx'
import { legPath, toLiteral } from './geo.ts'
import { legLines, type PolylineOptions } from './legStyle.ts'
import {
  clusterDays,
  clusterPlaces,
  COMPACT_DAYS,
  dayOffset,
  groupAreas,
  mergePlaces,
  type Cluster,
  type Place,
  type GroupArea as Area,
} from './places.ts'
import { northOf, offsetPath } from './projection.ts'

/** 放大到這個等級以上就不再收成叢集 */
const NO_CLUSTER_ZOOM = 17
/** 成群景點的圓圈在這個等級以上才顯示 */
const GROUP_ZOOM = 13

type Props = {
  trip: Trip
  days: Day[]
  /** 目前縮放等級（停下來後才更新） */
  zoom: number
  selected: StopRef | null
  /** 打開了選單的合併標記 */
  openKey: string | null
  onOpen: (key: string | null) => void
  onSelect: (ref: StopRef) => void
  onCluster: (cluster: Cluster) => void
}

/** 路線、景點標記、成群圈。只在天數、縮放或選取改變時重畫，平移時不會。 */
export const Overlay = memo(function Overlay({
  trip,
  days,
  zoom,
  selected,
  openKey,
  onOpen,
  onSelect,
  onCluster,
}: Props) {
  // 偏移和叢集用半級為單位重算，避免縮放途中一直重畫
  const z = Math.round(zoom * 2) / 2
  const dayKey = days.map((d) => d.id).join(',')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const places = useMemo(() => mergePlaces(trip, days), [trip, dayKey])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const areas = useMemo(() => groupAreas(trip, days), [trip, dayKey])

  const selectedKey = selected
    ? places.find((p) =>
        p.visits.some((v) => v.dayId === selected.dayId && v.stopId === selected.stopId),
      )?.key
    : undefined

  const { singles, clusters } = useMemo(() => {
    if (z >= NO_CLUSTER_ZOOM) return { singles: places, clusters: [] }
    const keep = new Set([selectedKey, openKey].filter((k): k is string => !!k))
    return clusterPlaces(places, z, keep)
  }, [places, z, selectedKey, openKey])

  const openPlace = openKey ? singles.find((p) => p.key === openKey) : undefined

  return (
    <>
      {z >= GROUP_ZOOM && areas.map((a) => <GroupArea key={a.key} area={a} />)}
      {days.map((day, i) => (
        <DayLines
          key={day.id}
          day={day}
          index={trip.days.indexOf(day)}
          offset={dayOffset(i, days.length)}
          zoom={z}
        />
      ))}
      {singles.map((place) => (
        <PlaceMarker
          key={place.key}
          place={place}
          selected={selectedKey === place.key ? selected : null}
          baseZ={trip.days.findIndex((d) => d.id === place.visits[0].dayId)}
          onClick={() => {
            if (place.visits.length === 1) {
              onOpen(null)
              onSelect({ dayId: place.visits[0].dayId, stopId: place.visits[0].stopId })
            } else {
              onOpen(openKey === place.key ? null : place.key)
            }
          }}
        />
      ))}
      {clusters.map((c) => (
        <ClusterMarker key={c.key} cluster={c} onClick={() => onCluster(c)} />
      ))}
      {openPlace && (
        <PlacePicker
          place={openPlace}
          onPick={(ref) => {
            onOpen(null)
            onSelect(ref)
          }}
        />
      )}
    </>
  )
})

function DayLines({
  day,
  index,
  offset,
  zoom,
}: {
  day: Day
  index: number
  offset: number
  zoom: number
}) {
  const color = dayColor(day.color, index)
  const lines = useMemo(() => {
    const byId = new Map(day.stops.map((s) => [s.id, s]))
    return day.legs.flatMap((leg, i) => {
      const path = legPath(leg, byId.get(leg.from)!, byId.get(leg.to)!)
      if (!path) return []
      const { casing, line } = legLines(leg.mode, color, {
        optional: leg.optional,
        zIndex: index,
      })
      return [{ key: i, path: offsetPath(path, offset, zoom).map(toLiteral), casing, line }]
    })
  }, [day, color, index, offset, zoom])

  return lines.map(({ key, path, casing, line }) => (
    <LegPolyline key={key} path={path} casing={casing} line={line} />
  ))
}

function LegPolyline({
  path,
  casing,
  line,
}: {
  path: google.maps.LatLngLiteral[]
  casing?: PolylineOptions
  line: PolylineOptions
}) {
  return (
    <>
      {casing && <Polyline path={path} {...casing} />}
      <Polyline path={path} {...line} />
    </>
  )
}

/** 一個地點的標記：一般是圓形編號；同一天去兩次是「1·10」；多天共用時每天一段顏色。 */
function PlaceMarker({
  place,
  selected,
  baseZ,
  onClick,
}: {
  place: Place
  selected: StopRef | null
  baseZ: number
  onClick: () => void
}) {
  const { byDay } = place
  const allOptional = byDay.every((g) => g.optional)
  const names = [...new Set(place.visits.map((v) => v.name))].join('／')
  const title =
    place.visits.length === 1
      ? `Day ${place.visits[0].dayId} 第 ${place.visits[0].num} 站：${names}`
      : `${names}（${place.visits.length} 次行程經過，點一下選擇）`
  const cls = `mk${selected ? ' is-selected' : ''}`

  let content
  if (byDay.length >= COMPACT_DAYS) {
    content = (
      <span className={`${cls} mk-days`}>
        <b>D</b>
        {byDay.map((g) => (
          <i key={g.dayId} style={{ '--day': g.color } as CSSProperties}>
            {g.dayId}
          </i>
        ))}
      </span>
    )
  } else if (byDay.length > 1) {
    content = (
      <span className={`${cls} mk-row`}>
        {byDay.map((g) => (
          <i
            key={g.dayId}
            className={g.optional ? 'is-optional' : undefined}
            style={{ '--day': g.color } as CSSProperties}
          >
            D{g.dayId}·{g.nums.join('·')}
          </i>
        ))}
      </span>
    )
  } else {
    content = (
      <span
        className={`${cls}${allOptional ? ' is-optional' : ''}`}
        style={{ '--day': byDay[0].color } as CSSProperties}
      >
        {byDay[0].nums.join('·')}
      </span>
    )
  }

  return (
    <AdvancedMarker
      position={toLiteral(place.ll)}
      title={title}
      zIndex={selected ? 900 : baseZ * 10 + (allOptional ? 0 : 5)}
      anchorLeft="-50%"
      anchorTop="-50%"
      onClick={onClick}
    >
      {content}
    </AdvancedMarker>
  )
}

/** 縮小時重疊在一起的地點：顯示數量和包含哪幾天，點一下放大 */
function ClusterMarker({ cluster, onClick }: { cluster: Cluster; onClick: () => void }) {
  const days = clusterDays(cluster)
  const names = cluster.places.map((p) => p.visits[0].name)
  return (
    <AdvancedMarker
      position={toLiteral(cluster.ll)}
      title={`這附近有 ${cluster.places.length} 個地點（${names.join('、')}），點一下放大`}
      zIndex={800}
      anchorLeft="-50%"
      anchorTop="-50%"
      onClick={onClick}
    >
      <span className="mk-cluster">
        <b>{cluster.places.length}</b>
        <span className="mk-cluster-days" aria-hidden>
          {days.map((d) => (
            <i key={d.dayId} style={{ background: d.color }} />
          ))}
        </span>
      </span>
    </AdvancedMarker>
  )
}

/** 點合併標記後跳出的選單：列出經過這裡的每一次行程 */
function PlacePicker({ place, onPick }: { place: Place; onPick: (ref: StopRef) => void }) {
  return (
    <AdvancedMarker
      position={toLiteral(place.ll)}
      zIndex={1000}
      anchorLeft="-50%"
      anchorTop="-100%"
      // 不可點的標記收不到滑鼠和觸控，選單裡的按鈕會沒反應；實際處理在各按鈕的 onClick
      onClick={() => {}}
    >
      <div className="mk-picker" role="menu" aria-label="選擇行程">
        <p>{place.visits.length} 次行程經過這裡</p>
        {place.visits.map((v) => (
          <button
            key={`${v.dayId}-${v.stopId}`}
            type="button"
            role="menuitem"
            style={{ '--day': v.color } as CSSProperties}
            onClick={() => onPick({ dayId: v.dayId, stopId: v.stopId })}
          >
            <span className={`mk-picker-num${v.optional ? ' is-optional' : ''}`}>{v.num}</span>
            <span>
              <small>Day {v.dayId}</small>
              {v.name}
            </span>
          </button>
        ))}
      </div>
    </AdvancedMarker>
  )
}

/** 成群景點：淡色填滿＋虛線外框＋名稱 */
function GroupArea({ area }: { area: Area }) {
  const ring = useMemo(() => area.ring.map(toLiteral), [area])
  return (
    <>
      <Circle
        center={toLiteral(area.center)}
        radius={area.radius}
        strokeWeight={0}
        fillColor={area.color}
        fillOpacity={0.07}
        clickable={false}
        zIndex={0}
      />
      <Polyline
        path={ring}
        strokeOpacity={0}
        clickable={false}
        zIndex={1}
        icons={[
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeColor: area.color,
              strokeOpacity: 0.75,
              strokeWeight: 1.8,
              scale: 3,
            },
            offset: '0',
            repeat: '11px',
          },
        ]}
      />
      <AdvancedMarker
        position={toLiteral(northOf(area.center, area.radius))}
        zIndex={2}
        anchorLeft="-50%"
        anchorTop="-100%"
      >
        <span className="grp-label" style={{ '--day': area.color } as CSSProperties}>
          {area.name}
        </span>
      </AdvancedMarker>
    </>
  )
}
