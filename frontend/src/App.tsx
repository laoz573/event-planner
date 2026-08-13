import { useEffect, useState } from 'react'
import EventPlanner from './EventPlanner'
import Login from './Login'
import Register from './Register'
import { AUTH_EXPIRED_EVENT, clearAuth, getUsername, isLoggedIn } from './auth'
import './App.css'

type View = 'login' | 'register' | 'planner'

// elec-toolはジャンル(強電/弱電)ごとに複数ツールを切り替える構成だが、
// このアプリは年間イベント計画ツール専用なので、ジャンル選択画面は設けず単一画面にしている。
// ログイン状態に応じて login / register / planner の3画面を切り替えるシンプルな状態遷移にしている。
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
    return <Login onLoggedIn={handleLoggedIn} onGoToRegister={() => setView('register')} />
  }

  if (view === 'register') {
    return <Register onRegistered={handleLoggedIn} onGoToLogin={() => setView('login')} />
  }

  return (
    <div>
      <header className="app-header">
        <h1>年間イベント計画ツール</h1>
        <div className="app-header-user">
          {username && <span className="app-header-username">{username} さん</span>}
          <button type="button" className="app-header-logout" onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </header>
      <div className="app-body">
        <main className="main-content">
          <EventPlanner />
        </main>
      </div>
    </div>
  )
}

export default App
