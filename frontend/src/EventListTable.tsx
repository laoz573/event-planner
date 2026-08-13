import { Fragment, useState } from 'react'
import type { EventItem } from './types'
import { computeStatus, countDays, formatPeriod, todayDateStr } from './dateUtils'

interface EventListTableProps {
  title: string
  hint?: string
  year: number
  events: EventItem[]
  loading?: boolean
  onNameChange: (id: number, name: string) => void
  onNameCommit: (id: number) => void
  onOwnerChange: (id: number, owner: string) => void
  onOwnerCommit: (id: number) => void
  onColorChange: (id: number, color: string) => void
  onStartChange: (id: number, startDate: string) => void
  onEndChange: (id: number, endDate: string) => void
  onGoalSet: (id: number) => void
  onGoalClear: (id: number) => void
  onGoalDateChange: (id: number, goalDate: string) => void
  onAddCheckpoint: (id: number) => void
  onRemoveCheckpoint: (id: number, idx: number) => void
  onCheckpointDateChange: (id: number, idx: number, value: string) => void
  onRemoveEvent: (id: number) => void
}

function statusClass(status: string): string {
  if (status === '完了') return 'ep-status-done'
  if (status === '進行中') return 'ep-status-progress'
  return 'ep-status-planned'
}

function EventListTable({
  title,
  hint,
  year,
  events,
  loading,
  onNameChange,
  onNameCommit,
  onOwnerChange,
  onOwnerCommit,
  onColorChange,
  onStartChange,
  onEndChange,
  onGoalSet,
  onGoalClear,
  onGoalDateChange,
  onAddCheckpoint,
  onRemoveCheckpoint,
  onCheckpointDateChange,
  onRemoveEvent
}: EventListTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const today = todayDateStr()

  return (
    <div className="ep-table-card">
      <div className="ep-chart-card-head">
        <h3>{title}</h3>
        {hint && <span className="ep-muted-hint">{hint}</span>}
      </div>
      <div className="ep-table-scroll">
        <table className="ep-table">
          <thead>
            <tr>
              <th>イベント</th>
              <th>担当</th>
              <th>期間</th>
              <th>日数</th>
              <th>チェックポイント</th>
              <th>ゴール</th>
              <th>状態</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={8} className="ep-empty-hint">
                  {loading ? '読み込み中...' : 'イベントがありません'}
                </td>
              </tr>
            )}
            {events.map((ev) => {
              const status = computeStatus(ev, today)
              const expanded = expandedId === ev.id
              return (
                <Fragment key={ev.id}>
                  <tr>
                    <td className="ep-col-name-display">
                      <span className="ep-name-swatch" style={{ background: ev.color }} />
                      {ev.name}
                    </td>
                    <td className="ep-col-owner-display">{ev.owner || '—'}</td>
                    <td className="ep-col-period-display">{formatPeriod(ev.startDate, ev.endDate)}</td>
                    <td className="ep-col-days-display">{countDays(ev.startDate, ev.endDate)}</td>
                    <td className="ep-col-cp-display">
                      {ev.checkpoints.length === 0 && <span className="ep-cell-dash">—</span>}
                      {ev.checkpoints.map((cp, idx) => (
                        <span key={idx} className="ep-chip ep-chip-checkpoint">
                          {cp}
                        </span>
                      ))}
                    </td>
                    <td className="ep-col-goal-display">
                      {ev.goalDate ? <span className="ep-chip ep-chip-goal">{ev.goalDate}</span> : <span className="ep-cell-dash">—</span>}
                    </td>
                    <td className="ep-col-status-display">
                      <span className={`ep-status-badge ${statusClass(status)}`}>{status}</span>
                    </td>
                    <td className="ep-col-edit">
                      <button
                        className="ep-edit-toggle"
                        onClick={() => setExpandedId(expanded ? null : ev.id)}
                      >
                        {expanded ? '閉じる' : '編集'}
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="ep-edit-row">
                      <td colSpan={8}>
                        <div className="ep-edit-panel">
                          <div className="ep-edit-field">
                            <label>色</label>
                            <input
                              type="color"
                              className="ep-color-input"
                              value={ev.color}
                              onChange={(e) => onColorChange(ev.id, e.target.value)}
                            />
                          </div>
                          <div className="ep-edit-field">
                            <label>イベント名</label>
                            <input
                              type="text"
                              value={ev.name}
                              onChange={(e) => onNameChange(ev.id, e.target.value)}
                              onBlur={() => onNameCommit(ev.id)}
                            />
                          </div>
                          <div className="ep-edit-field">
                            <label>担当</label>
                            <input
                              type="text"
                              placeholder="部署名・担当者名など"
                              value={ev.owner}
                              onChange={(e) => onOwnerChange(ev.id, e.target.value)}
                              onBlur={() => onOwnerCommit(ev.id)}
                            />
                          </div>
                          <div className="ep-edit-field">
                            <label>期間</label>
                            <div className="ep-edit-field-row">
                              <input
                                type="date"
                                value={ev.startDate}
                                min={`${year}-01-01`}
                                max={`${year}-12-31`}
                                onChange={(e) => onStartChange(ev.id, e.target.value)}
                              />
                              <span>〜</span>
                              <input
                                type="date"
                                value={ev.endDate}
                                min={`${year}-01-01`}
                                max={`${year}-12-31`}
                                onChange={(e) => onEndChange(ev.id, e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="ep-edit-field">
                            <label>チェックポイント</label>
                            {ev.checkpoints.map((cp, idx) => (
                              <div key={idx} className="ep-cp-row">
                                <input
                                  type="date"
                                  value={cp}
                                  min={`${year}-01-01`}
                                  max={`${year}-12-31`}
                                  onChange={(e) => onCheckpointDateChange(ev.id, idx, e.target.value)}
                                />
                                <button className="ep-cp-remove" onClick={() => onRemoveCheckpoint(ev.id, idx)}>
                                  ×
                                </button>
                              </div>
                            ))}
                            <button className="ep-cp-add" onClick={() => onAddCheckpoint(ev.id)}>
                              ＋ チェックポイント追加
                            </button>
                          </div>
                          <div className="ep-edit-field">
                            <label>ゴール</label>
                            {ev.goalDate ? (
                              <div className="ep-edit-field-row">
                                <input
                                  type="date"
                                  value={ev.goalDate}
                                  min={`${year}-01-01`}
                                  max={`${year}-12-31`}
                                  onChange={(e) => onGoalDateChange(ev.id, e.target.value)}
                                />
                                <button className="ep-goal-clear" onClick={() => onGoalClear(ev.id)}>
                                  ゴール解除
                                </button>
                              </div>
                            ) : (
                              <button className="ep-goal-set" onClick={() => onGoalSet(ev.id)}>
                                ＋ ゴール設定
                              </button>
                            )}
                          </div>
                          <div className="ep-edit-field ep-edit-field-delete">
                            <button className="ep-row-del" onClick={() => onRemoveEvent(ev.id)}>
                              🗑 このイベントを削除
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default EventListTable
