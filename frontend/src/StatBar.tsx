import type { EventItem, EventStatus } from './types'
import { clamp, computeStatus, todayDateStr } from './dateUtils'

export type StatusFilter = 'all' | EventStatus

interface StatBarProps {
  year: number
  setYear: (y: number) => void
  events: EventItem[]
  search: string
  setSearch: (v: string) => void
  statusFilter: StatusFilter
  setStatusFilter: (v: StatusFilter) => void
  loading?: boolean
  savingCount?: number
}

function StatBar({
  year,
  setYear,
  events,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  loading,
  savingCount
}: StatBarProps) {
  const today = todayDateStr()
  const inProgressCount = events.filter((ev) => computeStatus(ev, today) === '進行中').length
  const goalsCount = events.filter((ev) => ev.goalDate).length

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: '全て' },
    { key: '予定', label: '予定' },
    { key: '進行中', label: '進行中' },
    { key: '完了', label: '完了' }
  ]

  return (
    <div className="ep-statbar">
      <div className="ep-year-stepper">
        <button className="ep-year-arrow" onClick={() => setYear(clamp(year - 1, 1900, 2200))} aria-label="前の年">
          ‹
        </button>
        <span className="ep-year-value">{year}年</span>
        <button className="ep-year-arrow" onClick={() => setYear(clamp(year + 1, 1900, 2200))} aria-label="次の年">
          ›
        </button>
      </div>

      <div className="ep-stat-tiles">
        <div className="ep-stat-tile">
          <span className="ep-stat-label">EVENTS</span>
          <span className="ep-stat-value">{events.length}件</span>
        </div>
        <div className="ep-stat-tile">
          <span className="ep-stat-label">IN PROGRESS</span>
          <span className="ep-stat-value ep-stat-value-accent">{inProgressCount}件</span>
        </div>
        <div className="ep-stat-tile">
          <span className="ep-stat-label">GOALS</span>
          <span className="ep-stat-value">{goalsCount}件</span>
        </div>
      </div>

      <input
        className="ep-search-input"
        type="text"
        placeholder="イベント名で絞り込み"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="ep-status-filters">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`ep-filter-chip${statusFilter === f.key ? ' ep-filter-chip-active' : ''}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {(loading || (savingCount ?? 0) > 0) && (
        <span className="ep-statbar-status">{loading ? '読み込み中...' : '保存中...'}</span>
      )}
    </div>
  )
}

export default StatBar
