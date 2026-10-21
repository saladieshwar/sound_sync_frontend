import { useEffect, useState } from 'react'
import { getHealth } from '../../api/health'

const STYLES = {
  checking: { dot: 'bg-neutral-500', label: 'Checking API…' },
  online: { dot: 'bg-emerald-400', label: 'API online' },
  offline: { dot: 'bg-red-500', label: 'API offline' },
}

export default function BackendStatus() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false
    getHealth()
      .then((data) => !cancelled && setStatus(data.status === 'ok' ? 'online' : 'offline'))
      .catch(() => !cancelled && setStatus('offline'))
    return () => {
      cancelled = true
    }
  }, [])

  const { dot, label } = STYLES[status]
  return (
    <span
      data-testid="backend-status"
      data-status={status}
      className="flex items-center gap-2 text-xs text-neutral-400"
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
