import type { ConversationSummary } from '../types'

type SidebarProps = {
  conversations: ConversationSummary[]
  activeId: string | null
  disabled: boolean
  onNewChat: () => void
  onSelect: (id: string) => void
}

export function Sidebar({ conversations, activeId, disabled, onNewChat, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <button type="button" className="new-chat" onClick={onNewChat} disabled={disabled}>
        Nuevo chat
      </button>
      <section className="recents">
        <h2>Recientes</h2>
        {conversations.length === 0 ? (
          <p className="recents-empty">No hay conversaciones</p>
        ) : (
          <ul>
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  className={conversation.id === activeId ? 'active' : undefined}
                  onClick={() => onSelect(conversation.id)}
                  disabled={disabled}
                  title={conversation.title ?? 'Sin título'}
                >
                  {conversation.title ?? 'Sin título'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
