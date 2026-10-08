import { useState } from 'react'
import { inputClass } from './AuthLayout'

function EyeIcon({ crossed }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M3 3l18 18" />}
    </svg>
  )
}

export default function PasswordInput({ testId, ...props }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input data-testid={testId} type={visible ? 'text' : 'password'} className={`${inputClass} pr-11`} {...props} />
      <button
        type="button"
        data-testid={`${testId}-toggle`}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-neutral-500 transition-colors hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <EyeIcon crossed={visible} />
      </button>
    </div>
  )
}
