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
  cited: boolean
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  sources: Source[]
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
