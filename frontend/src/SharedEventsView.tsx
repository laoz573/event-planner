import { useEffect, useState } from 'react'
import type { EventItem } from './types'
import { fetchSharedEvents } from './api'
import { clamp, computeStatus, countDays, fmtShort, formatPeriod, todayDateStr } from './dateUtils'

interface SharedEventsViewProps {
  year: number
  setYear: (y: number) => void
}

function statusClass(status: string): string {
  if (status === '完了') return 'ep-status-done'
  if (status === '進行中') return 'ep-status-progress'
  return 'ep-status-planned'
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '不明なエラーが発生しました'
}

// 他のユーザーから共有されたイベントを表示する、閲覧専用のタブ。
// 自分のEVENT LISTとは別のAPI(GET /api/events/shared)から取得し、「共有元」列で
// 誰のイベントかを表示する。編集・削除ボタンは一切出さない
// (バックエンド側でも他人のイベントへのPUT/DELETEは404になり、書き込みはできない)。
function SharedEventsView({ year, setYear }: SharedEventsViewProps) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const today = todayDateStr()

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchSharedEvents(year)
      .then(setEvents)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [year])

  return (
    <>
      <div className="ep-statbar ep-statbar-shared">
        <div className="ep-year-stepper">
          <button className="ep-year-arrow" onClick={() => setYear(clamp(year - 1, 1900, 2200))} aria-label="前の年">
            ‹
          </button>
          <span className="ep-year-value">{year}年</span>
          <button className="ep-year-arrow" onClick={() => setYear(clamp(year + 1, 1900, 2200))} aria-label="次の年">
            ›
          </button>
        </div>
        <span className="ep-muted-hint">他のユーザーから共有されたイベントです(閲覧のみ・編集や削除はできません)</span>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="ep-table-card">
        <div className="ep-chart-card-head">
          <h3>共有されたイベント</h3>
        </div>
        <div className="ep-table-scroll">
          <table className="ep-table ep-table-shared">
            <colgroup>
              <col className="ep-colgroup-shared-name" />
              <col className="ep-colgroup-shared-owner" />
              <col className="ep-colgroup-shared-period" />
              <col className="ep-colgroup-shared-days" />
              <col className="ep-colgroup-shared-cp" />
              <col className="ep-colgroup-shared-goal" />
              <col className="ep-colgroup-shared-status" />
            </colgroup>
            <thead>
              <tr>
                <th>イベント</th>
                <th>共有元</th>
                <th>期間</th>
                <th>日数</th>
                <th>チェックポイント</th>
                <th>ゴール</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr>
                  <td colSpan={7} className="ep-empty-hint">
                    {loading ? '読み込み中...' : '共有されているイベントはありません'}
                  </td>
                </tr>
              )}
              {events.map((ev) => {
                const status = computeStatus(ev, today)
                return (
                  <tr key={ev.id}>
                    <td className="ep-col-name-display">
                      <span className="ep-name-swatch" style={{ background: ev.color }} />
                      {ev.name}
                    </td>
                    <td className="ep-col-owner-display">{ev.ownerUsername ?? '—'}</td>
                    <td className="ep-col-period-display">{formatPeriod(ev.startDate, ev.endDate)}</td>
                    <td className="ep-col-days-display">{countDays(ev.startDate, ev.endDate)}</td>
                    <td className="ep-col-cp-display">
                      {ev.checkpoints.length === 0 && <span className="ep-cell-dash">—</span>}
                      {ev.checkpoints.map((cp, idx) => (
                        <span key={idx} className="ep-chip ep-chip-checkpoint" title={fmtShort(cp.date)}>
                          <span className="ep-chip-dot" style={{ background: cp.color }} />
                          {cp.label ? cp.label : fmtShort(cp.date)}
                          {cp.label && <span className="ep-chip-date">{fmtShort(cp.date)}</span>}
                        </span>
                      ))}
                    </td>
                    <td className="ep-col-goal-display">
                      {ev.goalDate ? (
                        <span
                          className="ep-chip ep-chip-goal"
                          style={{ color: ev.goalColor, borderColor: ev.goalColor }}
                        >
                          <span className="ep-chip-dot" style={{ background: ev.goalColor }} />
                          {ev.goalDate}
                        </span>
                      ) : (
                        <span className="ep-cell-dash">—</span>
                      )}
                    </td>
                    <td className="ep-col-status-display">
                      <span className={`ep-status-badge ${statusClass(status)}`}>{status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default SharedEventsView
