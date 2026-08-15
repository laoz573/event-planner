import { useState, type FormEvent } from 'react'
import { login } from './api'
import { setAuth } from './auth'

interface LoginProps {
  onLoggedIn: () => void
}

// household の Login 画面(中央寄せのシンプルなフォーム)を踏襲したログイン画面。
// 外部公開にあたり自己登録(新規登録リンク)は廃止した。新しいアカウントは、
// 既にログイン済みの利用者が設定画面の「アカウント管理」から作成する運用にしている。
function Login({ onLoggedIn }: LoginProps) {
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
      </form>
    </div>
  )
}

export default Login
