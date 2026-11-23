import type { ReactNode } from 'react'
import './StatusScreen.css'

/** 載入中、錯誤、找不到等整頁狀態。 */
export function StatusScreen({
  title,
  children,
  action,
  loading = false,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
  loading?: boolean
}) {
  return (
    <main className="status-screen" aria-busy={loading}>
      {loading ? (
        <span className="status-spinner" aria-hidden />
      ) : (
        <span className="brand-seal">旅</span>
      )}
      <h1>{title}</h1>
      {children && <div className="status-body">{children}</div>}
      {action}
    </main>
  )
}
