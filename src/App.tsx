import { useCallback, useEffect, useState } from 'react'
import {
  createConversation,
  formatRequestError,
  getConversation,
  listConversations,
  sendMessage,
} from './api/chat'
import { ChatView } from './components/ChatView'
import { Sidebar } from './components/Sidebar'
import type { ConversationSummary, Message } from './types'

const knownStages: Record<string, string> = {
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
  }
}

export default function App() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [statusLabel, setStatusLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryText, setRetryText] = useState<string | null>(null)

  const refreshList = useCallback(async () => {
    const list = await listConversations()
    setConversations(list)
  }, [])

  useEffect(() => {
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
  }, [])

  async function handleNewChat() {
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
    try {
      await sendMessage(conversationId, text, {
        onStatus: (stage) => {
          const label = knownStages[stage]
          if (label) setStatusLabel(label)
        },
        onDelta: (chunk) => {
          started = true
          setMessages((current) =>
            current.map((message) =>
              message.id === assistant.id ? { ...message, content: message.content + chunk } : message,
            ),
          )
        },
        onSources: (sources) => {
          started = true
          setMessages((current) =>
            current.map((message) => (message.id === assistant.id ? { ...message, sources } : message)),
          )
        },
        onError: (streamError) => {
          failed = true
          setRetryText(text)
          setError(streamError.message)
        },
        onDone: () => {
          setStatusLabel(null)
        },
      })
      if (!failed) setRetryText(null)
    } catch (reason) {
      if (!started) {
        setMessages((current) =>
          current.filter((message) => message.id !== assistant.id && message.id !== user?.id),
        )
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

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        disabled={streaming || loadingDetail}
        onNewChat={() => {
          void handleNewChat()
        }}
        onSelect={(id) => {
          void handleSelect(id)
        }}
      />
      <ChatView
        messages={messages}
        draft={draft}
        streaming={streaming}
        loadingDetail={loadingDetail}
        statusLabel={statusLabel}
        error={error}
        canRetry={retryText !== null}
        onDraftChange={setDraft}
        onSend={() => {
          void handleSend()
        }}
        onRetry={() => {
          void handleRetry()
        }}
      />
    </div>
  )
}
