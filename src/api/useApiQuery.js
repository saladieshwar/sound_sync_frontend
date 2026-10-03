import { useCallback, useEffect, useState } from 'react'

/**
 * Runs `fetcher` (memoize it with useCallback) and tracks { data, loading, error, reload }.
 * Pass `null` to skip. Responses from a superseded fetcher are ignored.
 */
export default function useApiQuery(fetcher) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ fetcher: null, attempt: -1, data: undefined, error: null })

  useEffect(() => {
    if (!fetcher) return undefined
    let active = true
    fetcher().then(
      (data) => active && setResult({ fetcher, attempt, data, error: null }),
      (error) => active && setResult({ fetcher, attempt, data: undefined, error }),
    )
    return () => {
      active = false
    }
  }, [fetcher, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const settled = result.fetcher === fetcher && result.attempt === attempt

  if (!fetcher) return { data: undefined, loading: false, error: null, reload }
  return {
    data: settled ? result.data : undefined,
    loading: !settled,
    error: settled ? result.error : null,
    reload,
  }
}
