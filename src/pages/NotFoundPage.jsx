import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Link to="/" className="text-emerald-400 hover:underline">
        Back to Home
      </Link>
    </div>
  )
}
