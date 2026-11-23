import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.use({ gfm: true, breaks: true })

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/** Markdown → 安全的 HTML（移除 script 等危險內容，連結開新分頁）。 */
export function renderMarkdown(text: string): string {
  return DOMPurify.sanitize(marked.parse(text, { async: false }))
}

/** Markdown → 純文字，用在列表的摘要。 */
export function markdownToText(text: string): string {
  const div = document.createElement('div')
  div.innerHTML = renderMarkdown(text)
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}
