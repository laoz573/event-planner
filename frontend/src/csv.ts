import type { EventItem } from './types'
import { computeStatus, countDays, formatPeriod, todayDateStr } from './dateUtils'

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function eventsToCsv(events: EventItem[]): string {
  const today = todayDateStr()
  const header = ['イベント', '担当', '期間', '日数', 'チェックポイント', 'ゴール', '状態']
  const rows = events.map((ev) => [
    ev.name,
    ev.owner,
    formatPeriod(ev.startDate, ev.endDate),
    String(countDays(ev.startDate, ev.endDate)),
    ev.checkpoints.join(' / '),
    ev.goalDate ?? '',
    computeStatus(ev, today)
  ])
  const lines = [header, ...rows].map((cols) => cols.map(escapeCsvField).join(','))
  return lines.join('\r\n')
}

export function downloadEventsCsv(events: EventItem[], year: number): void {
  const csv = eventsToCsv(events)
  // 先頭にBOMを付けることで、Excelで開いたときに文字化けしないようにする
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `event-planner_${year}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
