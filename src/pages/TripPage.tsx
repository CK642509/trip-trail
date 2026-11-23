import { useEffect, useState } from 'react'
import { fetchIndex, fetchTrip, LoadError } from '../data/api.ts'
import { hashPassword } from '../data/password.ts'
import { useAsync } from '../hooks/useAsync.ts'
import { isUnlocked, remember } from '../lib/unlock.ts'
import { navigate, useLocation } from '../lib/router.ts'
import { PasswordGate } from '../components/PasswordGate.tsx'
import { StatusScreen } from '../components/StatusScreen.tsx'
import { TripView } from '../components/TripView.tsx'

export function TripPage({ slug }: { slug: string }) {
  const url = useLocation()
  const index = useAsync(fetchIndex, [])
  const entry = index.status === 'ok' ? index.data.trips.find((t) => t.slug === slug) : undefined
  const expectedHash = entry?.hash ?? null
  const [keyError, setKeyError] = useState(false)
  const [, setUnlockedAt] = useState(0)

  // 網址帶 ?key= 時：驗證密碼、記住結果，然後從網址列移除密碼
  const key = url.searchParams.get('key')
  useEffect(() => {
    if (!entry || key === null) return
    let cancelled = false
    void hashPassword(slug, key).then((hash) => {
      if (cancelled) return
      if (expectedHash === null || hash === expectedHash) remember({ slug, hash: expectedHash })
      else setKeyError(true)
      navigate(`${location.pathname}${location.hash}`, { replace: true })
    })
    return () => {
      cancelled = true
    }
  }, [entry, slug, expectedHash, key])

  const gate: 'checking' | 'locked' | 'open' =
    !entry || key !== null ? 'checking' : isUnlocked(slug, expectedHash) ? 'open' : 'locked'

  if (index.status === 'error') {
    return (
      <StatusScreen
        title="無法載入"
        action={
          <button className="btn" onClick={index.retry}>
            重試
          </button>
        }
      >
        {index.error.message}
      </StatusScreen>
    )
  }
  if (index.status === 'ok' && !entry) {
    return (
      <StatusScreen
        title="找不到這趟旅程"
        action={
          <a className="btn" href="/">
            回首頁
          </a>
        }
      >
        旅程代號「{slug}」不存在，請確認連結是否正確。
      </StatusScreen>
    )
  }
  if (gate === 'checking') return <StatusScreen title="載入中" loading />
  if (gate === 'locked') {
    return (
      <PasswordGate
        slug={slug}
        expectedHash={expectedHash!}
        keyError={keyError}
        onUnlock={() => {
          remember({ slug, hash: expectedHash })
          setUnlockedAt(Date.now()) // 重新 render，讓 isUnlocked 讀到新狀態
        }}
      />
    )
  }
  return <TripLoader slug={slug} />
}

function TripLoader({ slug }: { slug: string }) {
  const trip = useAsync(() => fetchTrip(slug), [slug])

  useEffect(() => {
    if (trip.status === 'ok') {
      const { title, start, end } = trip.data
      remember({ slug, title, start, end })
      document.title = title
    }
  }, [trip, slug])

  if (trip.status === 'loading') return <StatusScreen title="載入行程中" loading />
  if (trip.status === 'error') {
    const notFound = trip.error instanceof LoadError && trip.error.kind === 'notFound'
    return (
      <StatusScreen
        title={notFound ? '找不到這趟旅程' : '無法載入行程'}
        action={
          <button className="btn" onClick={trip.retry}>
            重試
          </button>
        }
      >
        {trip.error.message}
      </StatusScreen>
    )
  }
  return <TripView trip={trip.data} />
}
