import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { EventItem, EventUpsertPayload } from './types'
import { createEvent, deleteEvent, fetchEvents, updateEvent } from './api'

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const DEFAULT_COLOR = '#9c2d96'

function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}
function daysInMonthArr(y: number) {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
}
function totalDaysInYear(y: number) {
  return isLeap(y) ? 366 : 365
}
function dateToIdx(dateStr: string, year: number): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const janFirst = Date.UTC(year, 0, 1)
  const target = Date.UTC(y, m - 1, d)
  return Math.round((target - janFirst) / 86400000)
}
function idxToDate(idx: number, year: number): string {
  const dt = new Date(Date.UTC(year, 0, 1) + idx * 86400000)
  return dt.toISOString().slice(0, 10)
}
function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}
function fmtShort(dateStr: string | null): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-').map(Number)
  return `${parts[1]}/${parts[2]}`
}
function pctNum(idx: number, total: number) {
  return (idx / total) * 100
}
function pctNumEnd(idx: number, total: number) {
  return ((idx + 1) / total) * 100
}
function pctNumMid(idx: number, total: number) {
  return ((idx + 0.5) / total) * 100
}

type DragRole = 'move' | 'resize-start' | 'resize-end' | 'checkpoint' | 'goal'

interface DragCtx {
  eventId: number
  role: DragRole
  rect: DOMRect
  total: number
  startX: number
  origStart: string
  origEnd: string
  cpIdx: number | null
  origCp: string | null
  origGoal: string | null
  arrowBodyEl: HTMLElement | null
  startLabelEl: HTMLElement | null
  endLabelEl: HTMLElement | null
  markerEl: HTMLElement | null
}

function toPayload(ev: EventItem): EventUpsertPayload {
  return {
    year: ev.year,
    name: ev.name,
    color: ev.color,
    startDate: ev.startDate,
    endDate: ev.endDate,
    goalDate: ev.goalDate,
    checkpoints: ev.checkpoints
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '不明なエラーが発生しました'
}

function EventPlanner() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())

  const dragCtxRef = useRef<DragCtx | null>(null)

  const total = totalDaysInYear(year)
  const months = daysInMonthArr(year)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchEvents(year)
      .then(setEvents)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [year])

  const markSaving = (id: number, saving: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev)
      if (saving) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const persist = useCallback((ev: EventItem) => {
    markSaving(ev.id, true)
    updateEvent(ev.id, toPayload(ev))
      .then((saved) => {
        setEvents((prev) => prev.map((e) => (e.id === saved.id ? saved : e)))
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => markSaving(ev.id, false))
  }, [])

  const handleAddEvent = () => {
    const startIdx = 0
    const endIdx = Math.min(29, total - 1)
    const payload: EventUpsertPayload = {
      year,
      name: '新しいイベント',
      color: DEFAULT_COLOR,
      startDate: idxToDate(startIdx, year),
      endDate: idxToDate(endIdx, year),
      goalDate: null,
      checkpoints: []
    }
    setError(null)
    createEvent(payload)
      .then((created) => setEvents((prev) => [...prev, created]))
      .catch((err) => setError(errorMessage(err)))
  }

  const handleRemoveEvent = (id: number) => {
    setError(null)
    deleteEvent(id)
      .then(() => setEvents((prev) => prev.filter((e) => e.id !== id)))
      .catch((err) => setError(errorMessage(err)))
  }

  const updateLocalAndPersist = (id: number, patch: Partial<EventItem>) => {
    setEvents((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      const updated = next.find((e) => e.id === id)
      if (updated) persist(updated)
      return next
    })
  }

  const handleNameChange = (id: number, name: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, name } : e)))
  }
  const handleNameCommit = (id: number) => {
    setEvents((prev) => {
      const ev = prev.find((e) => e.id === id)
      if (ev) persist(ev)
      return prev
    })
  }
  const handleColorChange = (id: number, color: string) => updateLocalAndPersist(id, { color })
  const handleStartChange = (id: number, startDate: string) => {
    const ev = events.find((e) => e.id === id)
    if (!ev) return
    const endDate = dateToIdx(startDate, year) > dateToIdx(ev.endDate, year) ? startDate : ev.endDate
    updateLocalAndPersist(id, { startDate, endDate })
  }
  const handleEndChange = (id: number, endDate: string) => {
    const ev = events.find((e) => e.id === id)
    if (!ev) return
    const startDate = dateToIdx(endDate, year) < dateToIdx(ev.startDate, year) ? endDate : ev.startDate
    updateLocalAndPersist(id, { startDate, endDate })
  }
  const handleGoalSet = (id: number) => {
    const ev = events.find((e) => e.id === id)
    if (!ev) return
    updateLocalAndPersist(id, { goalDate: ev.endDate })
  }
  const handleGoalClear = (id: number) => updateLocalAndPersist(id, { goalDate: null })
  const handleGoalDateChange = (id: number, goalDate: string) => updateLocalAndPersist(id, { goalDate })
  const handleAddCheckpoint = (id: number) => {
    const ev = events.find((e) => e.id === id)
    if (!ev) return
    const s = dateToIdx(ev.startDate, year)
    const e2 = dateToIdx(ev.endDate, year)
    const mid = clamp(s + Math.floor((e2 - s) / 2), 0, total - 1)
    updateLocalAndPersist(id, { checkpoints: [...ev.checkpoints, idxToDate(mid, year)] })
  }
  const handleRemoveCheckpoint = (id: number, idx: number) => {
    const ev = events.find((e) => e.id === id)
    if (!ev) return
    updateLocalAndPersist(id, { checkpoints: ev.checkpoints.filter((_, i) => i !== idx) })
  }
  const handleCheckpointDateChange = (id: number, idx: number, value: string) => {
    const ev = events.find((e) => e.id === id)
    if (!ev) return
    updateLocalAndPersist(id, { checkpoints: ev.checkpoints.map((c, i) => (i === idx ? value : c)) })
  }

  // ---- ドラッグ操作(矢印の移動・両端リサイズ、△・★の移動) ----
  const applyLiveStyles = (ctx: DragCtx, ev: EventItem) => {
    const t = ctx.total
    if (ctx.role === 'move' || ctx.role === 'resize-start' || ctx.role === 'resize-end') {
      const s = dateToIdx(ev.startDate, year)
      const en = dateToIdx(ev.endDate, year)
      const left = pctNum(s, t)
      const width = pctNumEnd(en, t) - pctNum(s, t)
      if (ctx.arrowBodyEl) {
        ctx.arrowBodyEl.style.left = `${left}%`
        ctx.arrowBodyEl.style.width = `${width}%`
      }
      if (ctx.startLabelEl) {
        ctx.startLabelEl.style.left = `${left}%`
        ctx.startLabelEl.textContent = fmtShort(ev.startDate)
      }
      if (ctx.endLabelEl) {
        ctx.endLabelEl.style.left = `${pctNumEnd(en, t)}%`
        ctx.endLabelEl.textContent = fmtShort(ev.endDate)
      }
    } else if (ctx.role === 'checkpoint' && ctx.cpIdx !== null) {
      const idx = dateToIdx(ev.checkpoints[ctx.cpIdx], year)
      const p = pctNumMid(idx, t)
      if (ctx.markerEl) {
        ctx.markerEl.style.left = `${p}%`
        const label = ctx.markerEl.querySelector('.ep-marker-label')
        if (label) label.textContent = fmtShort(ev.checkpoints[ctx.cpIdx])
      }
    } else if (ctx.role === 'goal') {
      const idx = dateToIdx(ev.goalDate ?? ev.startDate, year)
      const p = pctNumMid(idx, t)
      if (ctx.markerEl) {
        ctx.markerEl.style.left = `${p}%`
        const label = ctx.markerEl.querySelector('.ep-marker-label')
        if (label) label.textContent = fmtShort(ev.goalDate)
      }
    }
  }

  const onDragMove = useCallback(
    (e: PointerEvent) => {
      const ctx = dragCtxRef.current
      if (!ctx) return
      const dx = e.clientX - ctx.startX
      const dDays = Math.round((dx / ctx.rect.width) * ctx.total)

      setEvents((prev) => {
        const idx = prev.findIndex((x) => x.id === ctx.eventId)
        if (idx === -1) return prev
        const ev: EventItem = { ...prev[idx] }
        const t = ctx.total

        if (ctx.role === 'move') {
          let s = dateToIdx(ctx.origStart, year) + dDays
          let en = dateToIdx(ctx.origEnd, year) + dDays
          const dur = en - s
          s = clamp(s, 0, t - 1 - dur)
          en = s + dur
          ev.startDate = idxToDate(s, year)
          ev.endDate = idxToDate(en, year)
        } else if (ctx.role === 'resize-start') {
          const enIdx = dateToIdx(ev.endDate, year)
          const s = clamp(dateToIdx(ctx.origStart, year) + dDays, 0, enIdx)
          ev.startDate = idxToDate(s, year)
        } else if (ctx.role === 'resize-end') {
          const sIdx = dateToIdx(ev.startDate, year)
          const en = clamp(dateToIdx(ctx.origEnd, year) + dDays, sIdx, t - 1)
          ev.endDate = idxToDate(en, year)
        } else if (ctx.role === 'checkpoint' && ctx.cpIdx !== null && ctx.origCp) {
          const cpDay = clamp(dateToIdx(ctx.origCp, year) + dDays, 0, t - 1)
          const checkpoints = [...ev.checkpoints]
          checkpoints[ctx.cpIdx] = idxToDate(cpDay, year)
          ev.checkpoints = checkpoints
        } else if (ctx.role === 'goal' && ctx.origGoal) {
          const gDay = clamp(dateToIdx(ctx.origGoal, year) + dDays, 0, t - 1)
          ev.goalDate = idxToDate(gDay, year)
        }

        applyLiveStyles(ctx, ev)

        const next = [...prev]
        next[idx] = ev
        return next
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year]
  )

  const onDragUp = useCallback(() => {
    const ctx = dragCtxRef.current
    dragCtxRef.current = null
    if (!ctx) return
    setEvents((prev) => {
      const ev = prev.find((e) => e.id === ctx.eventId)
      if (ev) persist(ev)
      return prev
    })
  }, [persist])

  const handlePointerDown = (
    e: ReactPointerEvent<HTMLElement>,
    eventId: number,
    role: DragRole,
    cpIdx?: number
  ) => {
    const ev = events.find((x) => x.id === eventId)
    if (!ev) return
    const target = e.currentTarget
    const row = target.closest<HTMLElement>('.ep-event-row')
    if (!row) return
    const timeline = row.querySelector<HTMLElement>('.ep-row-timeline')
    if (!timeline) return
    const rect = timeline.getBoundingClientRect()

    let arrowBodyEl: HTMLElement | null = null
    let startLabelEl: HTMLElement | null = null
    let endLabelEl: HTMLElement | null = null
    let markerEl: HTMLElement | null = null

    if (role === 'move' || role === 'resize-start' || role === 'resize-end') {
      arrowBodyEl = row.querySelector<HTMLElement>('.ep-arrow-body')
      startLabelEl = row.querySelector<HTMLElement>('.ep-date-label.start')
      endLabelEl = row.querySelector<HTMLElement>('.ep-date-label.end')
    } else {
      markerEl = target
    }

    dragCtxRef.current = {
      eventId,
      role,
      rect,
      total,
      startX: e.clientX,
      origStart: ev.startDate,
      origEnd: ev.endDate,
      cpIdx: cpIdx ?? null,
      origCp: cpIdx !== undefined ? ev.checkpoints[cpIdx] : null,
      origGoal: ev.goalDate,
      arrowBodyEl,
      startLabelEl,
      endLabelEl,
      markerEl
    }

    const pointerId = e.pointerId
    target.setPointerCapture(pointerId)
    const move = (ev2: PointerEvent) => onDragMove(ev2)
    const up = () => {
      try {
        target.releasePointerCapture(pointerId)
      } catch {
        // すでに解放済みの場合は無視
      }
      target.removeEventListener('pointermove', move)
      onDragUp()
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up, { once: true })
    target.addEventListener('pointercancel', up, { once: true })
    e.preventDefault()
  }

  const today = useMemo(() => new Date(), [])
  const showTodayLine = today.getFullYear() === year
  const todayPct = showTodayLine ? pctNumMid(dateToIdx(today.toISOString().slice(0, 10), year), total) : 0

  return (
    <>
      <h2>年間イベント計画ツール</h2>
      <p className="subtext">1年間のイベントの期間・チェックポイント・ゴールをカレンダー上で管理できます。</p>

      <div className="ep-toolbar">
        <label>
          年
          <input
            type="number"
            value={year}
            onChange={(e) => {
              const y = parseInt(e.target.value, 10)
              if (!Number.isNaN(y)) setYear(clamp(y, 1900, 2200))
            }}
          />
        </label>
        <button className="ep-btn-primary" onClick={handleAddEvent}>
          ＋ イベント追加
        </button>
        <div className="ep-spacer" />
        {loading && <span className="subtext">読み込み中...</span>}
        {!loading && savingIds.size > 0 && <span className="subtext">保存中...</span>}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="ep-hint-box">
        ・紫の矢印はドラッグして期間全体を移動できます。両端をドラッグすると開始日/終了日だけを変更できます。
        <br />
        ・△(チェックポイント)と★(ゴール)もドラッグして日付を変更できます。
        <br />
        ・下の表からも日付を直接入力できます(チェックポイントは「＋チェックポイント追加」でいくつでも追加できます)。
        <br />
        ・変更内容はドラッグを離す/入力を確定するたびに自動的にサーバーへ保存されます。
      </div>

      <div className="ep-chart-card">
        <div className="ep-chart-inner">
          <div className="ep-chart-year-label">{year}年</div>
          <div className="ep-header-row">
            <div className="ep-row-label-spacer" />
            <div className="ep-months-row">
              {months.map((d, i) => (
                <div key={i} className="ep-month-cell" style={{ flex: `${d} ${d} 0%` }}>
                  <div className="ep-month-label">{MONTH_NAMES[i]}</div>
                  <div className="ep-month-ruler">
                    <span>1</span>
                    <span>15</span>
                    <span>{d}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="ep-chart-body-wrap">
            <div className="ep-row-label-col">
              {events.map((ev) => (
                <div key={ev.id} className="ep-row-label">
                  <input
                    className="ep-name-chart"
                    value={ev.name}
                    onChange={(e) => handleNameChange(ev.id, e.target.value)}
                    onBlur={() => handleNameCommit(ev.id)}
                  />
                  <button className="ep-row-del-mini" title="削除" onClick={() => handleRemoveEvent(ev.id)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="ep-timeline-col">
              <div className="ep-daygrid-overlay">
                {months.map((d, i) => (
                  <div
                    key={i}
                    className="ep-grid-month"
                    style={{
                      flex: `${d} ${d} 0%`,
                      backgroundImage: `repeating-linear-gradient(to right, rgba(0,0,0,.06) 0, rgba(0,0,0,.06) 1px, transparent 1px, transparent calc(100%/${d}))`
                    }}
                  />
                ))}
              </div>
              {showTodayLine && <div className="ep-today-line" style={{ left: `${todayPct}%` }} />}
              <div className="ep-chart-body">
                {events.length === 0 && !loading && (
                  <div className="ep-empty-hint">「＋ イベント追加」からイベントを作成してください</div>
                )}
                {events.map((ev) => {
                  const s = clamp(dateToIdx(ev.startDate, year), 0, total - 1)
                  const e = clamp(dateToIdx(ev.endDate, year), s, total - 1)
                  const leftPct = pctNum(s, total)
                  const widthPct = pctNumEnd(e, total) - pctNum(s, total)
                  return (
                    <div key={ev.id} className="ep-event-row" data-id={ev.id}>
                      <div className="ep-row-timeline">
                        <div
                          className="ep-arrow-body"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: ev.color }}
                          onPointerDown={(e) => handlePointerDown(e, ev.id, 'move')}
                        >
                          <div
                            className="ep-handle ep-handle-left"
                            onPointerDown={(e) => {
                              e.stopPropagation()
                              handlePointerDown(e, ev.id, 'resize-start')
                            }}
                          />
                          <div
                            className="ep-handle ep-handle-right"
                            onPointerDown={(e) => {
                              e.stopPropagation()
                              handlePointerDown(e, ev.id, 'resize-end')
                            }}
                          />
                          <div className="ep-arrowhead" style={{ borderLeftColor: ev.color }} />
                        </div>
                        <div className="ep-date-label start" style={{ left: `${leftPct}%` }}>
                          {fmtShort(ev.startDate)}
                        </div>
                        <div className="ep-date-label end" style={{ left: `${pctNumEnd(e, total)}%` }}>
                          {fmtShort(ev.endDate)}
                        </div>
                        {ev.checkpoints.map((cp, idx) => {
                          const ci = clamp(dateToIdx(cp, year), 0, total - 1)
                          const p = pctNumMid(ci, total)
                          return (
                            <div
                              key={idx}
                              className="ep-checkpoint-marker"
                              style={{ left: `${p}%` }}
                              title={`チェックポイント: ${cp}`}
                              onPointerDown={(e) => handlePointerDown(e, ev.id, 'checkpoint', idx)}
                            >
                              <div className="ep-triangle-shape" />
                              <div className="ep-marker-label">{fmtShort(cp)}</div>
                            </div>
                          )
                        })}
                        {ev.goalDate && (
                          <div
                            className="ep-goal-marker"
                            style={{
                              left: `${pctNumMid(clamp(dateToIdx(ev.goalDate, year), 0, total - 1), total)}%`
                            }}
                            title={`ゴール: ${ev.goalDate}`}
                            onPointerDown={(e) => handlePointerDown(e, ev.id, 'goal')}
                          >
                            <div className="ep-star-shape">★</div>
                            <div className="ep-marker-label">{fmtShort(ev.goalDate)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="ep-legend">
            <div className="ep-legend-item">
              <div className="ep-legend-arrow" />
              <span>期間</span>
            </div>
            <div className="ep-legend-item">
              <div className="ep-legend-triangle" />
              <span>チェックポイント</span>
            </div>
            <div className="ep-legend-item">
              <span className="ep-legend-star">★</span>
              <span>ゴール</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ep-table-card">
        <h2>イベント一覧</h2>
        <table className="ep-table">
          <thead>
            <tr>
              <th>イベント</th>
              <th>期間</th>
              <th>チェックポイント</th>
              <th>ゴール</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="ep-empty-hint">
                  イベントがありません
                </td>
              </tr>
            )}
            {events.map((ev) => (
              <tr key={ev.id}>
                <td className="ep-col-name">
                  <div className="ep-col-name-inner">
                    <input
                      type="color"
                      className="ep-color-input"
                      value={ev.color}
                      onChange={(e) => handleColorChange(ev.id, e.target.value)}
                    />
                    <input
                      type="text"
                      className="ep-name-input"
                      value={ev.name}
                      onChange={(e) => handleNameChange(ev.id, e.target.value)}
                      onBlur={() => handleNameCommit(ev.id)}
                    />
                  </div>
                </td>
                <td className="ep-col-period">
                  <input
                    type="date"
                    value={ev.startDate}
                    min={`${year}-01-01`}
                    max={`${year}-12-31`}
                    onChange={(e) => handleStartChange(ev.id, e.target.value)}
                  />{' '}
                  〜
                  <br />
                  <input
                    type="date"
                    value={ev.endDate}
                    min={`${year}-01-01`}
                    max={`${year}-12-31`}
                    onChange={(e) => handleEndChange(ev.id, e.target.value)}
                  />
                </td>
                <td className="ep-col-cp">
                  {ev.checkpoints.map((cp, idx) => (
                    <div key={idx} className="ep-cp-row">
                      <input
                        type="date"
                        value={cp}
                        min={`${year}-01-01`}
                        max={`${year}-12-31`}
                        onChange={(e) => handleCheckpointDateChange(ev.id, idx, e.target.value)}
                      />
                      <button className="ep-cp-remove" onClick={() => handleRemoveCheckpoint(ev.id, idx)}>
                        ×
                      </button>
                    </div>
                  ))}
                  <button className="ep-cp-add" onClick={() => handleAddCheckpoint(ev.id)}>
                    ＋ チェックポイント追加
                  </button>
                </td>
                <td className="ep-col-goal">
                  {ev.goalDate ? (
                    <>
                      <input
                        type="date"
                        value={ev.goalDate}
                        min={`${year}-01-01`}
                        max={`${year}-12-31`}
                        onChange={(e) => handleGoalDateChange(ev.id, e.target.value)}
                      />
                      <button className="ep-goal-clear" onClick={() => handleGoalClear(ev.id)}>
                        ゴール解除
                      </button>
                    </>
                  ) : (
                    <button className="ep-goal-set" onClick={() => handleGoalSet(ev.id)}>
                      ＋ ゴール設定
                    </button>
                  )}
                </td>
                <td className="ep-col-del">
                  <button className="ep-row-del" title="イベント削除" onClick={() => handleRemoveEvent(ev.id)}>
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="ep-footnote">
        ※ イベントのデータはMySQLに保存され、年ごとに管理されます。ドラッグ操作や表の入力は自動的にサーバーへ反映されます。
      </p>
    </>
  )
}

export default EventPlanner
