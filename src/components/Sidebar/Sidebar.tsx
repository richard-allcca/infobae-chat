import type { ReactNode } from 'react'
import type { ConversationSummary } from '../../types'
import './Sidebar.css'

type SidebarProps = {
  conversations: ConversationSummary[]
  activeId: string | null
  disabled: boolean
  onNewChat: () => void
  onSelect: (id: string) => void
  onLogout: () => void
}

export function Sidebar({ conversations, activeId, disabled, onNewChat, onSelect, onLogout }: SidebarProps) {
  function handleSelect(id: string) {
    onSelect(id)
  }

  function renderEmpty(): ReactNode {
    if (conversations.length > 0) return null
    return <p className="recents-empty">No hay conversaciones</p>
  }

  function renderConversations(): ReactNode {
    if (conversations.length === 0) return null
    return <ul>{conversations.map((conversation) => renderConversation(conversation))}</ul>
  }

  function renderConversation(conversation: ConversationSummary): ReactNode {
    const title = conversation.title ?? 'Sin título'
    const className = conversation.id === activeId ? 'active' : undefined

    return (
      <li key={conversation.id}>
        <button
          type="button"
          className={className}
          onClick={() => handleSelect(conversation.id)}
          disabled={disabled}
          title={title}
        >
          {title}
        </button>
      </li>
    )
  }

  function renderLogout(): ReactNode {
    return (
      <button type="button" className="sidebar-logout" onClick={onLogout} disabled={disabled}>
        Cerrar sesión
      </button>
    )
  }

  return (
    <aside className="sidebar">
      <button type="button" className="new-chat" onClick={onNewChat} disabled={disabled}>
        Nuevo chat
      </button>
      <section className="recents">
        <h2>Recientes</h2>
        {renderEmpty()}
        {renderConversations()}
      </section>
      {renderLogout()}
    </aside>
  )
}
