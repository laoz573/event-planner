// 実績タブの折れ線グラフ用の集計(画面に依存しない純粋な関数)。
// 日付は 'YYYY-MM-DD' の文字列をUTCの0時として扱い、タイムゾーンの影響を受けないようにしている。

export type LineMode = 'year' | 'month' | 'week' | 'day'

export interface AggregateParams {
  /** 年間: 表示する年 */
  year: number
  /** 月間: 'YYYY-MM' */
  month: string
  /** 週数・日数: 期間の開始日・終了日 'YYYY-MM-DD' */
  from: string
  to: string
}

export interface AggregateResult {
  labels: string[]
  /** 全イベントの合計(分) */
  total: number[]
  /** イベントidごとの値(分) */
  byEvent: Record<number, number[]>
  error: string | null
}

export const MAX_DAYS = 366

const pad2 = (n: number) => (n < 10 ? '0' : '') + n

function parseDate(str: string): number {
  const [y, m, d] = str.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fmtDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

export function addDays(str: string, n: number): string {
  return fmtDate(parseDate(str) + n * 86400000)
}

function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000)
}

/** その日を含む週の月曜日。 */
function mondayOf(str: string): string {
  const dow = new Date(parseDate(str)).getUTCDay() // 日=0
  return addDays(str, -((dow + 6) % 7))
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function shortMD(str: string): string {
  const [, m, d] = str.split('-').map(Number)
  return `${m}/${d}`
}

interface ActualLike {
  workDate: string
  minutes: number
  eventId: number
}

function fail(error: string): AggregateResult {
  return { labels: [], total: [], byEvent: {}, error }
}

export function aggregate(
  actuals: ActualLike[],
  mode: LineMode,
  params: AggregateParams,
  eventIds: number[]
): AggregateResult {
  const keys: string[] = []
  const labels: string[] = []
  let keyOf: (d: string) => string
  let inRange: (d: string) => boolean

  if (mode === 'year') {
    for (let m = 1; m <= 12; m++) {
      keys.push(`${params.year}-${pad2(m)}`)
      labels.push(`${m}月`)
    }
    keyOf = (d) => d.slice(0, 7)
    inRange = (d) => d.slice(0, 4) === String(params.year)
  } else if (mode === 'month') {
    const [y, m] = params.month.split('-').map(Number)
    const n = daysInMonth(y, m)
    for (let d = 1; d <= n; d++) {
      keys.push(`${params.month}-${pad2(d)}`)
      labels.push(`${d}日`)
    }
    keyOf = (d) => d
    inRange = (d) => d.slice(0, 7) === params.month
  } else {
    if (!params.from || !params.to) return fail('開始日と終了日を指定してください')
    if (params.from > params.to) return fail('開始日は終了日以前にしてください')
    if (diffDays(params.from, params.to) + 1 > MAX_DAYS) return fail(`期間は${MAX_DAYS}日以内にしてください`)
    inRange = (d) => d >= params.from && d <= params.to
    if (mode === 'week') {
      for (let w = mondayOf(params.from); w <= params.to; w = addDays(w, 7)) {
        keys.push(w)
        labels.push(`${shortMD(w)}〜`)
      }
      keyOf = mondayOf
    } else {
      for (let d = params.from; d <= params.to; d = addDays(d, 1)) {
        keys.push(d)
        labels.push(shortMD(d))
      }
      keyOf = (d) => d
    }
  }

  const index: Record<string, number> = {}
  keys.forEach((k, i) => {
    index[k] = i
  })
  const total = keys.map(() => 0)
  const byEvent: Record<number, number[]> = {}
  eventIds.forEach((id) => {
    byEvent[id] = keys.map(() => 0)
  })

  actuals.forEach((a) => {
    if (!inRange(a.workDate)) return
    const i = index[keyOf(a.workDate)]
    if (i === undefined) return
    total[i] += a.minutes
    if (byEvent[a.eventId]) byEvent[a.eventId][i] += a.minutes
  })
  return { labels, total, byEvent, error: null }
}

/** 「2時間30分」形式の表記。 */
export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}分`
  return m === 0 ? `${h}時間` : `${h}時間${m}分`
}
