import { useState, type FormEvent } from 'react'
import { fetchIndex } from '../data/api.ts'
import { hashPassword } from '../data/password.ts'
import { formatLength, formatRange } from '../lib/format.ts'
import { navigate } from '../lib/router.ts'
import { forget, listRemembered, remember } from '../lib/unlock.ts'
import './HomePage.css'

export function HomePage() {
  const [trips, setTrips] = useState(listRemembered)

  return (
    <main className="home">
      <header className="home-head">
        <span className="brand-seal" aria-hidden>
          旅
        </span>
        <div>
          <p className="home-eyebrow">trip-trail</p>
          <h1 className="home-title">旅程手帖</h1>
        </div>
      </header>

      {trips.length > 0 && (
        <section className="home-section" aria-labelledby="home-recent">
          <h2 id="home-recent" className="home-h2">
            這支手機打開過的旅程
          </h2>
          <ul className="ticket-list">
            {trips.map((t) => (
              <li key={t.slug} className="ticket">
                <a className="ticket-main" href={`/t/${t.slug}`}>
                  <span className="ticket-title">{t.title ?? t.slug}</span>
                  {t.start && t.end && (
                    <span className="ticket-meta">
                      {formatRange(t.start, t.end)}・{formatLength(t.start, t.end)}
                    </span>
                  )}
                </a>
                <button
                  className="ticket-remove"
                  aria-label={`從清單移除 ${t.title ?? t.slug}`}
                  onClick={() => {
                    forget(t.slug)
                    setTrips(listRemembered())
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <OpenTripForm />

      <p className="home-foot">收到分享連結的話，直接打開連結就可以了。</p>
    </main>
  )
}

function OpenTripForm() {
  const [slug, setSlug] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const code = slug.trim().toLowerCase()
    if (!code) return
    setBusy(true)
    setError('')
    try {
      const entry = (await fetchIndex()).trips.find((t) => t.slug === code)
      if (!entry) {
        setError('找不到這個旅程代號。')
        return
      }
      if (entry.hash !== null && (await hashPassword(code, password.trim())) !== entry.hash) {
        setError('密碼不正確。')
        return
      }
      remember({ slug: code, hash: entry.hash })
      navigate(`/t/${code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤，請再試一次。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="home-section" aria-labelledby="home-open">
      <h2 id="home-open" className="home-h2">
        打開旅程
      </h2>
      <form className="open-form" onSubmit={submit}>
        <label>
          <span>旅程代號</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="例如 kansai-2026"
          />
        </label>
        <label>
          <span>密碼</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary" disabled={!slug.trim() || busy}>
          {busy ? '確認中…' : '打開'}
        </button>
      </form>
    </section>
  )
}
