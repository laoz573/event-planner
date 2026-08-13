import { useState } from 'react'
import { useEventPlanner } from './useEventPlanner'
import AnnualView from './AnnualView'
import QuarterView from './QuarterView'
import ByOwnerView from './ByOwnerView'
import SettingsView from './SettingsView'

type Tab = 'annual' | 'quarter' | 'owner' | 'settings'

const TABS: { key: Tab; label: string }[] = [
  { key: 'annual', label: '年間計画' },
  { key: 'quarter', label: '四半期' },
  { key: 'owner', label: '担当別' },
  { key: 'settings', label: '設定' }
]

interface PlannerShellProps {
  username: string | null
  onLogout: () => void
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.slice(0, 2).toUpperCase()
}

function formatTime(d: Date | null): string {
  if (!d) return '未保存'
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function PlannerShell({ username, onLogout }: PlannerShellProps) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [tab, setTab] = useState<Tab>('annual')
  const planner = useEventPlanner(year)

  return (
    <div className="ep-shell">
      <header className="ep-app-header">
        <div className="ep-brand">
          <span className="ep-brand-mark" />
          <span className="ep-brand-name">EVENT PLANNER</span>
        </div>
        <nav className="ep-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`ep-tab${tab === t.key ? ' ep-tab-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="ep-header-right">
          <span className="ep-last-saved">最終保存 {formatTime(planner.lastSavedAt)}</span>
          <span className="ep-avatar" title={username ?? ''}>
            {initials(username)}
          </span>
        </div>
      </header>

      <main className="ep-main">
        {tab === 'annual' && <AnnualView year={year} setYear={setYear} {...planner} />}
        {tab === 'quarter' && <QuarterView year={year} setYear={setYear} {...planner} />}
        {tab === 'owner' && <ByOwnerView year={year} setYear={setYear} {...planner} />}
        {tab === 'settings' && (
          <SettingsView username={username} year={year} events={planner.events} onLogout={onLogout} />
        )}
      </main>
    </div>
  )
}

export default PlannerShell
