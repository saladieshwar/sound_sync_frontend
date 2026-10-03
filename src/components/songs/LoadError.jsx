import { getApiError } from '../../api/client'

export default function LoadError({ error, onRetry }) {
  return (
    <div role="alert" className="flex items-center gap-3 text-sm text-red-400">
      <span>{getApiError(error).message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded border border-red-400/50 px-2 py-0.5 hover:bg-red-400/10"
        >
          Retry
        </button>
      )}
    </div>
  )
}
