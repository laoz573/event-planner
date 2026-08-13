import { useState, type FormEvent } from 'react'
import { register } from './api'
import { setAuth } from './auth'

interface RegisterProps {
  onRegistered: () => void
  onGoToLogin: () => void
}

// household には無い、自己登録用の新規アカウント作成画面。
// バックエンドと同じ制約(ユーザー名3〜50文字・パスワード8文字以上)をフロントでも軽くチェックする。
function Register({ onRegistered, onGoToLogin }: RegisterProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (username.trim().length < 3) {
      setError('ユーザー名は3文字以上で入力してください')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    if (password !== passwordConfirm) {
      setError('パスワードが一致しません')
      return
    }

    setSubmitting(true)
    try {
      const res = await register(username, password)
      setAuth(res.token, res.username)
      onRegistered()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザー登録に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>新規登録</h1>

        <div className="auth-field">
          <label htmlFor="register-username">ユーザー名</label>
          <input
            id="register-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="register-password">パスワード</label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="register-password-confirm">パスワード(確認)</label>
          <input
            id="register-password-confirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? '登録中...' : '登録する'}
        </button>

        <p className="auth-link">
          既にアカウントをお持ちの方は{' '}
          <button type="button" className="auth-link-btn" onClick={onGoToLogin}>
            ログイン
          </button>
        </p>
      </form>
    </div>
  )
}

export default Register
