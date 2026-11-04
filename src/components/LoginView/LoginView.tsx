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
  const [localError, setLocalError] = useState<string | null>(null)
  const visibleError = localError ?? error
  const canSubmit = email.trim().length > 0 && password.length > 0

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) {
      setLocalError('Completa correo y contraseña.')
      return
    }
    setLocalError(null)
    onSubmit(email.trim(), password)
  }

  function renderIntro(): ReactNode {
    return (
      <header className="login-intro">
        <h1 className="login-title">Iniciar sesión</h1>
        <p className="login-copy">Acceso a la interfaz de chat.</p>
      </header>
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
        <label className="login-field">
          <span>Contraseña</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            aria-invalid={visibleError !== null}
            onChange={handlePasswordChange}
          />
        </label>
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
