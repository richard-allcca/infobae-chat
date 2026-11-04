export type ConversationSummary = {
  id: string
  title: string | null
  updatedAt: string
}

export type Source = {
  position: number
  title: string
  url: string
  description: string | null
  publishedAt: string | null
  section: string | null
  author: string | null
  image: string | null
  cited: boolean
}

export type ToolActivityStatus = 'running' | 'completed'

export type ToolActivity = {
  toolCallId: string
  toolName: string
  input: unknown
  output: unknown | null
  status: ToolActivityStatus
}

export type ActivityItem =
  | { kind: 'reasoning'; text: string }
  | { kind: 'tool'; tool: ToolActivity }

export type DebugEvent =
  | { kind: 'reasoning'; text: string }
  | { kind: 'tool-call'; toolCallId: string; toolName: string; input: unknown }
  | { kind: 'tool-result'; toolCallId: string; toolName: string; output: unknown }

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  sources: Source[]
  activity: ActivityItem[]
}

export type ConversationDetail = ConversationSummary & {
  messages: Message[]
}

export type LimitError = {
  statusCode: number
  message: string
  limit: number
  resetAt: string
}

export type StreamError = {
  code: string
  message: string
}
