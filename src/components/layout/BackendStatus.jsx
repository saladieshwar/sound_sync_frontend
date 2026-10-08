import { useEffect, useState } from 'react'
import { getHealth } from '../../api/health'

const STYLES = {
  checking: { dot: 'bg-neutral-500', label: 'Checking API…' },
  online: { dot: 'bg-emerald-400', label: 'API online' },
  offline: { dot: 'bg-red-500', label: 'API offline' },
}

/** `compact`: show only the coloured dot on phones (the label stays as a tooltip). */
export default function BackendStatus({ compact = false }) {
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
      title={label}
      className={`flex items-center gap-2 text-xs text-neutral-400 ${compact ? 'sm:rounded-full sm:border sm:border-white/5 sm:bg-white/5 sm:px-2.5 sm:py-1' : ''}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {status === 'online' && (
          <span className={`absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping ${dot}`} />
        )}
        <span className={`relative h-2 w-2 rounded-full ${dot}`} />
      </span>
      <span className={compact ? 'hidden sm:inline' : undefined}>{label}</span>
    </span>
  )
}
