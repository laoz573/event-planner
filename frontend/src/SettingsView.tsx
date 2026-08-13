import type { EventItem } from './types'
import { downloadEventsCsv } from './csv'

interface SettingsViewProps {
  username: string | null
  year: number
  events: EventItem[]
  onLogout: () => void
}

function SettingsView({ username, year, events, onLogout }: SettingsViewProps) {
  return (
    <div className="ep-settings-grid">
      <div className="ep-chart-card ep-settings-card">
        <div className="ep-chart-card-head">
          <h3>アカウント</h3>
        </div>
        <div className="ep-settings-body">
          <div className="ep-settings-row">
            <span className="ep-settings-label">ユーザー名</span>
            <span className="ep-settings-value">{username ?? '—'}</span>
          </div>
          <div className="ep-settings-row">
            <span className="ep-settings-label">データの分離</span>
            <span className="ep-settings-value">イベントはユーザーごとに保存され、他のユーザーからは見えません</span>
          </div>
          <button className="ep-btn-ghost ep-settings-logout" onClick={onLogout}>
            ログアウト
          </button>
        </div>
      </div>

      <div className="ep-chart-card ep-settings-card">
        <div className="ep-chart-card-head">
          <h3>データ管理</h3>
        </div>
        <div className="ep-settings-body">
          <div className="ep-settings-row">
            <span className="ep-settings-label">表示中の年</span>
            <span className="ep-settings-value">{year}年({events.length}件のイベント)</span>
          </div>
          <div className="ep-settings-row">
            <span className="ep-settings-label">保存先</span>
            <span className="ep-settings-value">MySQL(年ごとに管理)。入力や矢印のドラッグは自動保存されます</span>
          </div>
          <button className="ep-btn-ghost" onClick={() => downloadEventsCsv(events, year)}>
            {year}年のデータをCSV書き出し
          </button>
        </div>
      </div>

      <div className="ep-chart-card ep-settings-card">
        <div className="ep-chart-card-head">
          <h3>表示について</h3>
        </div>
        <div className="ep-settings-body">
          <div className="ep-settings-row">
            <span className="ep-settings-label">期間の色</span>
            <span className="ep-settings-value">EVENT LISTの「編集」からイベントごとに変更できます</span>
          </div>
          <div className="ep-settings-row">
            <span className="ep-settings-label">状態(予定/進行中/完了)</span>
            <span className="ep-settings-value">今日の日付と期間から自動的に判定され、手動での変更はできません</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsView
