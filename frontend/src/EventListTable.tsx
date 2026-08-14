import { Fragment, useState } from 'react'
import type { EventItem } from './types'
import { computeStatus, countDays, fmtShort, formatPeriod, todayDateStr } from './dateUtils'

interface EventListTableProps {
  title: string
  hint?: string
  year: number
  events: EventItem[]
  loading?: boolean
  onAddEvent: () => void
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
  onGoalColorChange: (id: number, color: string) => void
  onAddCheckpoint: (id: number) => void
  onRemoveCheckpoint: (id: number, idx: number) => void
  onCheckpointDateChange: (id: number, idx: number, value: string) => void
  onCheckpointLabelChange: (id: number, idx: number, value: string) => void
  onCheckpointLabelCommit: (id: number) => void
  onCheckpointColorChange: (id: number, idx: number, color: string) => void
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
  onAddEvent,
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
  onGoalColorChange,
  onAddCheckpoint,
  onRemoveCheckpoint,
  onCheckpointDateChange,
  onCheckpointLabelChange,
  onCheckpointLabelCommit,
  onCheckpointColorChange,
  onRemoveEvent
}: EventListTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const today = todayDateStr()

  return (
    <div className="ep-table-card">
      <div className="ep-chart-card-head">
        <h3>{title}</h3>
        <div className="ep-chart-card-head-actions">
          {hint && <span className="ep-muted-hint">{hint}</span>}
          <button className="ep-btn-primary" onClick={onAddEvent}>
            ＋ イベント追加
          </button>
        </div>
      </div>
      <div className="ep-table-scroll">
        <table className="ep-table">
          <colgroup>
            <col className="ep-colgroup-name" />
            <col className="ep-colgroup-owner" />
            <col className="ep-colgroup-period" />
            <col className="ep-colgroup-days" />
            <col className="ep-colgroup-cp" />
            <col className="ep-colgroup-goal" />
            <col className="ep-colgroup-status" />
            <col className="ep-colgroup-edit" />
          </colgroup>
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
                          <div className="ep-edit-field ep-edit-col-name">
                            <label>イベント</label>
                            <div className="ep-edit-field-row">
                              <input
                                type="color"
                                className="ep-color-input"
                                title="色"
                                value={ev.color}
                                onChange={(e) => onColorChange(ev.id, e.target.value)}
                              />
                              <input
                                type="text"
                                value={ev.name}
                                onChange={(e) => onNameChange(ev.id, e.target.value)}
                                onBlur={() => onNameCommit(ev.id)}
                              />
                            </div>
                          </div>
                          <div className="ep-edit-field ep-edit-col-owner">
                            <label>担当</label>
                            <input
                              type="text"
                              placeholder="部署名・担当者名など"
                              value={ev.owner}
                              onChange={(e) => onOwnerChange(ev.id, e.target.value)}
                              onBlur={() => onOwnerCommit(ev.id)}
                            />
                          </div>
                          <div className="ep-edit-field ep-edit-col-period">
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
                          <div className="ep-edit-field ep-edit-col-days">
                            <label>日数</label>
                            <span className="ep-edit-readonly-note">{countDays(ev.startDate, ev.endDate)}日</span>
                          </div>
                          <div className="ep-edit-field ep-edit-col-cp">
                            <label>チェックポイント</label>
                            {ev.checkpoints.map((cp, idx) => (
                              <div key={idx} className="ep-cp-row">
                                <input
                                  type="text"
                                  className="ep-cp-label-input"
                                  placeholder="例: 50%の問題集完了"
                                  value={cp.label}
                                  onChange={(e) => onCheckpointLabelChange(ev.id, idx, e.target.value)}
                                  onBlur={() => onCheckpointLabelCommit(ev.id)}
                                />
                                <div className="ep-cp-row-bottom">
                                  <input
                                    type="color"
                                    className="ep-cp-color-input"
                                    title="チェックポイントの色"
                                    value={cp.color}
                                    onChange={(e) => onCheckpointColorChange(ev.id, idx, e.target.value)}
                                  />
                                  <input
                                    type="date"
                                    value={cp.date}
                                    min={`${year}-01-01`}
                                    max={`${year}-12-31`}
                                    onChange={(e) => onCheckpointDateChange(ev.id, idx, e.target.value)}
                                  />
                                  <button className="ep-cp-remove" onClick={() => onRemoveCheckpoint(ev.id, idx)}>
                                    ×
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button className="ep-cp-add" onClick={() => onAddCheckpoint(ev.id)}>
                              ＋ チェックポイント追加
                            </button>
                          </div>
                          <div className="ep-edit-field ep-edit-col-goal">
                            <label>ゴール</label>
                            {ev.goalDate ? (
                              <div className="ep-edit-field-row">
                                <input
                                  type="color"
                                  className="ep-cp-color-input"
                                  title="ゴールの色"
                                  value={ev.goalColor}
                                  onChange={(e) => onGoalColorChange(ev.id, e.target.value)}
                                />
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
                          <div className="ep-edit-field ep-edit-col-status">
                            <label>状態</label>
                            <span className={`ep-status-badge ${statusClass(status)}`}>{status}</span>
                            <span className="ep-edit-readonly-note" title="状態は期間の開始日・終了日から自動的に計算されます">
                              自動算出
                            </span>
                          </div>
                          <div className="ep-edit-field ep-edit-col-delete">
                            <button className="ep-row-del" onClick={() => onRemoveEvent(ev.id)}>
                              🗑 削除
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
