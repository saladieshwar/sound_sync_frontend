import { getApiError } from '../../api/client'

export default function LoadError({ error, onRetry }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
      <span className="flex-1">{getApiError(error).message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-full border border-red-400/40 px-3 py-1 text-xs font-medium transition-colors duration-200 hover:border-red-400/70 hover:bg-red-400/10 hover:text-red-200"
        >
          Retry
        </button>
      )}
    </div>
  )
}
