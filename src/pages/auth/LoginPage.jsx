import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { getApiError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import AuthLayout, { ButtonSpinner, buttonClass, inputClass } from './AuthLayout'
import PasswordInput from './PasswordInput'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorCount, setErrorCount] = useState(0)

  // Successful login flips isAuthenticated, so this redirect also handles post-login navigation.
  const from = location.state?.from
  if (isAuthenticated) return <Navigate to={from ? `${from.pathname}${from.search ?? ''}` : '/'} replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(form.email, form.password)
    } catch (err) {
      setError(getApiError(err).message)
      setErrorCount((n) => n + 1)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Log in to your account">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          data-testid="login-email"
          type="email"
          required
          aria-label="Email"
          autoComplete="email"
          placeholder="Email"
          className={inputClass}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <PasswordInput
          testId="login-password"
          required
          aria-label="Password"
          autoComplete="current-password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && (
          <p
            key={errorCount}
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300 motion-safe:animate-shake"
          >
            {error}
          </p>
        )}
        <button data-testid="login-submit" disabled={submitting} className={buttonClass}>
          {submitting && <ButtonSpinner />}
          Log in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-400">
        No account?{' '}
        <Link
          to="/register"
          className="font-medium text-emerald-400 underline-offset-4 transition-colors hover:text-emerald-300 hover:underline"
        >
          Register
        </Link>
      </p>
    </AuthLayout>
  )
}
