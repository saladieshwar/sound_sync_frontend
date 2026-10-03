import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { getApiError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import AuthLayout, { buttonClass, inputClass } from './AuthLayout'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

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
          placeholder="Email"
          className={inputClass}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          data-testid="login-password"
          type="password"
          required
          placeholder="Password"
          className={inputClass}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button data-testid="login-submit" disabled={submitting} className={buttonClass}>
          Log in
        </button>
      </form>
      <p className="mt-4 text-sm text-neutral-400">
        No account?{' '}
        <Link to="/register" className="text-emerald-400 hover:underline">
          Register
        </Link>
      </p>
    </AuthLayout>
  )
}
