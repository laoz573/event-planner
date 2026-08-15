import { useState, type FormEvent } from 'react'
import { register } from './api'

// 外部公開にあたり自己登録は廃止したため、この画面は「ログイン後の設定画面」に
// 埋め込んで使う小さなフォームに変更した(以前はログイン前に誰でも使えるページだった)。
// 作成しても呼び出し元(SettingsView)のログインセッションは切り替えない
// (今ログインしている人が"他の人のアカウント"を追加する操作のため)。
//
// バックエンドと同じ制約(ユーザー名3〜50文字・パスワード8文字以上)をフロントでも軽くチェックする。
function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

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
      setSuccess(`「${res.username}」を作成しました`)
      setUsername('')
      setPassword('')
      setPasswordConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザー登録に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="ep-register-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label htmlFor="register-username">ユーザー名</label>
        <input
          id="register-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
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
      {success && <p className="success-text">{success}</p>}

      <button type="submit" className="ep-btn-primary" disabled={submitting}>
        {submitting ? '作成中...' : '＋ アカウントを作成'}
      </button>
    </form>
  )
}

export default Register
