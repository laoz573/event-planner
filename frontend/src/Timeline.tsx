import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from 'react'
import type { EventItem } from './types'
import { DEFAULT_EVENT_NAME } from './useEventPlanner'
import {
  MONTH_NAMES,
  clamp,
  daysInMonthArr,
  dateToIdx,
  fmtShort,
  idxToDate,
  todayDateStr,
  totalDaysInYear
} from './dateUtils'

type DragRole = 'move' | 'resize-start' | 'resize-end' | 'checkpoint' | 'goal'

interface DragCtx {
  eventId: number
  role: DragRole
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

interface TimelineProps {
  title: string
  year: number
  events: EventItem[]
  setEvents: Dispatch<SetStateAction<EventItem[]>>
  persist: (ev: EventItem) => void
  loading?: boolean
  /** [開始月(0始まり,含む), 終了月(0始まり,含まない)]。省略時は1年分(0〜12)。 */
  monthRange?: [number, number]
  onNameChange: (id: number, name: string) => void
  onNameCommit: (id: number) => void
  onOwnerChange: (id: number, owner: string) => void
  onOwnerCommit: (id: number) => void
  onRemoveEvent: (id: number) => void
}

const BASE_ROW_HEIGHT = 146
const LANE_PAD = 8

/**
 * チェックポイント/ゴールのラベルが横方向でぶつかる場合に、段(レーン)をずらして積む。
 * 段が増えた行は、上に積んだ分だけ上下に高さを広げ、左のラベル列の行も同じ高さに揃える。
 */
function layoutMarkers(root: HTMLElement | null) {
  if (!root) return
  const timelines = root.querySelectorAll<HTMLElement>('.ep-event-row .ep-row-timeline')
  const labels = root.querySelectorAll<HTMLElement>('.ep-row-label-col .ep-row-label')
  timelines.forEach((rowTimeline, i) => {
    const rowLabel = labels[i]
    const items = Array.from(rowTimeline.querySelectorAll<HTMLElement>('.ep-checkpoint-marker, .ep-goal-marker'))
    const width = rowTimeline.clientWidth
    const visible = items.filter((mk) => mk.style.left)
    if (width === 0 || visible.length === 0) {
      items.forEach((mk) => mk.style.setProperty('--lane-shift', '0px'))
      rowTimeline.style.height = ''
      if (rowLabel) rowLabel.style.height = ''
      return
    }
    let step = 0
    const boxes = visible
      .map((mk) => {
        const x = (parseFloat(mk.style.left) / 100) * width
        const half = mk.offsetWidth / 2 + LANE_PAD / 2
        step = Math.max(step, mk.offsetHeight + 4)
        return { mk, left: x - half, right: x + half }
      })
      .sort((a, b) => a.left - b.left)
    const laneRight: number[] = []
    let maxLane = 0
    boxes.forEach((b) => {
      let lane = 0
      while (lane < laneRight.length && laneRight[lane] > b.left) lane++
      laneRight[lane] = b.right
      if (lane > maxLane) maxLane = lane
      b.mk.style.setProperty('--lane-shift', `${lane * step}px`)
    })
    const h = maxLane === 0 ? '' : `${BASE_ROW_HEIGHT + 2 * maxLane * step}px`
    rowTimeline.style.height = h
    if (rowLabel) rowLabel.style.height = h
  })
}

function Timeline({
  title,
  year,
  events,
  setEvents,
  persist,
  loading,
  monthRange,
  onNameChange,
  onNameCommit,
  onOwnerChange,
  onOwnerCommit,
  onRemoveEvent
}: TimelineProps) {
  const dragCtxRef = useRef<DragCtx | null>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const months = daysInMonthArr(year)
  const [rangeStartMonth, rangeEndMonthExclusive] = monthRange ?? [0, 12]

  const rangeStartIdx = useMemo(() => {
    return dateToIdx(`${year}-${String(rangeStartMonth + 1).padStart(2, '0')}-01`, year)
  }, [year, rangeStartMonth])
  const rangeEndIdx = useMemo(() => {
    const lastMonth = rangeEndMonthExclusive - 1
    const lastDay = months[lastMonth]
    return dateToIdx(`${year}-${String(lastMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`, year)
  }, [year, rangeEndMonthExclusive, months])
  const rangeTotal = rangeEndIdx - rangeStartIdx + 1

  const pct = useCallback((idx: number) => ((idx - rangeStartIdx) / rangeTotal) * 100, [rangeStartIdx, rangeTotal])
  const pctEnd = useCallback((idx: number) => ((idx - rangeStartIdx + 1) / rangeTotal) * 100, [rangeStartIdx, rangeTotal])
  const pctMid = useCallback((idx: number) => ((idx - rangeStartIdx + 0.5) / rangeTotal) * 100, [rangeStartIdx, rangeTotal])

  const visibleMonths = months.slice(rangeStartMonth, rangeEndMonthExclusive)
  const visibleMonthNames = MONTH_NAMES.slice(rangeStartMonth, rangeEndMonthExclusive)

  const rows = useMemo(
    () => events.filter((ev) => dateToIdx(ev.endDate, year) >= rangeStartIdx && dateToIdx(ev.startDate, year) <= rangeEndIdx),
    [events, year, rangeStartIdx, rangeEndIdx]
  )

  const applyLiveStyles = (ctx: DragCtx, ev: EventItem) => {
    if (ctx.role === 'move' || ctx.role === 'resize-start' || ctx.role === 'resize-end') {
      const s = dateToIdx(ev.startDate, year)
      const en = dateToIdx(ev.endDate, year)
      const left = pct(s)
      const width = pctEnd(en) - pct(s)
      if (ctx.arrowBodyEl) {
        ctx.arrowBodyEl.style.left = `${left}%`
        ctx.arrowBodyEl.style.width = `${width}%`
      }
      if (ctx.startLabelEl) {
        ctx.startLabelEl.style.left = `${left}%`
        ctx.startLabelEl.textContent = fmtShort(ev.startDate)
      }
      if (ctx.endLabelEl) {
        ctx.endLabelEl.style.left = `${pctEnd(en)}%`
        ctx.endLabelEl.textContent = fmtShort(ev.endDate)
      }
    } else if (ctx.role === 'checkpoint' && ctx.cpIdx !== null) {
      const idx = dateToIdx(ev.checkpoints[ctx.cpIdx].date, year)
      const p = pctMid(idx)
      if (ctx.markerEl) {
        ctx.markerEl.style.left = `${p}%`
        const dateEl = ctx.markerEl.querySelector('.ep-marker-label-date')
        if (dateEl) dateEl.textContent = fmtShort(ev.checkpoints[ctx.cpIdx].date)
      }
    } else if (ctx.role === 'goal') {
      const idx = dateToIdx(ev.goalDate ?? ev.startDate, year)
      const p = pctMid(idx)
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
      const dDays = Math.round((dx / ctx.total) * rangeTotal)
      // ctx.total はドラッグ開始時のタイムライン幅(px)。rangeTotalとの比でpx→日数へ変換する。

      setEvents((prev) => {
        const idx = prev.findIndex((x) => x.id === ctx.eventId)
        if (idx === -1) return prev
        const ev: EventItem = { ...prev[idx] }
        const yearTotal = totalDaysInYear(year)

        if (ctx.role === 'move') {
          let s = dateToIdx(ctx.origStart, year) + dDays
          let en = dateToIdx(ctx.origEnd, year) + dDays
          const dur = en - s
          s = clamp(s, 0, yearTotal - 1 - dur)
          en = s + dur
          ev.startDate = idxToDate(s, year)
          ev.endDate = idxToDate(en, year)
        } else if (ctx.role === 'resize-start') {
          const enIdx = dateToIdx(ev.endDate, year)
          const s = clamp(dateToIdx(ctx.origStart, year) + dDays, 0, enIdx)
          ev.startDate = idxToDate(s, year)
        } else if (ctx.role === 'resize-end') {
          const sIdx = dateToIdx(ev.startDate, year)
          const en = clamp(dateToIdx(ctx.origEnd, year) + dDays, sIdx, yearTotal - 1)
          ev.endDate = idxToDate(en, year)
        } else if (ctx.role === 'checkpoint' && ctx.cpIdx !== null && ctx.origCp) {
          const cpDay = clamp(dateToIdx(ctx.origCp, year) + dDays, 0, yearTotal - 1)
          const checkpoints = [...ev.checkpoints]
          checkpoints[ctx.cpIdx] = { ...checkpoints[ctx.cpIdx], date: idxToDate(cpDay, year) }
          ev.checkpoints = checkpoints
        } else if (ctx.role === 'goal' && ctx.origGoal) {
          const gDay = clamp(dateToIdx(ctx.origGoal, year) + dDays, 0, yearTotal - 1)
          ev.goalDate = idxToDate(gDay, year)
        }

        applyLiveStyles(ctx, ev)
        layoutMarkers(innerRef.current)

        const next = [...prev]
        next[idx] = ev
        return next
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, rangeTotal]
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
  }, [persist, setEvents])

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
      total: rect.width,
      startX: e.clientX,
      origStart: ev.startDate,
      origEnd: ev.endDate,
      cpIdx: cpIdx ?? null,
      origCp: cpIdx !== undefined ? ev.checkpoints[cpIdx].date : null,
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

  // 描画のたびに(イベント・年・表示範囲が変わったとき)重なりを解消する
  useLayoutEffect(() => {
    layoutMarkers(innerRef.current)
  })

  // 画面幅が変わるとラベルの横位置(px)が変わるので、リサイズ時にも計算し直す
  useEffect(() => {
    const onResize = () => layoutMarkers(innerRef.current)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const todayStr = todayDateStr()
  const todayIdx = dateToIdx(todayStr, year)
  const showTodayLine = todayIdx >= rangeStartIdx && todayIdx <= rangeEndIdx
  const todayPct = showTodayLine ? pctMid(todayIdx) : 0

  return (
    <div className="ep-chart-card">
      <div className="ep-chart-card-head">
        <h3>{title}</h3>
        <span className="ep-muted-hint">バーをドラッグで期間移動、両端で開始／終了を調整</span>
      </div>
      <div className="ep-chart-scroll">
        <div className="ep-chart-inner" ref={innerRef}>
          <div className="ep-header-row">
            <div className="ep-row-label-spacer">EVENT / OWNER</div>
            <div className="ep-months-row">
              {visibleMonths.map((d, i) => (
                <div key={i} className="ep-month-cell" style={{ flex: `${d} ${d} 0%` }}>
                  <div className="ep-month-label">{visibleMonthNames[i]}</div>
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
              {rows.map((ev) => (
                <div key={ev.id} className="ep-row-label">
                  <span className="ep-row-color-bar" style={{ background: ev.color }} />
                  <div className="ep-row-label-text">
                    <input
                      className="ep-name-chart"
                      value={ev.name}
                      placeholder={DEFAULT_EVENT_NAME}
                      onChange={(e) => onNameChange(ev.id, e.target.value)}
                      onFocus={(e) => {
                        if (ev.name === DEFAULT_EVENT_NAME) {
                          onNameChange(ev.id, '')
                        } else {
                          e.target.select()
                        }
                      }}
                      onBlur={() => {
                        if (ev.name.trim() === '') {
                          onNameChange(ev.id, DEFAULT_EVENT_NAME)
                        }
                        onNameCommit(ev.id)
                      }}
                    />
                    <input
                      className="ep-owner-chart"
                      placeholder="担当を入力"
                      value={ev.owner}
                      onChange={(e) => onOwnerChange(ev.id, e.target.value)}
                      onBlur={() => onOwnerCommit(ev.id)}
                    />
                  </div>
                  <button className="ep-row-del-mini" title="削除" onClick={() => onRemoveEvent(ev.id)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="ep-timeline-col">
              <div className="ep-daygrid-overlay">
                {visibleMonths.map((d, i) => (
                  <div
                    key={i}
                    className="ep-grid-month"
                    style={{
                      flex: `${d} ${d} 0%`,
                      backgroundImage: `repeating-linear-gradient(to right, rgba(0,0,0,.05) 0, rgba(0,0,0,.05) 1px, transparent 1px, transparent calc(100%/${d}))`
                    }}
                  />
                ))}
              </div>
              {showTodayLine && (
                <div className="ep-today-line" style={{ left: `${todayPct}%` }}>
                  <span className="ep-today-label">TODAY</span>
                </div>
              )}
              <div className="ep-chart-body">
                {rows.length === 0 && !loading && (
                  <div className="ep-empty-hint">表示できるイベントがありません</div>
                )}
                {rows.map((ev) => {
                  const s = clamp(dateToIdx(ev.startDate, year), rangeStartIdx, rangeEndIdx)
                  const e = clamp(dateToIdx(ev.endDate, year), s, rangeEndIdx)
                  const leftPct = pct(s)
                  const widthPct = pctEnd(e) - pct(s)
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
                        </div>
                        <div className="ep-date-label start" style={{ left: `${leftPct}%` }}>
                          {fmtShort(ev.startDate)}
                        </div>
                        <div className="ep-date-label end" style={{ left: `${pctEnd(e)}%` }}>
                          {fmtShort(ev.endDate)}
                        </div>
                        {ev.checkpoints.map((cp, idx) => {
                          const ci = dateToIdx(cp.date, year)
                          if (ci < rangeStartIdx || ci > rangeEndIdx) return null
                          const p = pctMid(ci)
                          return (
                            <div
                              key={idx}
                              className={`ep-checkpoint-marker${cp.label ? ' ep-marker-has-label' : ''}${cp.achieved ? ' ep-marker-achieved' : ''}`}
                              style={{ left: `${p}%` }}
                              title={`${cp.label ? `${cp.label}(${fmtShort(cp.date)})` : `チェックポイント: ${cp.date}`}${cp.achieved ? ' 達成' : ' 未達'}`}
                              onPointerDown={(e) => handlePointerDown(e, ev.id, 'checkpoint', idx)}
                            >
                              <div className="ep-triangle-shape" style={{ borderBottomColor: cp.color }} />
                              <div className="ep-marker-label">
                                {cp.label && <span className="ep-marker-label-text">{cp.label}</span>}
                                <span className="ep-marker-label-date">{fmtShort(cp.date)}</span>
                              </div>
                            </div>
                          )
                        })}
                        {ev.goalDate &&
                          (() => {
                            const gi = dateToIdx(ev.goalDate, year)
                            if (gi < rangeStartIdx || gi > rangeEndIdx) return null
                            return (
                              <div
                                className="ep-goal-marker"
                                style={{ left: `${pctMid(gi)}%` }}
                                title={`ゴール: ${ev.goalDate}`}
                                onPointerDown={(e) => handlePointerDown(e, ev.id, 'goal')}
                              >
                                <div className="ep-square-shape" style={{ background: ev.goalColor }} />
                                <div className="ep-marker-label">{fmtShort(ev.goalDate)}</div>
                              </div>
                            )
                          })()}
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
              <div className="ep-legend-square" />
              <span>ゴール</span>
            </div>
            <div className="ep-legend-item">
              <div className="ep-legend-today-line" />
              <span>本日</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Timeline
