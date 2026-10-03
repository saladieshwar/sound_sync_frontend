import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getApiError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import AuthLayout, { buttonClass, inputClass } from './AuthLayout'

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await register(form.username, form.email, form.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(getApiError(err).message)
    } finally {
      setSubmitting(false)
    }
  }

  const field = (name, type, placeholder, extra = {}) => (
    <input
      data-testid={`register-${name}`}
      type={type}
      required
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
        {field('username', 'text', 'Username', { minLength: 2, maxLength: 50 })}
        {field('email', 'email', 'Email')}
        {field('password', 'password', 'Password (min 8 characters)', { minLength: 8 })}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button data-testid="register-submit" disabled={submitting} className={buttonClass}>
          Register
        </button>
      </form>
      <p className="mt-4 text-sm text-neutral-400">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-400 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
