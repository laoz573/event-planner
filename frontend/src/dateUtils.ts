import type { EventItem, EventStatus } from './types'

export const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}
export function daysInMonthArr(y: number) {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
}
export function totalDaysInYear(y: number) {
  return isLeap(y) ? 366 : 365
}
export function dateToIdx(dateStr: string, year: number): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const janFirst = Date.UTC(year, 0, 1)
  const target = Date.UTC(y, m - 1, d)
  return Math.round((target - janFirst) / 86400000)
}
export function idxToDate(idx: number, year: number): string {
  const dt = new Date(Date.UTC(year, 0, 1) + idx * 86400000)
  return dt.toISOString().slice(0, 10)
}
export function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}
/** 'YYYY-MM-DD' -> 'M/D' (月・日ともに0埋めなしで統一。例: '2026-09-04' -> '9/4') */
export function fmtShort(dateStr: string | null): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  const month = Number(parts[1])
  const day = Number(parts[2])
  return `${month}/${day}`
}
export function pctNum(idx: number, total: number) {
  return (idx / total) * 100
}
export function pctNumEnd(idx: number, total: number) {
  return ((idx + 1) / total) * 100
}
export function pctNumMid(idx: number, total: number) {
  return ((idx + 0.5) / total) * 100
}

/** 'M/DD 〜 M/DD' 形式の期間表示(EVENT LISTテーブル用) */
export function formatPeriod(startDate: string, endDate: string): string {
  return `${fmtShort(startDate)} 〜 ${fmtShort(endDate)}`
}

/** 開始日〜終了日の日数(両端を含む) */
export function countDays(startDate: string, endDate: string): number {
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const s = Date.UTC(sy, sm - 1, sd)
  const e = Date.UTC(ey, em - 1, ed)
  return Math.round((e - s) / 86400000) + 1
}

/** 'YYYY-MM-DD' 形式の今日の日付文字列(ローカルタイムゾーン基準) */
export function todayDateStr(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 今日の日付とイベントの期間を比較して状態を判定する(バックエンドには保存しない派生値) */
export function computeStatus(ev: Pick<EventItem, 'startDate' | 'endDate'>, todayStr: string): EventStatus {
  if (todayStr > ev.endDate) return '完了'
  if (todayStr < ev.startDate) return '予定'
  return '進行中'
}

export const QUARTERS: { label: string; months: [number, number] }[] = [
  { label: 'Q1 (1〜3月)', months: [0, 3] },
  { label: 'Q2 (4〜6月)', months: [3, 6] },
  { label: 'Q3 (7〜9月)', months: [6, 9] },
  { label: 'Q4 (10〜12月)', months: [9, 12] }
]
