import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Source } from '../../types'
import './SourceCards.css'

type SourceCardsProps = {
  messageId: string
  sources: Source[]
}

type SourceCardProps = {
  source: Source
}

export function SourceCards({ messageId, sources }: SourceCardsProps) {
  function renderCard(source: Source): ReactNode {
    return (
      <li key={`${messageId}-${source.position}`}>
        <SourceCard source={source} />
      </li>
    )
  }

  function renderCards(): ReactNode {
    if (sources.length === 0) return null
    return <ul className="source-cards">{sources.map((source) => renderCard(source))}</ul>
  }

  return renderCards()
}

function SourceCard({ source }: SourceCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const imageUrl = source.image?.trim() ?? ''
  const showImage = imageUrl.length > 0 && !imageFailed
  const title = `${source.position}. ${source.title}`
  const meta = readMeta(source)

  useEffect(() => {
    setImageFailed(false)
  }, [imageUrl])

  function handleImageError() {
    setImageFailed(true)
  }

  function renderImage(): ReactNode {
    if (!showImage) return renderFallback()
    return <img className="source-card-media" src={imageUrl} alt="" onError={handleImageError} />
  }

  function renderFallback(): ReactNode {
    return (
      <div className="source-card-media source-card-fallback" aria-hidden="true">
        <ImageIcon />
      </div>
    )
  }

  function renderCited(): ReactNode {
    if (!source.cited) return null
    return <span className="source-card-cited">Citada</span>
  }

  function renderDescription(): ReactNode {
    const description = plainText(source.description)
    if (!description) return null
    return <p className="source-card-description">{description}</p>
  }

  function renderMeta(): ReactNode {
    if (meta.length === 0) return null
    return <p className="source-card-meta">{meta.join(' · ')}</p>
  }

  function renderContent(): ReactNode {
    return (
      <div className="source-card-body">
        {renderCited()}
        <h3 className="source-card-title">{title}</h3>
        {renderDescription()}
        {renderMeta()}
      </div>
    )
  }

  function renderLink(): ReactNode {
    return (
      <a className="source-card" href={source.url} target="_blank" rel="noreferrer">
        {renderImage()}
        {renderContent()}
      </a>
    )
  }

  function renderArticle(): ReactNode {
    return (
      <article className="source-card">
        {renderImage()}
        {renderContent()}
      </article>
    )
  }

  function renderCard(): ReactNode {
    if (source.url) return renderLink()
    return renderArticle()
  }

  return renderCard()
}

function plainText(value: string | null): string {
  if (!value) return ''
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function readMeta(source: Source): string[] {
  const published = formatPublishedAt(source.publishedAt)
  return [source.section, source.author, published].filter((item): item is string => Boolean(item))
}

function formatPublishedAt(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 15l3.2-3.2a1 1 0 0 1 1.4 0L15 15l1.4-1.4a1 1 0 0 1 1.4 0L20 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    </svg>
  )
}
