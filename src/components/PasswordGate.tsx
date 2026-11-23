import { useId, useState, type FormEvent } from 'react'
import { hashPassword } from '../data/password.ts'
import './PasswordGate.css'

export function PasswordGate({
  slug,
  expectedHash,
  keyError,
  onUnlock,
}: {
  slug: string
  expectedHash: string
  keyError: boolean
  onUnlock: () => void
}) {
  const inputId = useId()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(keyError ? '連結裡的密碼不正確，請重新輸入。' : '')
  const [checking, setChecking] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!password) return
    setChecking(true)
    const ok = (await hashPassword(slug, password.trim())) === expectedHash
    setChecking(false)
    if (ok) onUnlock()
    else setError('密碼不正確，請再試一次。')
  }

  return (
    <main className="gate">
      <form className="gate-card" onSubmit={submit}>
        <span className="brand-seal gate-seal" aria-hidden>
          旅
        </span>
        <p className="gate-eyebrow">旅程手帖</p>
        <h1 className="gate-title">請輸入密碼</h1>
        <p className="gate-slug">
          旅程代號　<code>{slug}</code>
        </p>

        <label className="sr-only" htmlFor={inputId}>
          密碼
        </label>
        <div className="gate-field">
          <input
            id={inputId}
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-err` : undefined}
            placeholder="密碼"
          />
          <button
            type="button"
            className="gate-toggle"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
          >
            {show ? '隱藏' : '顯示'}
          </button>
        </div>
        {error && (
          <p className="gate-error" id={`${inputId}-err`} role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary gate-submit" disabled={!password || checking}>
          {checking ? '確認中…' : '進入行程'}
        </button>
        <p className="gate-hint">同一支手機輸入一次後，下次就不用再輸入。</p>
      </form>
    </main>
  )
}
