export type Session = {
  email: string
}

const storageKey = 'infobae-chat.session'
const acceptedEmail = 'admin@infobae.com'
const acceptedPassword = 'infobae-chat'

export function matchesCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === acceptedEmail && password === acceptedPassword
}

export function createSession(email: string): Session {
  return { email: email.trim().toLowerCase() }
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || !('email' in parsed)) return null
    const email = (parsed as { email: unknown }).email
    if (typeof email !== 'string' || email.trim().toLowerCase() !== acceptedEmail) return null
    return { email: acceptedEmail }
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(storageKey, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(storageKey)
}
