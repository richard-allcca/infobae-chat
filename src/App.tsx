import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { applyDebugEvent } from './activity'
import {
  createConversation,
  formatRequestError,
  getConversation,
  listConversations,
  sendMessage,
} from './api/chat'
import { clearSession, createSession, matchesCredentials, readSession, saveSession } from './auth/session'
import type { Session } from './auth/session'
import { ChatView } from './components/ChatView/ChatView'
import { LoginView } from './components/LoginView/LoginView'
import { Sidebar } from './components/Sidebar/Sidebar'
import type { ConversationSummary, DebugEvent, Message, Source, StreamError } from './types'
import './App.css'

const knownStages: Record<string, string> = {
  thinking: 'Pensando…',
  searching: 'Buscando…',
  reading: 'Leyendo…',
}

function localMessage(role: Message['role'], content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    sources: [],
    activity: [],
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => readSession())
  const [loginError, setLoginError] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [statusLabel, setStatusLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryText, setRetryText] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const refreshList = useCallback(async () => {
    const list = await listConversations()
    setConversations(list)
  }, [])

  useEffect(() => {
    if (!session) return

    let cancelled = false
    listConversations()
      .then((list) => {
        if (!cancelled) setConversations(list)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(formatRequestError(reason))
      })
    return () => {
      cancelled = true
    }
  }, [session])

  useEffect(() => {
    if (!sidebarOpen) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setSidebarOpen(false)
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [sidebarOpen])

  function handleLogin(email: string, password: string) {
    if (!matchesCredentials(email, password)) {
      setLoginError('Correo o contraseña incorrectos.')
      return
    }
    const next = createSession(email)
    saveSession(next)
    setLoginError(null)
    setSession(next)
  }

  function handleLoginEdit() {
    setLoginError(null)
  }

  function handleLogout() {
    clearSession()
    setSession(null)
    setLoginError(null)
    setConversations([])
    setActiveId(null)
    setMessages([])
    setDraft('')
    setError(null)
    setRetryText(null)
    setStatusLabel(null)
    setSidebarOpen(false)
  }

  async function handleNewChat() {
    setSidebarOpen(false)
    if (streaming || loadingDetail) return
    setError(null)
    setRetryText(null)
    setStatusLabel(null)
    try {
      const created = await createConversation()
      setActiveId(created.id)
      setMessages([])
      await refreshList()
    } catch (reason) {
      setError(formatRequestError(reason))
    }
  }

  async function handleSelect(id: string) {
    setSidebarOpen(false)
    if (streaming || loadingDetail || id === activeId) return
    setError(null)
    setRetryText(null)
    setStatusLabel(null)
    setActiveId(id)
    setLoadingDetail(true)
    try {
      const detail = await getConversation(id)
      setMessages(detail.messages)
    } catch (reason) {
      setMessages([])
      setError(formatRequestError(reason))
    } finally {
      setLoadingDetail(false)
    }
  }

  async function deliver(text: string, conversationId: string, mode: 'new' | 'retry') {
    const user = mode === 'new' ? localMessage('user', text) : null
    const assistant = localMessage('assistant', '')
    setMessages((current) => {
      if (!user) {
        const last = current[current.length - 1]
        const withoutLastAssistant = last?.role === 'assistant' ? current.slice(0, -1) : current
        return [...withoutLastAssistant, assistant]
      }
      return [...current, user, assistant]
    })

    let failed = false
    let started = false
    let thrown: unknown

    const handlers = {
      onStatus: (stage: string) => {
        const label = knownStages[stage]
        if (label) setStatusLabel(label)
      },
      onDelta: (chunk: string) => {
        started = true
        setMessages((current) =>
          current.map((message) =>
            message.id === assistant.id ? { ...message, content: message.content + chunk } : message,
          ),
        )
      },
      onSources: (sources: Source[]) => {
        started = true
        setMessages((current) =>
          current.map((message) => (message.id === assistant.id ? { ...message, sources } : message)),
        )
      },
      onDebug: (event: DebugEvent) => {
        started = true
        setMessages((current) =>
          current.map((message) =>
            message.id === assistant.id ? { ...message, activity: applyDebugEvent(message.activity, event) } : message,
          ),
        )
      },
      onError: (streamError: StreamError) => {
        failed = true
        setRetryText(text)
        setError(streamError.message)
      },
      onDone: () => {
        setStatusLabel(null)
      },
    }

    try {
      await sendMessage(conversationId, text, handlers)
      if (!failed) setRetryText(null)
    } catch (reason) {
      if (!started) {
        setMessages((current) => current.filter((message) => message.id !== assistant.id && message.id !== user?.id))
      }
      thrown = reason
    }

    try {
      await refreshList()
    } catch (reason) {
      if (!thrown) setError(formatRequestError(reason))
    }
    if (thrown) throw thrown
  }

  async function handleSend() {
    const text = draft.trim()
    if (!text || streaming || loadingDetail) return
    setDraft('')
    setError(null)
    setRetryText(null)
    setStreaming(true)
    try {
      let conversationId = activeId
      if (!conversationId) {
        const created = await createConversation()
        conversationId = created.id
        setActiveId(created.id)
        setMessages([])
        await refreshList()
      }
      await deliver(text, conversationId, 'new')
    } catch (reason) {
      setDraft(text)
      setError(formatRequestError(reason))
    } finally {
      setStreaming(false)
      setStatusLabel(null)
    }
  }

  async function handleRetry() {
    if (!retryText || !activeId || streaming) return
    const text = retryText
    setError(null)
    setStreaming(true)
    try {
      await deliver(text, activeId, 'retry')
    } catch (reason) {
      setRetryText(text)
      setError(formatRequestError(reason))
    } finally {
      setStreaming(false)
      setStatusLabel(null)
    }
  }

  const sidebarDisabled = streaming || loadingDetail
  const canRetry = retryText !== null
  const appClassName = sidebarOpen ? 'app sidebar-open' : 'app'

  function handleToggleSidebar() {
    setSidebarOpen((open) => !open)
  }

  function handleCloseSidebar() {
    setSidebarOpen(false)
  }

  function handleNewChatClick() {
    void handleNewChat()
  }

  function handleSelectConversation(id: string) {
    void handleSelect(id)
  }

  function handleSendClick() {
    void handleSend()
  }

  function handleRetryClick() {
    void handleRetry()
  }

  function handleLogoutClick() {
    handleLogout()
  }

  function renderBackdrop(): ReactNode {
    if (!sidebarOpen) return null

    return (
      <button type="button" className="backdrop" aria-label="Cerrar conversaciones" onClick={handleCloseSidebar} />
    )
  }

  function renderLogin(): ReactNode {
    return <LoginView error={loginError} onEdit={handleLoginEdit} onSubmit={handleLogin} />
  }

  function renderChat(): ReactNode {
    return (
      <div className={appClassName}>
        {renderBackdrop()}
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          disabled={sidebarDisabled}
          onNewChat={handleNewChatClick}
          onSelect={handleSelectConversation}
          onLogout={handleLogoutClick}
        />
        <ChatView
          messages={messages}
          draft={draft}
          streaming={streaming}
          loadingDetail={loadingDetail}
          statusLabel={statusLabel}
          error={error}
          canRetry={canRetry}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          onDraftChange={setDraft}
          onSend={handleSendClick}
          onRetry={handleRetryClick}
        />
      </div>
    )
  }

  function renderScreen(): ReactNode {
    if (!session) return renderLogin()
    return renderChat()
  }

  return renderScreen()
}
