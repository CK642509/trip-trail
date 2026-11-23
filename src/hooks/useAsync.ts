import { useCallback, useEffect, useState } from 'react'

export type AsyncState<T> =
  { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error'; error: Error }

/** 執行非同步函式並追蹤狀態；deps 改變或呼叫 retry 時重新執行。 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    fn().then(
      (data) => !cancelled && setState({ status: 'ok', data }),
      (error: unknown) =>
        !cancelled &&
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        }),
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}
