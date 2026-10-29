import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Message } from '../types'

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
}: ChatViewProps) {
  const threadRef = useRef<HTMLDivElement>(null)
  const canSend = draft.trim().length > 0 && !streaming && !loadingDetail

  useEffect(() => {
    const thread = threadRef.current
    if (!thread) return
    thread.scrollTop = thread.scrollHeight
  }, [messages, statusLabel, error])

  return (
    <main className="chat">
      <div className="thread" ref={threadRef}>
        {loadingDetail ? (
          <p className="empty">Cargando conversación…</p>
        ) : messages.length === 0 ? (
          <p className="empty">Listo cuando quieras.</p>
        ) : (
          <div className="messages">
            {messages.map((message) =>
              message.role === 'assistant' && !message.content && message.sources.length === 0 ? null : (
              <article key={message.id} className={`message ${message.role}`}>
                {message.role === 'assistant' ? (
                  <div className="markdown">
                    {message.content ? <ReactMarkdown>{message.content}</ReactMarkdown> : null}
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}
                {message.sources.length > 0 ? (
                  <ul className="sources">
                    {message.sources.filter((source) => source.url).map((source) => (
                      <li key={`${message.id}-${source.position}`}>
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.position}. {source.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            )) }
          </div>
        )}
      </div>

      <div className="composer-wrap">
        {statusLabel ? <p className="status">{statusLabel}</p> : null}
        {error ? (
          <div className="error-row">
            <p className="error">{error}</p>
            {canRetry ? (
              <button type="button" className="retry" onClick={onRetry} disabled={streaming}>
                Reintentar
              </button>
            ) : null}
          </div>
        ) : null}
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault()
            if (canSend) onSend()
          }}
        >
          <textarea
            value={draft}
            maxLength={2000}
            rows={1}
            placeholder="Escribe un mensaje"
            disabled={loadingDetail}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (canSend) onSend()
              }
            }}
          />
          <button type="submit" className="send" disabled={!canSend} aria-label="Enviar">
            <SendIcon />
          </button>
        </form>
      </div>
    </main>
  )
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
