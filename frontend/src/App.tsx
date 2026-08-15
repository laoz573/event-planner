import { useEffect, useState } from 'react'
import PlannerShell from './PlannerShell'
import Login from './Login'
import { AUTH_EXPIRED_EVENT, clearAuth, getUsername, isLoggedIn } from './auth'
import './App.css'

type View = 'login' | 'planner'

// ログイン状態に応じて login / planner の2画面を切り替えるシンプルな状態遷移にしている。
// 外部公開にあたり自己登録(新規登録画面)は廃止した。新しいアカウントは、
// 既にログイン済みの利用者が設定画面の「アカウント管理」から作成する(Register.tsx参照)。
// plannerに入った後の「年間計画・四半期・担当別・設定」タブの切り替えはPlannerShellが受け持つ。
function App() {
  const [view, setView] = useState<View>(isLoggedIn() ? 'planner' : 'login')
  const [username, setUsername] = useState<string | null>(getUsername())

  useEffect(() => {
    // authFetchが401を検知したときに発火するイベント。トークンは既に破棄済みなのでログイン画面に戻す。
    function handleAuthExpired() {
      setUsername(null)
      setView('login')
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
  }, [])

  function handleLoggedIn() {
    setUsername(getUsername())
    setView('planner')
  }

  function handleLogout() {
    clearAuth()
    setUsername(null)
    setView('login')
  }

  if (view === 'login') {
    return <Login onLoggedIn={handleLoggedIn} />
  }

  return <PlannerShell username={username} onLogout={handleLogout} />
}

export default App
