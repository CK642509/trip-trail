import { useMemo, useSyncExternalStore } from 'react'

/** 只有兩個頁面，用 History API 自己處理，不需要路由套件。 */
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  window.addEventListener('hashchange', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
    window.removeEventListener('hashchange', listener)
  }
}

export function navigate(to: string, options: { replace?: boolean } = {}) {
  if (options.replace) history.replaceState(null, '', to)
  else history.pushState(null, '', to)
  listeners.forEach((l) => l())
}

export function useLocation(): URL {
  const href = useSyncExternalStore(subscribe, () => location.href)
  return useMemo(() => new URL(href), [href])
}

export type Route = { name: 'home' } | { name: 'trip'; slug: string } | { name: 'notFound' }

export function matchRoute(pathname: string): Route {
  if (pathname === '/' || pathname === '') return { name: 'home' }
  const m = /^\/t\/([a-z0-9-]+)\/?$/.exec(pathname)
  return m ? { name: 'trip', slug: m[1] } : { name: 'notFound' }
}

/** #day-3 → 3 */
export function dayFromHash(hash: string): number | null {
  const m = /^#day-(\d+)$/.exec(hash)
  return m ? Number(m[1]) : null
}
