import {
  AdvancedMarker,
  APIProvider,
  APILoadingStatus,
  Map,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps'
import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Day, LatLng, Trip } from '../data/schema.ts'
import { useOnline } from '../hooks/useMediaQuery.ts'
import type { StopRef } from '../components/StopSheet.tsx'
import { boundsOf } from './geo.ts'
import { MapLegend } from './MapLegend.tsx'
import { Overlay } from './Overlay.tsx'
import type { Cluster } from './places.ts'
import './TripMap.css'

export type MapPadding = { top: number; right: number; bottom: number; left: number }
/** 要飛到的位置；seq 每次都不同，點同一站兩次也會再飛一次 */
export type MapFocus = { ll: LatLng; seq: number; padding?: MapPadding }

type Props = {
  trip: Trip
  /** 目前顯示的天數 */
  days: Day[]
  selected: StopRef | null
  focus: MapFocus | null
  /** 地圖被其他元素（例如手機的行程抽屜）蓋住的範圍，縮放和置中時會避開 */
  getPadding: () => MapPadding
  onSelectStop: (ref: StopRef) => void
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''
const MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID'

export function TripMap(props: Props) {
  const online = useOnline()
  // 已經開始載入過，之後斷線就讓 Google 地圖自己處理（已載入的圖磚還能看）
  const [started, setStarted] = useState(online)
  if (online && !started) setStarted(true)

  if (!API_KEY) {
    return (
      <MapNotice title="地圖尚未設定">缺少 Google 地圖 API key，行程列表仍可正常使用。</MapNotice>
    )
  }
  if (!started) {
    return (
      <MapNotice title="離線中，地圖暫時無法使用">
        行程、備註和看過的照片仍可使用，恢復連線後地圖會自動載入。
      </MapNotice>
    )
  }
  return (
    <MapErrorBoundary>
      <APIProvider apiKey={API_KEY} language="zh-TW" region={props.trip.region ?? 'JP'}>
        <MapBody {...props} />
      </APIProvider>
    </MapErrorBoundary>
  )
}

/** Google 地圖出錯（例如 API key 驗證失敗後內部拋錯）時，只讓地圖區塊顯示錯誤，列表照常可用。 */
class MapErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <MapNotice title="Google 地圖載入失敗">
          請確認網路連線後重新整理頁面；如果一直出現，可能是 API key 的網址限制沒有包含這個網站。
          行程列表仍可正常使用。
        </MapNotice>
      )
    }
    return this.props.children
  }
}

function MapBody({ trip, days, selected, focus, getPadding, onSelectStop }: Props) {
  const status = useApiLoadingStatus()
  const [overlay, setOverlay] = useState(true)
  const [me, setMe] = useState<google.maps.LatLngLiteral | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [legend, setLegend] = useState(false)
  const [zoom, setZoom] = useState<number | null>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const map = useMap()

  const fitKey = days.map((d) => d.id).join(',')
  const initialBounds = useMemo(() => boundsOf(trip.days), [trip])

  // 換天數時縮放到剛好看得到全部景點
  useEffect(() => {
    if (!map) return
    fit(map, days, getPadding())
    // 只在天數改變時重新縮放；getPadding 每次 render 都是新的函式
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey])

  // 點列表上的景點時飛過去
  useEffect(() => {
    if (map && focus) flyTo(map, focus.ll, focus.padding ?? getPadding())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focus])

  // 換天數時關掉合併標記的選單
  useEffect(() => setOpenKey(null), [fitKey])

  // 點叢集：放大到看得到裡面每個地點
  const onCluster = useCallback(
    (c: Cluster) => {
      if (!map) return
      const lats = c.places.map((p) => p.ll[0])
      const lngs = c.places.map((p) => p.ll[1])
      map.fitBounds(
        {
          north: Math.max(...lats),
          south: Math.min(...lats),
          east: Math.max(...lngs),
          west: Math.min(...lngs),
        },
        getPadding(),
      )
    },
    [map, getPadding],
  )

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(t)
  }, [message])

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <MapNotice title="Google 地圖載入失敗">
        {status === APILoadingStatus.AUTH_FAILURE
          ? 'API key 驗證失敗，請確認 key 的網址限制有包含這個網站。'
          : '請確認網路連線後重新整理頁面。'}
        行程列表仍可正常使用。
      </MapNotice>
    )
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      setMessage('這個瀏覽器無法取得位置')
      return
    }
    setMessage('正在取得你的位置…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMe(ll)
        setMessage(null)
        if (map) flyTo(map, [ll.lat, ll.lng], getPadding())
      },
      (err) =>
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? '沒有位置權限，請到瀏覽器設定允許這個網站使用位置'
            : '無法取得位置，請稍後再試',
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    )
  }

  return (
    <div className="map-wrap">
      <Map
        className="map-canvas"
        mapId={MAP_ID}
        defaultBounds={initialBounds ? { ...initialBounds, padding: 40 } : undefined}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons
        reuseMaps
        onIdle={(e) => setZoom(e.map.getZoom() ?? null)}
        onClick={() => setOpenKey(null)}
      >
        {overlay && zoom !== null && (
          <Overlay
            trip={trip}
            days={days}
            zoom={zoom}
            selected={selected}
            openKey={openKey}
            onOpen={setOpenKey}
            onSelect={onSelectStop}
            onCluster={onCluster}
          />
        )}
        {me && (
          <AdvancedMarker position={me} zIndex={1000} title="我的位置">
            <span className="mk-me" />
          </AdvancedMarker>
        )}
      </Map>

      <div className="map-controls">
        <MapButton
          label={overlay ? '隱藏行程' : '顯示行程'}
          pressed={!overlay}
          onClick={() => setOverlay((v) => !v)}
          icon={overlay ? <IconLayers /> : <IconLayersOff />}
        />
        <MapButton
          label="全覽"
          onClick={() => map && fit(map, days, getPadding())}
          icon={<IconFit />}
        />
        <MapButton label="我的位置" onClick={locate} icon={<IconLocate />} />
        <MapButton
          label="圖例"
          pressed={legend}
          onClick={() => setLegend((v) => !v)}
          icon={<IconLegend />}
        />
      </div>

      {legend && <MapLegend onClose={() => setLegend(false)} />}

      {!overlay && !legend && (
        <p className="map-hint" role="status">
          已隱藏行程路線，可以直接點 Google 地圖上的地點查看資訊
        </p>
      )}
      {message && !legend && (
        <p className="map-hint" role="status">
          {message}
        </p>
      )}
    </div>
  )
}

function fit(map: google.maps.Map, days: Day[], padding: MapPadding) {
  const b = boundsOf(days)
  if (!b) return
  map.fitBounds(b, padding)
  // 只有一個點或點很集中時不要放到最大
  google.maps.event.addListenerOnce(map, 'idle', () => {
    if ((map.getZoom() ?? 0) > 16) map.setZoom(16)
  })
}

/** 飛到某個點，並讓它落在沒被遮住的範圍正中間。 */
function flyTo(map: google.maps.Map, [lat, lng]: LatLng, pad: MapPadding) {
  const zoom = Math.max(map.getZoom() ?? 0, 15)
  if (map.getZoom() !== zoom) map.setZoom(zoom)
  const proj = map.getProjection()
  const point = proj?.fromLatLngToPoint({ lat, lng })
  if (!proj || !point) {
    map.panTo({ lat, lng })
    return
  }
  const scale = 2 ** zoom
  const center = proj.fromPointToLatLng(
    new google.maps.Point(
      point.x + (pad.right - pad.left) / 2 / scale,
      point.y + (pad.bottom - pad.top) / 2 / scale,
    ),
  )
  map.panTo(center ?? { lat, lng })
}

function MapNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="map-notice" role="status">
      <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden>
        <path
          d="M6 12l12-5 12 5 12-5v29l-12 5-12-5-12 5z M18 7v29 M30 12v29"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  )
}

function MapButton({
  label,
  icon,
  pressed,
  onClick,
}: {
  label: string
  icon: ReactNode
  pressed?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="map-btn"
      aria-pressed={pressed}
      onClick={onClick}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

const svg = { viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': true } as const
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function IconLayers() {
  return (
    <svg {...svg}>
      <path {...stroke} d="M12 3l9 5-9 5-9-5z M3 13l9 5 9-5" />
    </svg>
  )
}

function IconLayersOff() {
  return (
    <svg {...svg}>
      <path {...stroke} d="M12 3l9 5-9 5-9-5z M3 13l9 5 9-5" opacity="0.45" />
      <path {...stroke} d="M4 3l16 18" />
    </svg>
  )
}

function IconFit() {
  return (
    <svg {...svg}>
      <path {...stroke} d="M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5" />
    </svg>
  )
}

function IconLocate() {
  return (
    <svg {...svg}>
      <circle {...stroke} cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <path {...stroke} d="M12 2v3 M12 19v3 M2 12h3 M19 12h3" />
    </svg>
  )
}

function IconLegend() {
  return (
    <svg {...svg}>
      <path {...stroke} d="M4 6h3 M10 6h10 M4 12h3 M10 12h10 M4 18h3 M10 18h10" />
    </svg>
  )
}
