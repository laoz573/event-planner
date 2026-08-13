import { useState, type FormEvent } from 'react'
import { login } from './api'
import { setAuth } from './auth'

interface LoginProps {
  onLoggedIn: () => void
  onGoToRegister: () => void
}

// household の Login 画面(中央寄せのシンプルなフォーム)を踏襲したログイン画面。
function Login({ onLoggedIn, onGoToRegister }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await login(username, password)
      setAuth(res.token, res.username)
      onLoggedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>年間イベント計画ツール</h1>

        <div className="auth-field">
          <label htmlFor="login-username">ユーザー名</label>
          <input
            id="login-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="login-password">パスワード</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? 'ログイン中...' : 'ログイン'}
        </button>

        <p className="auth-link">
          アカウントをお持ちでない方は{' '}
          <button type="button" className="auth-link-btn" onClick={onGoToRegister}>
            新規登録
          </button>
        </p>
      </form>
    </div>
  )
}

export default Login
