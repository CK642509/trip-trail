import type { ReactNode } from 'react'

const INK = '#3d3a33'

/** 線型樣本，和 legStyle.ts 的地圖線型對應 */
function Line({ kind }: { kind: 'rail' | 'bus' | 'boat' | 'walk' | 'open' | 'optional' }) {
  const common = { x1: 4, y1: 9, x2: 52, y2: 9, stroke: INK }
  return (
    <svg width="56" height="18" viewBox="0 0 56 18" aria-hidden>
      {kind === 'rail' && (
        <>
          <line {...common} stroke="#fff" strokeWidth={8} opacity={0.9} />
          <line {...common} strokeWidth={5} />
        </>
      )}
      {kind === 'bus' && <line {...common} strokeWidth={4} strokeDasharray="9.6 7.2" />}
      {kind === 'optional' && (
        <line {...common} strokeWidth={5} strokeDasharray="12 9" opacity={0.6} />
      )}
      {kind === 'boat' && (
        <line {...common} strokeWidth={4} strokeDasharray="0 12" strokeLinecap="round" />
      )}
      {kind === 'walk' && (
        <line {...common} strokeWidth={3} strokeDasharray="0 9" strokeLinecap="round" />
      )}
      {kind === 'open' && <line {...common} strokeWidth={2} strokeDasharray="4 8" opacity={0.55} />}
    </svg>
  )
}

function Row({ sample, children }: { sample: ReactNode; children: ReactNode }) {
  return (
    <li>
      <span className="legend-sample">{sample}</span>
      <span>{children}</span>
    </li>
  )
}

/** 地圖圖例：線型、標記和成群圈的意思 */
export function MapLegend({ onClose }: { onClose: () => void }) {
  return (
    <section className="map-legend" aria-label="圖例">
      <header>
        <h2>圖例</h2>
        <button type="button" onClick={onClose} aria-label="關閉圖例">
          ×
        </button>
      </header>
      <ul>
        <Row sample={<Line kind="rail" />}>鐵道、地鐵</Row>
        <Row sample={<Line kind="bus" />}>巴士、計程車</Row>
        <Row sample={<Line kind="boat" />}>船</Row>
        <Row sample={<Line kind="walk" />}>步行</Row>
        <Row sample={<Line kind="open" />}>交通方式未定（只表示順序）</Row>
        <Row
          sample={
            <svg width="56" height="18" viewBox="0 0 56 18" aria-hidden>
              <line x1="4" y1="9" x2="52" y2="9" stroke={INK} strokeWidth={3} />
              <path
                d="M32 9 L23 4.5 L25.5 9 L23 13.5 Z"
                fill={INK}
                stroke="#fff"
                strokeWidth={1.2}
              />
            </svg>
          }
        >
          箭頭是前進方向
        </Row>
      </ul>
      <ul>
        <Row
          sample={
            <span className="mk legend-mk" style={{ background: INK }}>
              3
            </span>
          }
        >
          當天第幾站，顏色代表哪一天
        </Row>
        <Row
          sample={
            <span className="mk is-optional legend-mk" style={{ ['--day' as string]: INK }}>
              5
            </span>
          }
        >
          可選行程的景點
        </Row>
        <Row sample={<Line kind="optional" />}>可選行程的路線（較淡）</Row>
        <Row
          sample={
            <span className="mk legend-mk" style={{ background: INK }}>
              1·10
            </span>
          }
        >
          同一天去了兩次的地點
        </Row>
        <Row
          sample={
            <span className="mk-cluster legend-cluster">
              <b>4</b>
            </span>
          }
        >
          這附近有幾個地點，點一下放大
        </Row>
        <Row sample={<span className="legend-group" />}>可以一起散步逛的區域（放大後才顯示）</Row>
      </ul>
    </section>
  )
}
