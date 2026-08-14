import { useCallback, useEffect, useRef, useState } from 'react'
import type { EventItem, EventUpsertPayload } from './types'
import { createEvent, deleteEvent, fetchEvents, updateEvent } from './api'
import { clamp, dateToIdx, idxToDate, todayDateStr, totalDaysInYear } from './dateUtils'

const DEFAULT_COLOR = '#2b2b2b'
const DEFAULT_CHECKPOINT_COLOR = '#1c1a17'
const DEFAULT_GOAL_COLOR = '#b3241c'
// バックエンドはイベント名を必須(空文字不可)としているため、新規作成時はこの文字列で保存する。
// ただしフロント側では、この初期値のままの入力欄をクリックした瞬間にプレースホルダー扱いで
// 空欄表示にする(EventListTable.tsx / Timeline.tsx参照)。
export const DEFAULT_EVENT_NAME = '新しいイベント'

function toPayload(ev: EventItem): EventUpsertPayload {
  return {
    year: ev.year,
    name: ev.name,
    owner: ev.owner,
    color: ev.color,
    startDate: ev.startDate,
    endDate: ev.endDate,
    goalDate: ev.goalDate,
    goalColor: ev.goalColor,
    checkpoints: ev.checkpoints
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '不明なエラーが発生しました'
}

/**
 * 年間計画・四半期・担当別の各タブで共有するイベントデータとその操作をまとめたフック。
 * タブを切り替えてもデータの取得し直しや状態の食い違いが起きないよう、
 * 呼び出し元(PlannerShell)で1回だけ呼び出し、各ビューにpropsとして配る想定。
 */
export function useEventPlanner(year: number) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  // 同じイベントIDへの保存リクエストが重ならないようにするためのキュー(id -> 直前の保存を表すPromise)。
  // バーのドラッグ直後にチェックポイントも操作する、といった連続操作で2件のPUTが同時に飛ぶと、
  // サーバー側(MySQL)でチェックポイント行の削除・再作成がデッドロックすることがあるため、
  // フロント側でも「同じイベントへの保存は必ず1件ずつ順番に」実行されるようにする。
  const pendingSaveRef = useRef<Map<number, Promise<void>>>(new Map())

  const total = totalDaysInYear(year)

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
    const runSave = (): Promise<void> => {
      markSaving(ev.id, true)
      return updateEvent(ev.id, toPayload(ev))
        .then((saved) => {
          setEvents((prev) => prev.map((e) => (e.id === saved.id ? saved : e)))
          setLastSavedAt(new Date())
        })
        .catch((err) => setError(errorMessage(err)))
        .finally(() => markSaving(ev.id, false))
    }
    // 同じイベントIDへの直前の保存(あれば)が完了してから実行する。これにより、
    // 短時間に連続して操作しても同じイベントに対するPUTが同時に2件飛ぶことがなくなる。
    const previous = pendingSaveRef.current.get(ev.id) ?? Promise.resolve()
    const chained = previous.then(runSave, runSave)
    pendingSaveRef.current.set(ev.id, chained)
  }, [])

  const handleAddEvent = () => {
    // 「新しいイベント」の初期期間は、常に1/1〜1/30に固定していると、表示中の年と実際の今日が
    // 離れているときに毎回1月まで期間をずらす手間が発生してしまう。今日の月日を表示中の年に
    // 当てはめた日を開始日にすることで、まず今日の近くに置かれるようにする。
    const [, todayMonth, todayDay] = todayDateStr().split('-').map(Number)
    const monthStr = String(todayMonth).padStart(2, '0')
    const dayStr = String(todayDay).padStart(2, '0')
    // 2/29(うるう日)を平年に当てはめた場合など、存在しない日付はDate.UTCが自動的に
    // 翌日以降へ繰り上げてくれるので、ここで特別扱いする必要はない。
    const todayIdxInYear = clamp(dateToIdx(`${year}-${monthStr}-${dayStr}`, year), 0, total - 1)
    const startIdx = todayIdxInYear
    const endIdx = Math.min(startIdx + 29, total - 1)
    const payload: EventUpsertPayload = {
      year,
      name: DEFAULT_EVENT_NAME,
      owner: '',
      color: DEFAULT_COLOR,
      startDate: idxToDate(startIdx, year),
      endDate: idxToDate(endIdx, year),
      goalDate: null,
      goalColor: DEFAULT_GOAL_COLOR,
      checkpoints: []
    }
    setError(null)
    createEvent(payload)
      .then((created) => {
        setEvents((prev) => [...prev, created])
        setLastSavedAt(new Date())
      })
      .catch((err) => setError(errorMessage(err)))
  }

  const handleRemoveEvent = (id: number) => {
    setError(null)
    deleteEvent(id)
      .then(() => {
        setEvents((prev) => prev.filter((e) => e.id !== id))
        setLastSavedAt(new Date())
      })
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
  const handleOwnerChange = (id: number, owner: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, owner } : e)))
  }
  const handleOwnerCommit = (id: number) => {
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
  const handleGoalColorChange = (id: number, goalColor: string) => updateLocalAndPersist(id, { goalColor })
  const handleAddCheckpoint = (id: number) => {
    const ev = events.find((e) => e.id === id)
    if (!ev) return
    const s = dateToIdx(ev.startDate, year)
    const e2 = dateToIdx(ev.endDate, year)
    const mid = clamp(s + Math.floor((e2 - s) / 2), 0, total - 1)
    updateLocalAndPersist(id, {
      checkpoints: [...ev.checkpoints, { date: idxToDate(mid, year), label: '', color: DEFAULT_CHECKPOINT_COLOR }]
    })
  }
  const handleRemoveCheckpoint = (id: number, idx: number) => {
    const ev = events.find((e) => e.id === id)
    if (!ev) return
    updateLocalAndPersist(id, { checkpoints: ev.checkpoints.filter((_, i) => i !== idx) })
  }
  const handleCheckpointDateChange = (id: number, idx: number, value: string) => {
    const ev = events.find((e) => e.id === id)
    if (!ev) return
    updateLocalAndPersist(id, {
      checkpoints: ev.checkpoints.map((c, i) => (i === idx ? { ...c, date: value } : c))
    })
  }
  const handleCheckpointLabelChange = (id: number, idx: number, label: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, checkpoints: e.checkpoints.map((c, i) => (i === idx ? { ...c, label } : c)) }
          : e
      )
    )
  }
  const handleCheckpointLabelCommit = (id: number) => {
    setEvents((prev) => {
      const ev = prev.find((e) => e.id === id)
      if (ev) persist(ev)
      return prev
    })
  }
  const handleCheckpointColorChange = (id: number, idx: number, color: string) => {
    const ev = events.find((e) => e.id === id)
    if (!ev) return
    updateLocalAndPersist(id, {
      checkpoints: ev.checkpoints.map((c, i) => (i === idx ? { ...c, color } : c))
    })
  }

  return {
    events,
    setEvents,
    loading,
    error,
    setError,
    savingIds,
    lastSavedAt,
    persist,
    handleAddEvent,
    handleRemoveEvent,
    handleNameChange,
    handleNameCommit,
    handleOwnerChange,
    handleOwnerCommit,
    handleColorChange,
    handleStartChange,
    handleEndChange,
    handleGoalSet,
    handleGoalClear,
    handleGoalDateChange,
    handleGoalColorChange,
    handleAddCheckpoint,
    handleRemoveCheckpoint,
    handleCheckpointDateChange,
    handleCheckpointLabelChange,
    handleCheckpointLabelCommit,
    handleCheckpointColorChange
  }
}

export type EventPlannerState = ReturnType<typeof useEventPlanner>
