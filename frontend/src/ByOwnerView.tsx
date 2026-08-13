import { useMemo } from 'react'
import type { EventPlannerState } from './useEventPlanner'
import Timeline from './Timeline'
import { clamp } from './dateUtils'

interface ByOwnerViewProps extends EventPlannerState {
  year: number
  setYear: (y: number) => void
}

const UNASSIGNED_LABEL = '担当未設定'

function ByOwnerView({ year, setYear, events, setEvents, ...planner }: ByOwnerViewProps) {
  const groups = useMemo(() => {
    const map = new Map<string, typeof events>()
    for (const ev of events) {
      const key = ev.owner.trim() || UNASSIGNED_LABEL
      const list = map.get(key)
      if (list) list.push(ev)
      else map.set(key, [ev])
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === UNASSIGNED_LABEL) return 1
      if (b[0] === UNASSIGNED_LABEL) return -1
      return a[0].localeCompare(b[0], 'ja')
    })
  }, [events])

  return (
    <>
      <div className="ep-statbar ep-statbar-quarter">
        <div className="ep-year-stepper">
          <button className="ep-year-arrow" onClick={() => setYear(clamp(year - 1, 1900, 2200))} aria-label="前の年">
            ‹
          </button>
          <span className="ep-year-value">{year}年</span>
          <button className="ep-year-arrow" onClick={() => setYear(clamp(year + 1, 1900, 2200))} aria-label="次の年">
            ›
          </button>
        </div>
        <span className="ep-muted-hint">担当ごとにイベントをグルーピングして表示しています(担当はEVENT LISTの「編集」から設定できます)</span>
        <button className="ep-btn-primary" onClick={planner.handleAddEvent}>
          ＋ イベント追加
        </button>
      </div>

      {planner.error && <p className="error-text">{planner.error}</p>}

      {!planner.loading && groups.length === 0 && (
        <div className="ep-chart-card">
          <div className="ep-empty-hint">イベントがありません</div>
        </div>
      )}

      {groups.map(([owner, ownerEvents]) => (
        <Timeline
          key={owner}
          title={`${owner} (${ownerEvents.length}件)`}
          year={year}
          events={ownerEvents}
          setEvents={setEvents}
          persist={planner.persist}
          loading={planner.loading}
          onNameChange={planner.handleNameChange}
          onNameCommit={planner.handleNameCommit}
          onOwnerChange={planner.handleOwnerChange}
          onOwnerCommit={planner.handleOwnerCommit}
          onRemoveEvent={planner.handleRemoveEvent}
        />
      ))}
    </>
  )
}

export default ByOwnerView
