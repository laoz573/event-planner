import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import type { ActualItem, EventItem } from './types'
import type { EventPlannerState } from './useEventPlanner'
import { deleteActual, fetchActuals, saveActual } from './api'
import { countDays, formatPeriod, todayDateStr } from './dateUtils'
import { aggregate, addDays, fmtMinutes } from './actualAggregate'
import type { LineMode } from './actualAggregate'

Chart.register(...registerables)

// 実績タブ。
//   ① 実績入力: ジャンルを選んだイベント(表示中の年)だけを一覧し、イベントごと・日付ごとに
//      「時間」と「分」で作業時間を入力する。同じイベント・同じ日付は上書き。
//   ② 棒グラフ: イベント別の累計(期間を問わず、これまで入力した全部)。色はイベント計画で選んだ色。
//   ③ 折れ線グラフ: 年間(月ごと)・月間(日ごと)・週数(週ごと)・日数(日ごと)の4通りで推移を見る。
//      イベントごとの線と合計の線を表示する。
// 実績はサーバーには「分」で保存する。グラフの単位(時間/分)は表示だけの切り替え。

interface ActualViewProps extends EventPlannerState {
  year: number
  setYear: (y: number) => void
}

type Unit = 'hours' | 'minutes'

const TOTAL_COLOR = '#1c1a17'
const MODES: { key: LineMode; label: string }[] = [
  { key: 'year', label: '年間' },
  { key: 'month', label: '月間' },
  { key: 'week', label: '週数' },
  { key: 'day', label: '日数' }
]

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : '不明なエラーが発生しました'
}

interface Draft {
  date: string
  hours: string
  minutes: string
  note: string
}

/** 1イベント分の入力欄と入力済み一覧。入力途中の値はこのコンポーネントのstateで持つ。 */
function EntryPanel({
  event,
  entries,
  onChanged,
  onError
}: {
  event: EventItem
  entries: ActualItem[]
  onChanged: () => void
  onError: (message: string | null) => void
}) {
  const today = todayDateStr()
  // 日付の初期値は今日。今日がイベント期間の外ならイベント期間の端にする
  const initialDate = today >= event.startDate && today <= event.endDate ? today : today > event.endDate ? event.endDate : event.startDate
  const [draft, setDraft] = useState<Draft>({ date: initialDate, hours: '', minutes: '', note: '' })

  const save = () => {
    const h = draft.hours === '' ? 0 : Number(draft.hours)
    const m = draft.minutes === '' ? 0 : Number(draft.minutes)
    if (!draft.date) return onError('日付を入力してください')
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0) {
      return onError('時間・分は0以上の整数で入力してください')
    }
    const total = h * 60 + m
    if (total <= 0) return onError('時間または分を入力してください')
    if (total > 24 * 60) return onError('1日あたり24時間を超える入力はできません')
    onError(null)
    saveActual(event.id, draft.date, total, draft.note.trim())
      .then(() => {
        setDraft((d) => ({ ...d, hours: '', minutes: '', note: '' }))
        onChanged()
      })
      .catch((err) => onError(errorText(err)))
  }

  const remove = (a: ActualItem) => {
    onError(null)
    deleteActual(a.id)
      .then(onChanged)
      .catch((err) => onError(errorText(err)))
  }

  const sorted = [...entries].sort((a, b) => (a.workDate < b.workDate ? 1 : -1))

  return (
    <div className="ep-act-panel">
      <div className="ep-act-form">
        <label>日付</label>
        <input type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
        <input
          className="ep-act-num"
          type="number"
          min={0}
          max={24}
          step={1}
          placeholder="0"
          value={draft.hours}
          onChange={(e) => setDraft((d) => ({ ...d, hours: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <span>時間</span>
        <input
          className="ep-act-num"
          type="number"
          min={0}
          max={59}
          step={1}
          placeholder="0"
          value={draft.minutes}
          onChange={(e) => setDraft((d) => ({ ...d, minutes: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <span>分</span>
        <input
          type="text"
          className="ep-act-note-input"
          placeholder="備考(任意)"
          maxLength={200}
          value={draft.note}
          onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <button className="ep-btn-primary" onClick={save}>
          保存
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="ep-muted-hint">まだ実績がありません</p>
      ) : (
        <ul className="ep-act-entries">
          {sorted.map((a) => (
            <li key={a.id}>
              <span className="ep-act-entry-date">{a.workDate}</span>
              <span className="ep-act-entry-time">{fmtMinutes(a.minutes)}</span>
              <span className="ep-act-entry-note" title={a.note}>
                {a.note}
              </span>
              <button
                className="ep-btn-ghost"
                onClick={() =>
                  setDraft({
                    date: a.workDate,
                    hours: String(Math.floor(a.minutes / 60)),
                    minutes: String(a.minutes % 60),
                    note: a.note ?? ''
                  })
                }
              >
                修正
              </button>
              <button className="ep-cp-remove" title="この日の実績を削除" onClick={() => remove(a)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ActualView({ year, setYear, events, genres, loading, ...planner }: ActualViewProps) {
  const today = todayDateStr()
  const [actuals, setActuals] = useState<ActualItem[]>([])
  const [actualsLoaded, setActualsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [genreFilter, setGenreFilter] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [unit, setUnit] = useState<Unit>('hours')
  const [mode, setMode] = useState<LineMode>('year')
  const [lineYear, setLineYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(today.slice(0, 7))
  const [from, setFrom] = useState(addDays(today, -29))
  const [to, setTo] = useState(today)

  const barCanvasRef = useRef<HTMLCanvasElement>(null)
  const lineCanvasRef = useRef<HTMLCanvasElement>(null)

  const reload = () =>
    fetchActuals()
      .then((list) => {
        setActuals(list)
        setActualsLoaded(true)
      })
      .catch((err) => {
        setActualsLoaded(true)
        setError(errorText(err))
      })

  // ジャンルを付け外すと実績の集計対象も変わるので、イベントのジャンル構成が変わったら取り直す
  const genreSig = events.map((e) => `${e.id}:${e.genreId ?? ''}`).join(',')
  useEffect(() => {
    void reload()
  }, [genreSig])

  const genreName = (id: number | null | undefined) => genres.find((g) => g.id === id)?.name ?? ''

  const targetEvents = useMemo(
    () => events.filter((ev) => ev.genreId != null && (genreFilter === '' || String(ev.genreId) === genreFilter)),
    [events, genreFilter]
  )

  const minutesOf = (eventId: number) => actuals.filter((a) => a.eventId === eventId).reduce((s, a) => s + a.minutes, 0)

  // グラフに出すイベント(実績が1件でもあるもの)。色はイベント計画で選んだ色をそのまま使う。
  const chartEvents = useMemo(() => {
    const seen = new Set<number>()
    const list: { id: number; name: string; color: string; genreId: number }[] = []
    actuals.forEach((a) => {
      if (seen.has(a.eventId)) return
      seen.add(a.eventId)
      list.push({ id: a.eventId, name: a.eventName, color: a.eventColor || '#2b2b2b', genreId: a.genreId })
    })
    const order = new Map(genres.map((g, i) => [g.id, i]))
    return list.sort((x, y) => {
      const gx = order.get(x.genreId) ?? 999
      const gy = order.get(y.genreId) ?? 999
      return gx !== gy ? gx - gy : x.name < y.name ? -1 : 1
    })
  }, [actuals, genres])

  const toUnit = (min: number) => (unit === 'hours' ? Math.round((min / 60) * 100) / 100 : min)
  const unitLabel = unit === 'hours' ? '時間' : '分'

  const lineResult = useMemo(
    () => aggregate(actuals, mode, { year: lineYear, month, from, to }, chartEvents.map((e) => e.id)),
    [actuals, mode, lineYear, month, from, to, chartEvents]
  )

  // ---- 棒グラフ(イベント別の累計・全期間) ----
  useEffect(() => {
    const canvas = barCanvasRef.current
    if (!canvas || chartEvents.length === 0) return
    const totals = new Map<number, number>()
    actuals.forEach((a) => totals.set(a.eventId, (totals.get(a.eventId) ?? 0) + a.minutes))
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        // ラベルは「イベント名 / ジャンル名」の2行
        labels: chartEvents.map((e) => [e.name, genreName(e.genreId)]),
        datasets: [
          {
            label: '累計',
            data: chartEvents.map((e) => toUnit(totals.get(e.id) ?? 0)),
            backgroundColor: chartEvents.map((e) => e.color)
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => fmtMinutes(unit === 'hours' ? Math.round(Number(ctx.parsed.y) * 60) : Number(ctx.parsed.y)) } }
        },
        scales: { y: { beginAtZero: true, title: { display: true, text: unitLabel } } }
      }
    })
    return () => chart.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actuals, chartEvents, unit, genres])

  // ---- 折れ線グラフ ----
  useEffect(() => {
    const canvas = lineCanvasRef.current
    if (!canvas || lineResult.error) return
    const many = lineResult.labels.length > 60
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: lineResult.labels,
        datasets: [
          ...chartEvents.map((e) => ({
            label: e.name,
            data: (lineResult.byEvent[e.id] ?? []).map(toUnit),
            borderColor: e.color,
            backgroundColor: e.color,
            tension: 0,
            pointRadius: many ? 0 : 3
          })),
          {
            label: '合計',
            data: lineResult.total.map(toUnit),
            borderColor: TOTAL_COLOR,
            backgroundColor: TOTAL_COLOR,
            borderDash: [6, 4],
            tension: 0,
            pointRadius: many ? 0 : 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: ${fmtMinutes(unit === 'hours' ? Math.round(Number(ctx.parsed.y) * 60) : Number(ctx.parsed.y))}`
            }
          }
        },
        scales: { y: { beginAtZero: true, title: { display: true, text: unitLabel } } }
      }
    })
    return () => chart.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineResult, chartEvents, unit])

  const changeMode = (m: LineMode) => {
    setMode(m)
    if (m === 'week') {
      setFrom(addDays(today, -89))
      setTo(today)
    } else if (m === 'day') {
      setFrom(addDays(today, -29))
      setTo(today)
    }
  }

  const yearOptions = useMemo(() => {
    const thisYear = new Date().getFullYear()
    const set = new Set<number>([lineYear])
    for (let y = thisYear - 5; y <= thisYear + 1; y++) set.add(y)
    actuals.forEach((a) => set.add(Number(a.workDate.slice(0, 4))))
    return [...set].sort((a, b) => a - b)
  }, [actuals, lineYear])

  const modeLabel = MODES.find((m) => m.key === mode)?.label ?? ''
  const hasData = chartEvents.length > 0

  return (
    <>
      {error && <p className="error-text">{error}</p>}
      {planner.error && <p className="error-text">{planner.error}</p>}

      <div className="ep-chart-card">
        <div className="ep-chart-card-head">
          <h3>ACTUAL — 実績入力</h3>
          <div className="ep-chart-card-head-actions">
            <button className="ep-btn-ghost" onClick={() => setYear(year - 1)}>
              ◀
            </button>
            <span className="ep-act-year">{year}年</span>
            <button className="ep-btn-ghost" onClick={() => setYear(year + 1)}>
              ▶
            </button>
            <select
              className="ep-act-select"
              value={genreFilter}
              onChange={(e) => {
                setGenreFilter(e.target.value)
                setExpandedId(null)
              }}
            >
              <option value="">すべてのジャンル</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="ep-muted-hint ep-act-hint">
          イベント計画の「編集」でジャンルを選んだイベントだけが表示されます。同じ日付を入力し直すと上書きされます。
        </p>
        {targetEvents.length === 0 ? (
          <p className="ep-empty-hint">
            {loading || !actualsLoaded
              ? '読み込み中...'
              : `ジャンルを設定した ${year}年のイベントがありません。イベント計画の「編集」からジャンルを選んでください。`}
          </p>
        ) : (
          <div className="ep-table-scroll">
            <table className="ep-table ep-act-table">
              <thead>
                <tr>
                  <th>イベント</th>
                  <th>ジャンル</th>
                  <th>期間</th>
                  <th>実績の合計</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {targetEvents.map((ev) => {
                  const sum = minutesOf(ev.id)
                  const opened = expandedId === ev.id
                  return (
                    <Fragment key={ev.id}>
                      <tr>
                        <td className="ep-col-name-display">
                          <span className="ep-name-swatch" style={{ background: ev.color }} />
                          {ev.name}
                        </td>
                        <td>{genreName(ev.genreId) || '—'}</td>
                        <td title={`${countDays(ev.startDate, ev.endDate)}日`}>{formatPeriod(ev.startDate, ev.endDate)}</td>
                        <td className="ep-act-sum">{sum > 0 ? fmtMinutes(sum) : '—'}</td>
                        <td className="ep-col-edit">
                          <button className="ep-edit-toggle" onClick={() => setExpandedId(opened ? null : ev.id)}>
                            {opened ? '閉じる' : '実績を入力'}
                          </button>
                        </td>
                      </tr>
                      {opened && (
                        <tr className="ep-edit-row">
                          <td colSpan={5}>
                            <EntryPanel
                              event={ev}
                              entries={actuals.filter((a) => a.eventId === ev.id)}
                              onChanged={() => void reload()}
                              onError={setError}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ep-chart-card">
        <div className="ep-chart-card-head">
          <h3>ACTUAL CHART — 実績グラフ</h3>
          <div className="ep-chart-card-head-actions">
            <select className="ep-act-select" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              <option value="hours">単位: 時間</option>
              <option value="minutes">単位: 分</option>
            </select>
          </div>
        </div>

        <h4 className="ep-act-subtitle">イベント別の累計(これまでの全期間・色はイベント計画の色)</h4>
        {hasData ? (
          <div className="ep-act-chart-wrap">
            <canvas ref={barCanvasRef} />
          </div>
        ) : (
          <p className="ep-muted-hint ep-act-empty">{actualsLoaded ? 'まだ実績が入力されていません' : '読み込み中...'}</p>
        )}

        <h4 className="ep-act-subtitle">推移({modeLabel})</h4>
        <div className="ep-act-modebar">
          {MODES.map((m) => (
            <button
              key={m.key}
              className={`ep-act-mode${m.key === mode ? ' ep-act-mode-active' : ''}`}
              onClick={() => changeMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="ep-act-periodbar">
          {mode === 'year' && (
            <>
              <span>表示する年</span>
              <select className="ep-act-select" value={lineYear} onChange={(e) => setLineYear(Number(e.target.value))}>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
              <span className="ep-muted-hint">月ごとの合計</span>
            </>
          )}
          {mode === 'month' && (
            <>
              <span>表示する月</span>
              <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
              <span className="ep-muted-hint">日ごとの合計</span>
            </>
          )}
          {(mode === 'week' || mode === 'day') && (
            <>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span>〜</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              {[
                { label: '過去30日間', days: 29 },
                { label: '過去3か月間', days: 89 },
                { label: '過去1年間', days: 364 }
              ].map((q) => (
                <button
                  key={q.label}
                  className="ep-btn-ghost"
                  onClick={() => {
                    setFrom(addDays(today, -q.days))
                    setTo(today)
                  }}
                >
                  {q.label}
                </button>
              ))}
              <span className="ep-muted-hint">{mode === 'week' ? '週(月曜始まり)ごとの合計' : '日ごとの合計'}</span>
            </>
          )}
        </div>
        {lineResult.error ? (
          <p className="error-text">{lineResult.error}</p>
        ) : (
          <div className="ep-act-chart-wrap">
            <canvas ref={lineCanvasRef} />
          </div>
        )}
      </div>
    </>
  )
}

export default ActualView
