import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getApiError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import AuthLayout, { ButtonSpinner, buttonClass, inputClass } from './AuthLayout'
import PasswordInput from './PasswordInput'

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorCount, setErrorCount] = useState(0)

  // register() logs the user in, which flips isAuthenticated and lands them on Home.
  if (isAuthenticated) return <Navigate to="/" replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await register(form.username, form.email, form.password)
    } catch (err) {
      setError(getApiError(err).message)
      setErrorCount((n) => n + 1)
      setSubmitting(false)
    }
  }

  const field = (name, type, label, placeholder, extra = {}) => (
    <input
      data-testid={`register-${name}`}
      type={type}
      required
      aria-label={label}
      placeholder={placeholder}
      className={inputClass}
      value={form[name]}
      onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      {...extra}
    />
  )

  return (
    <AuthLayout title="Create your account">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {field('username', 'text', 'Username', 'Username', {
          minLength: 2,
          maxLength: 50,
          autoComplete: 'username',
        })}
        {field('email', 'email', 'Email', 'Email', { autoComplete: 'email' })}
        <PasswordInput
          testId="register-password"
          required
          minLength={8}
          maxLength={72}
          aria-label="Password"
          autoComplete="new-password"
          placeholder="Password (8–72 characters)"
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
        <button data-testid="register-submit" disabled={submitting} className={buttonClass}>
          {submitting && <ButtonSpinner />}
          Register
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-emerald-400 underline-offset-4 transition-colors hover:text-emerald-300 hover:underline"
        >
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
