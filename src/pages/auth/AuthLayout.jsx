export default function AuthLayout({ title, children }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl bg-neutral-900 p-8 shadow-xl">
        <h1 className="mb-1 text-2xl font-bold text-emerald-400">SoundSync</h1>
        <h2 className="mb-6 text-neutral-300">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export const inputClass =
  'w-full rounded-md bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500'
export const buttonClass =
  'w-full rounded-md bg-emerald-500 py-2 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50'
