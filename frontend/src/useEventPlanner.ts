import { useCallback, useEffect, useState } from 'react'
import type { EventItem, EventUpsertPayload } from './types'
import { createEvent, deleteEvent, fetchEvents, updateEvent } from './api'
import { clamp, dateToIdx, idxToDate, totalDaysInYear } from './dateUtils'

const DEFAULT_COLOR = '#2b2b2b'

function toPayload(ev: EventItem): EventUpsertPayload {
  return {
    year: ev.year,
    name: ev.name,
    owner: ev.owner,
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
    markSaving(ev.id, true)
    updateEvent(ev.id, toPayload(ev))
      .then((saved) => {
        setEvents((prev) => prev.map((e) => (e.id === saved.id ? saved : e)))
        setLastSavedAt(new Date())
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
      owner: '',
      color: DEFAULT_COLOR,
      startDate: idxToDate(startIdx, year),
      endDate: idxToDate(endIdx, year),
      goalDate: null,
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
    handleAddCheckpoint,
    handleRemoveCheckpoint,
    handleCheckpointDateChange
  }
}

export type EventPlannerState = ReturnType<typeof useEventPlanner>
