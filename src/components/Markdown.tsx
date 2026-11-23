import { useMemo } from 'react'
import { renderMarkdown } from '../lib/markdown.ts'
import './Markdown.css'

export function Markdown({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(text), [text])
  return <div className={`md ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />
}
