import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ActivityItem, ToolActivity } from '../../types'
import './DebugActivity.css'

type DebugActivityProps = {
  activity: ActivityItem[]
  collapsed: boolean
}

type ToolPanelProps = {
  tool: ToolActivity
  collapsed: boolean
}

type ReasoningPanelProps = {
  text: string
  collapsed: boolean
}

export function DebugActivity({ activity, collapsed }: DebugActivityProps) {
  function renderItem(item: ActivityItem, index: number): ReactNode {
    if (item.kind === 'reasoning') {
      return <ReasoningPanel key={`reasoning-${index}`} text={item.text} collapsed={collapsed} />
    }
    return <ToolPanel key={`${item.tool.toolCallId}-${index}`} tool={item.tool} collapsed={collapsed} />
  }

  function renderItems(): ReactNode {
    return activity.map((item, index) => renderItem(item, index))
  }

  function renderActivity(): ReactNode {
    if (activity.length === 0) return null
    return <div className="debug">{renderItems()}</div>
  }

  return renderActivity()
}

function ReasoningPanel({ text, collapsed }: ReasoningPanelProps) {
  const { expanded, handleToggle } = useCollapsedPanel(collapsed)
  const panelClassName = expanded ? 'debug-reasoning debug-reasoning-open' : 'debug-reasoning'

  function renderText(): ReactNode {
    if (!expanded || !text.trim()) return null
    return <p className="debug-reasoning-text">{text}</p>
  }

  function renderPanel(): ReactNode {
    return (
      <section className={panelClassName}>
        <button type="button" className="debug-reasoning-toggle" aria-expanded={expanded} onClick={handleToggle}>
          <span className="debug-reasoning-label">Pensando…</span>
          <ChevronIcon expanded={expanded} />
        </button>
        {renderText()}
      </section>
    )
  }

  return renderPanel()
}

function ToolPanel({ tool, collapsed }: ToolPanelProps) {
  const { expanded, handleToggle } = useCollapsedPanel(collapsed)
  const panelClassName = expanded ? 'debug-tool debug-tool-open' : 'debug-tool'
  const statusClassName =
    tool.status === 'completed' ? 'debug-tool-status debug-tool-status-completed' : 'debug-tool-status debug-tool-status-running'
  const statusLabel = tool.status === 'completed' ? 'Completed' : 'Running'

  function renderStatus(): ReactNode {
    return (
      <span className={statusClassName}>
        {renderStatusIcon()}
        {statusLabel}
      </span>
    )
  }

  function renderStatusIcon(): ReactNode {
    if (tool.status !== 'completed') return null
    return <CheckIcon />
  }

  function renderResult(): ReactNode {
    if (tool.status !== 'completed') return null
    return (
      <section className="debug-tool-block">
        <h4 className="debug-tool-label">RESULT</h4>
        <pre>{formatValue(tool.output)}</pre>
      </section>
    )
  }

  function renderBody(): ReactNode {
    if (!expanded) return null
    return (
      <div className="debug-tool-body">
        <section className="debug-tool-block">
          <h4 className="debug-tool-label">PARAMETERS</h4>
          <pre>{formatValue(tool.input)}</pre>
        </section>
        {renderResult()}
      </div>
    )
  }

  function renderPanel(): ReactNode {
    return (
      <section className={panelClassName}>
        <button type="button" className="debug-tool-toggle" aria-expanded={expanded} onClick={handleToggle}>
          <WrenchIcon />
          <span className="debug-tool-name">{tool.toolName}</span>
          {renderStatus()}
          <ChevronIcon expanded={expanded} />
        </button>
        {renderBody()}
      </section>
    )
  }

  return renderPanel()
}

function useCollapsedPanel(collapsed: boolean) {
  const [expanded, setExpanded] = useState(false)
  const closedWithAnswer = useRef(false)

  useEffect(() => {
    if (!collapsed || closedWithAnswer.current) return
    closedWithAnswer.current = true
    setExpanded(false)
  }, [collapsed])

  function handleToggle() {
    setExpanded((current) => !current)
  }

  return { expanded, handleToggle }
}

function formatValue(value: unknown): string {
  try {
    const text = JSON.stringify(value, null, 2)
    if (typeof text === 'string') return text
  } catch {
    return String(value)
  }
  return String(value)
}

function WrenchIcon() {
  return (
    <svg className="debug-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14.7 6.3a4.5 4.5 0 0 0-6.2 6.2L4 17l3 3 4.5-4.5a4.5 4.5 0 0 0 6.2-6.2l-2.8 2.8-2.2-2.2 2-2.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="debug-tool-check" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5 9.2 17 19 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  const className = expanded ? 'debug-chevron debug-chevron-open' : 'debug-chevron'
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
