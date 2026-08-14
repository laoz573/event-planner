import { useMemo, useState } from 'react'
import type { EventPlannerState } from './useEventPlanner'
import StatBar from './StatBar'
import type { StatusFilter } from './StatBar'
import Timeline from './Timeline'
import EventListTable from './EventListTable'
import { computeStatus, todayDateStr } from './dateUtils'
import { downloadEventsCsv } from './csv'

interface AnnualViewProps extends EventPlannerState {
  year: number
  setYear: (y: number) => void
}

function AnnualView({ year, setYear, events, setEvents, ...planner }: AnnualViewProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filteredEvents = useMemo(() => {
    const today = todayDateStr()
    const keyword = search.trim().toLowerCase()
    return events.filter((ev) => {
      if (keyword && !ev.name.toLowerCase().includes(keyword) && !ev.owner.toLowerCase().includes(keyword)) {
        return false
      }
      if (statusFilter !== 'all' && computeStatus(ev, today) !== statusFilter) {
        return false
      }
      return true
    })
  }, [events, search, statusFilter])

  return (
    <>
      <StatBar
        year={year}
        setYear={setYear}
        events={events}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        loading={planner.loading}
        savingCount={planner.savingIds.size}
      />

      {planner.error && <p className="error-text">{planner.error}</p>}

      <Timeline
        title="ANNUAL TIMELINE"
        year={year}
        events={filteredEvents}
        setEvents={setEvents}
        persist={planner.persist}
        loading={planner.loading}
        onNameChange={planner.handleNameChange}
        onNameCommit={planner.handleNameCommit}
        onOwnerChange={planner.handleOwnerChange}
        onOwnerCommit={planner.handleOwnerCommit}
        onRemoveEvent={planner.handleRemoveEvent}
      />

      <EventListTable
        title="EVENT LIST"
        hint="入力は自動でサーバーに保存されます"
        year={year}
        events={filteredEvents}
        loading={planner.loading}
        onAddEvent={planner.handleAddEvent}
        onNameChange={planner.handleNameChange}
        onNameCommit={planner.handleNameCommit}
        onOwnerChange={planner.handleOwnerChange}
        onOwnerCommit={planner.handleOwnerCommit}
        onColorChange={planner.handleColorChange}
        onStartChange={planner.handleStartChange}
        onEndChange={planner.handleEndChange}
        onGoalSet={planner.handleGoalSet}
        onGoalClear={planner.handleGoalClear}
        onGoalDateChange={planner.handleGoalDateChange}
        onGoalColorChange={planner.handleGoalColorChange}
        onAddCheckpoint={planner.handleAddCheckpoint}
        onRemoveCheckpoint={planner.handleRemoveCheckpoint}
        onCheckpointDateChange={planner.handleCheckpointDateChange}
        onCheckpointLabelChange={planner.handleCheckpointLabelChange}
        onCheckpointLabelCommit={planner.handleCheckpointLabelCommit}
        onCheckpointColorChange={planner.handleCheckpointColorChange}
        onRemoveEvent={planner.handleRemoveEvent}
      />

      <div className="ep-table-footer">
        <span className="ep-muted-hint">{filteredEvents.length}件を表示 — データは年ごとに保存されます</span>
        <button className="ep-btn-ghost" onClick={() => downloadEventsCsv(filteredEvents, year)}>
          CSV書き出し
        </button>
      </div>
    </>
  )
}

export default AnnualView
