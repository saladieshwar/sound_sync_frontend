import BrandLogo from '../../components/layout/BrandLogo'

const HIGHLIGHTS = [
  'Stream your whole library in one place',
  'Listen in perfect sync with friends',
  'Like songs and pick up where you left off',
]

export default function AuthLayout({ title, children }) {
  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute -right-32 -bottom-40 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/70 shadow-2xl shadow-black/50 backdrop-blur-xl motion-safe:animate-rise lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-emerald-500/20 via-emerald-900/20 to-transparent p-10 lg:flex">
          <div aria-hidden="true" className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
          <BrandLogo variant="mark" />
          <div className="relative">
            <p className="text-3xl leading-tight font-bold tracking-tight text-white">
              Music that brings
              <br />
              everyone together.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {HIGHLIGHTS.map((text) => (
                <li key={text} className="flex items-center gap-3 text-sm text-neutral-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                      <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div aria-hidden="true" className="flex h-10 items-end gap-1">
            {[0.4, 0.75, 0.55, 1, 0.65, 0.85, 0.45, 0.7, 0.5].map((h, i) => (
              <span
                key={i}
                style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s` }}
                className="w-1.5 origin-bottom rounded-full bg-linear-to-t from-emerald-600 to-emerald-300 opacity-70 motion-safe:animate-eq"
              />
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <h1 className="mb-8 lg:sr-only lg:mb-0">
            <span className="lg:hidden">
              <BrandLogo variant="auth" />
            </span>
            <span className="hidden lg:inline">MusicPartner</span>
          </h1>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="mt-1 mb-6 text-sm text-neutral-400">Welcome — it only takes a moment.</p>
          {children}
        </div>
      </div>
    </div>
  )
}

export const inputClass =
  'w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none transition duration-200 hover:border-white/20 focus:border-emerald-500/60 focus:ring-4 focus:ring-emerald-500/15'
export function ButtonSpinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 rounded-full border-2 border-neutral-950/30 border-t-neutral-950 motion-safe:animate-spin"
    />
  )
}

export const buttonClass =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-400 to-emerald-500 py-3 text-sm font-semibold text-neutral-950 shadow-lg shadow-emerald-500/25 transition duration-200 hover:-translate-y-px hover:from-emerald-300 hover:to-emerald-400 hover:shadow-emerald-500/40 active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50'
