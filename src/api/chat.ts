import type { ConversationDetail, ConversationSummary, DebugEvent, LimitError, Message, Source, StreamError } from '../types'

const productId = import.meta.env.VITE_PRODUCT_ID
const token = import.meta.env.VITE_API_TOKEN

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    super(extractMessage(body))
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export type SendHandlers = {
  onStatus?: (stage: string) => void
  onDelta?: (text: string) => void
  onSources?: (sources: Source[]) => void
  onDebug?: (event: DebugEvent) => void
  onError?: (error: StreamError) => void
  onDone?: () => void
}

export function readLimitError(error: unknown): LimitError | null {
  if (!(error instanceof ApiError) || error.status !== 429) return null
  if (!error.body || typeof error.body !== 'object') return null
  const body = error.body as Record<string, unknown>
  if (typeof body.message !== 'string' || typeof body.resetAt !== 'string') return null
  return {
    statusCode: 429,
    message: body.message,
    limit: typeof body.limit === 'number' ? body.limit : 0,
    resetAt: body.resetAt,
  }
}

export function formatRequestError(error: unknown): string {
  const limit = readLimitError(error)
  if (limit) {
    const when = new Date(limit.resetAt)
    const whenText = Number.isNaN(when.getTime()) ? limit.resetAt : when.toLocaleString()
    return `${limit.message}. Límite: ${limit.limit}. Se restablece: ${whenText}.`
  }
  if (error instanceof Error && error.message) return error.message
  return 'No se pudo completar la solicitud.'
}

export function listConversations(): Promise<ConversationSummary[]> {
  return request<ConversationSummary[]>('/conversations')
}

export function createConversation(): Promise<ConversationSummary> {
  return request<ConversationSummary>('/conversations', { method: 'POST' })
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  const detail = await request<ConversationDetail>(`/conversations/${encodeURIComponent(id)}`)
  return normalizeDetail(detail)
}

export async function sendMessage(id: string, text: string, handlers: SendHandlers): Promise<void> {
  const response = await fetch(endpoint(`/conversations/${encodeURIComponent(id)}/messages`), {
    method: 'POST',
    headers: { ...headers(true), 'X-Debug': 'true' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    throw new ApiError(response.status, await readBody(response))
  }

  if (!response.body) {
    throw new ApiError(response.status, { message: 'La respuesta no incluye un stream.' })
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const emit = (block: string) => {
    dispatchEvent(block, handlers)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    buffer = consumeEvents(buffer, emit)
  }

  buffer += decoder.decode()
  if (buffer.trim()) dispatchEvent(buffer, handlers)
}

function endpoint(path: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
  return `${base}/v1/chat/${encodeURIComponent(productId)}${path}`
}

function headers(json: boolean): HeadersInit {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  return {
    Authorization: `Bearer ${token}`,
    'X-Timezone': timezone,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(endpoint(path), {
    ...init,
    headers: {
      ...headers(init?.method === 'POST'),
      ...init?.headers,
    },
  })
  const body = await readBody(response)
  if (!response.ok) throw new ApiError(response.status, body)
  return body as T
}

async function readBody(response: Response): Promise<unknown> {
  const raw = await response.text()
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return { message: raw }
  }
}

function consumeEvents(buffer: string, emit: (block: string) => void): string {
  const normalized = buffer.replace(/\r\n/g, '\n')
  const parts = normalized.split('\n\n')
  const rest = parts.pop() ?? ''
  for (const part of parts) {
    if (part.trim()) emit(part)
  }
  return rest
}

function dispatchEvent(block: string, handlers: SendHandlers): void {
  let eventName = 'message'
  const dataLines: string[] = []

  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''))
    }
  }

  const raw = dataLines.join('\n')
  let data: unknown = null
  if (raw) {
    try {
      data = JSON.parse(raw) as unknown
    } catch {
      return
    }
  }

  if (eventName === 'status') {
    const stage = readStage(data)
    if (stage) handlers.onStatus?.(stage)
    return
  }

  if (eventName === 'delta') {
    const text = readText(data)
    if (text) handlers.onDelta?.(text)
    return
  }

  if (eventName === 'sources') {
    handlers.onSources?.(readSources(data))
    return
  }

  if (eventName === 'debug') {
    const event = readDebugEvent(data)
    if (event) handlers.onDebug?.(event)
    return
  }

  if (eventName === 'error') {
    handlers.onError?.(readStreamError(data))
    return
  }

  if (eventName === 'done') {
    handlers.onDone?.()
  }
}

function readStage(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('stage' in data)) return null
  const stage = (data as { stage: unknown }).stage
  return typeof stage === 'string' ? stage : null
}

function readText(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('text' in data)) return null
  const text = (data as { text: unknown }).text
  return typeof text === 'string' ? text : null
}

function readSources(data: unknown): Source[] {
  if (!data || typeof data !== 'object' || !('sources' in data)) return []
  const sources = (data as { sources: unknown }).sources
  if (!Array.isArray(sources)) return []
  return sources.map((item, index) => toSource(item, index))
}

function toSource(item: unknown, index: number): Source {
  const source = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
  return {
    position: typeof source.position === 'number' ? source.position : index + 1,
    title: typeof source.title === 'string' ? source.title : 'Fuente',
    url: typeof source.url === 'string' ? source.url : '',
    description: typeof source.description === 'string' ? source.description : null,
    publishedAt: typeof source.publishedAt === 'string' ? source.publishedAt : null,
    section: typeof source.section === 'string' ? source.section : null,
    author: typeof source.author === 'string' ? source.author : null,
    image: typeof source.image === 'string' && source.image.trim() ? source.image : null,
    cited: source.cited === true,
  }
}

function normalizeDetail(detail: ConversationDetail): ConversationDetail {
  if (!detail || typeof detail !== 'object') {
    return { id: '', title: null, updatedAt: '', messages: [] }
  }
  const messages = Array.isArray(detail.messages) ? detail.messages.map(normalizeMessage) : []
  return { ...detail, messages }
}

function normalizeMessage(message: Message): Message {
  const sources = Array.isArray(message.sources) ? message.sources.map((source, index) => toSource(source, index)) : []
  return {
    ...message,
    content: typeof message.content === 'string' ? message.content : '',
    sources,
    activity: [],
  }
}

function readDebugEvent(data: unknown): DebugEvent | null {
  if (!data || typeof data !== 'object' || !('kind' in data)) return null
  const record = data as Record<string, unknown>

  if (record.kind === 'reasoning' && typeof record.text === 'string') {
    return { kind: 'reasoning', text: record.text }
  }

  if (record.kind === 'tool-call' && typeof record.toolCallId === 'string' && typeof record.toolName === 'string') {
    return { kind: 'tool-call', toolCallId: record.toolCallId, toolName: record.toolName, input: record.input ?? null }
  }

  if (record.kind === 'tool-result' && typeof record.toolCallId === 'string' && typeof record.toolName === 'string') {
    return { kind: 'tool-result', toolCallId: record.toolCallId, toolName: record.toolName, output: record.output ?? null }
  }

  return null
}

function readStreamError(data: unknown): StreamError {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  return {
    code: typeof record.code === 'string' ? record.code : 'GENERATION_FAILED',
    message: typeof record.message === 'string' ? record.message : 'La respuesta falló.',
  }
}

function extractMessage(body: unknown): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
    if (Array.isArray(message)) return message.map(String).join(', ')
  }
  return 'No se pudo completar la solicitud.'
}
