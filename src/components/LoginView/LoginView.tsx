import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import './LoginView.css'

type LoginViewProps = {
  error: string | null
  onEdit: () => void
  onSubmit: (email: string, password: string) => void
}

export function LoginView({ error, onEdit, onSubmit }: LoginViewProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const visibleError = localError ?? error
  const canSubmit = email.trim().length > 0 && password.length > 0
  const passwordType = passwordVisible ? 'text' : 'password'
  const passwordToggleLabel = passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value)
    setLocalError(null)
    onEdit()
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value)
    setLocalError(null)
    onEdit()
  }

  function handleTogglePassword() {
    setPasswordVisible((current) => !current)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim()
    if (!canSubmit) {
      setLocalError('Completa correo y contraseña.')
      return
    }
    if (!isValidEmail(normalizedEmail)) {
      setLocalError('Ingresa un correo válido.')
      return
    }
    setLocalError(null)
    onSubmit(normalizedEmail, password)
  }

  function renderIntro(): ReactNode {
    return (
      <header className="login-intro">
        <h1 className="login-title">Iniciar sesión</h1>
        <p className="login-copy">Acceso a la interfaz de chat.</p>
      </header>
    )
  }

  function renderPasswordIcon(): ReactNode {
    if (passwordVisible) return <EyeOffIcon />
    return <EyeIcon />
  }

  function renderPasswordToggle(): ReactNode {
    return (
      <button
        type="button"
        className="login-password-toggle"
        aria-label={passwordToggleLabel}
        aria-pressed={passwordVisible}
        onClick={handleTogglePassword}
      >
        {renderPasswordIcon()}
      </button>
    )
  }

  function renderPasswordField(): ReactNode {
    return (
      <div className="login-field">
        <label htmlFor="login-password">Contraseña</label>
        <div className="login-password">
          <input
            id="login-password"
            type={passwordType}
            name="password"
            autoComplete="current-password"
            value={password}
            aria-invalid={visibleError !== null}
            onChange={handlePasswordChange}
          />
          {renderPasswordToggle()}
        </div>
      </div>
    )
  }

  function renderError(): ReactNode {
    if (!visibleError) return null
    return (
      <p className="login-error" role="alert">
        {visibleError}
      </p>
    )
  }

  function renderForm(): ReactNode {
    return (
      <form className="login-form" onSubmit={handleSubmit}>
        <label className="login-field">
          <span>Correo</span>
          <input
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            aria-invalid={visibleError !== null}
            onChange={handleEmailChange}
          />
        </label>
        {renderPasswordField()}
        {renderError()}
        <button type="submit" className="login-submit" disabled={!canSubmit}>
          Ingresar
        </button>
      </form>
    )
  }

  function renderCard(): ReactNode {
    return (
      <section className="login-card">
        {renderIntro()}
        {renderForm()}
      </section>
    )
  }

  return <main className="login">{renderCard()}</main>
}

function isValidEmail(email: string): boolean {
  return /^[-._a-z0-9]+@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,15})$/i.test(email)
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a18.4 18.4 0 0 1-4.1 4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.1 6.7C3.5 8.4 2 12 2 12s3.5 6 10 6c1.5 0 2.9-.3 4.1-.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
