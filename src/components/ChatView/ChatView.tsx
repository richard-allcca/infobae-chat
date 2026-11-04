import { useEffect, useRef } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Message } from '../../types'
import { DebugActivity } from './DebugActivity'
import { SourceCards } from './SourceCards'
import './ChatView.css'

type ChatViewProps = {
  messages: Message[]
  draft: string
  streaming: boolean
  loadingDetail: boolean
  statusLabel: string | null
  error: string | null
  onDraftChange: (value: string) => void
  onSend: () => void
  onRetry: () => void
  canRetry: boolean
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function ChatView({
  messages,
  draft,
  streaming,
  loadingDetail,
  statusLabel,
  error,
  onDraftChange,
  onSend,
  onRetry,
  canRetry,
  sidebarOpen,
  onToggleSidebar,
}: ChatViewProps) {
  const threadRef = useRef<HTMLDivElement>(null)
  const canSend = draft.trim().length > 0 && !streaming && !loadingDetail
  const sendDisabled = !canSend

  useEffect(() => {
    const thread = threadRef.current
    if (!thread) return
    thread.scrollTop = thread.scrollHeight
  }, [messages, statusLabel, error])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSend) return
    onSend()
  }

  function handleDraftChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onDraftChange(event.target.value)
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    if (!canSend) return
    onSend()
  }

  function renderThread(): ReactNode {
    if (loadingDetail) return <p className="empty">Cargando conversación…</p>
    if (messages.length === 0) return <p className="empty">Listo cuando quieras.</p>
    return renderMessages()
  }

  function renderMessages(): ReactNode {
    return <div className="messages">{messages.map((message) => renderMessage(message))}</div>
  }

  function renderMessage(message: Message): ReactNode {
    if (!isVisibleMessage(message)) return null

    const className = `message ${message.role}`

    return (
      <article key={message.id} className={className}>
        {renderMessageBody(message)}
        {renderSources(message)}
      </article>
    )
  }

  function renderMessageBody(message: Message): ReactNode {
    if (message.role === 'assistant') return renderAssistantBody(message)
    return renderUserBody(message)
  }

  function renderAssistantBody(message: Message): ReactNode {
    return (
      <>
        <DebugActivity activity={message.activity} collapsed={hasAnswer(message)} />
        {renderAssistantMarkdown(message)}
      </>
    )
  }

  function renderAssistantMarkdown(message: Message): ReactNode {
    if (!message.content) return null
    return (
      <div className="markdown">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    )
  }

  function renderUserBody(message: Message): ReactNode {
    return <p>{message.content}</p>
  }

  function renderSources(message: Message): ReactNode {
    return <SourceCards messageId={message.id} sources={message.sources} />
  }

  function renderStatus(): ReactNode {
    if (!statusLabel) return null
    return <p className="status">{statusLabel}</p>
  }

  function renderError(): ReactNode {
    if (!error) return null
    return (
      <div className="error-row">
        <p className="error">{error}</p>
        {renderRetry()}
      </div>
    )
  }

  function renderMenu(): ReactNode {
    const label = sidebarOpen ? 'Cerrar conversaciones' : 'Abrir conversaciones'

    return (
      <button
        type="button"
        className="menu"
        aria-label={label}
        aria-expanded={sidebarOpen}
        onClick={onToggleSidebar}
      >
        <MenuIcon />
      </button>
    )
  }

  function renderRetry(): ReactNode {
    if (!canRetry) return null
    return (
      <button type="button" className="retry" onClick={onRetry} disabled={streaming}>
        Reintentar
      </button>
    )
  }

  return (
    <main className="chat">
      {renderMenu()}
      <div className="thread" ref={threadRef}>
        {renderThread()}
      </div>
      <div className="composer-wrap">
        {renderStatus()}
        {renderError()}
        <form className="composer" onSubmit={handleSubmit}>
          <textarea
            value={draft}
            maxLength={2000}
            rows={1}
            placeholder="Escribe un mensaje"
            disabled={loadingDetail}
            onChange={handleDraftChange}
            onKeyDown={handleDraftKeyDown}
          />
          <button type="submit" className="send" disabled={sendDisabled} aria-label="Enviar">
            <SendIcon />
          </button>
        </form>
      </div>
    </main>
  )
}

function hasAnswer(message: Message): boolean {
  return message.content.length > 0 || message.sources.length > 0
}

function isVisibleMessage(message: Message): boolean {
  if (message.role !== 'assistant') return true
  return message.content.length > 0 || message.sources.length > 0 || message.activity.length > 0
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 4v16" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
