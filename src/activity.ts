import type { ActivityItem, DebugEvent, ToolActivity } from './types'

export function applyDebugEvent(activity: ActivityItem[], event: DebugEvent): ActivityItem[] {
  if (event.kind === 'reasoning') {
    return [...activity, { kind: 'reasoning', text: event.text }]
  }

  if (event.kind === 'tool-call') {
    return [...activity, { kind: 'tool', tool: runningTool(event) }]
  }

  return applyToolResult(activity, event)
}

function runningTool(event: Extract<DebugEvent, { kind: 'tool-call' }>): ToolActivity {
  return {
    toolCallId: event.toolCallId,
    toolName: event.toolName,
    input: event.input,
    output: null,
    status: 'running',
  }
}

function applyToolResult(activity: ActivityItem[], event: Extract<DebugEvent, { kind: 'tool-result' }>): ActivityItem[] {
  const index = activity.findIndex((item) => item.kind === 'tool' && item.tool.toolCallId === event.toolCallId)
  if (index === -1) {
    return [...activity, { kind: 'tool', tool: completedTool(event, null) }]
  }

  return activity.map((item, itemIndex) => {
    if (itemIndex !== index || item.kind !== 'tool') return item
    return { kind: 'tool', tool: completedTool(event, item.tool.input) }
  })
}

function completedTool(event: Extract<DebugEvent, { kind: 'tool-result' }>, input: unknown): ToolActivity {
  return {
    toolCallId: event.toolCallId,
    toolName: event.toolName,
    input,
    output: event.output,
    status: 'completed',
  }
}
