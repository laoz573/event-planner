import { useMemo, useState } from 'react'
import type { EventPlannerState } from './useEventPlanner'
import Timeline from './Timeline'
import EventListTable from './EventListTable'
import { QUARTERS, clamp, dateToIdx } from './dateUtils'

interface QuarterViewProps extends EventPlannerState {
  year: number
  setYear: (y: number) => void
}

function QuarterView({ year, setYear, events, setEvents, ...planner }: QuarterViewProps) {
  const [quarterIdx, setQuarterIdx] = useState(() => Math.floor(new Date().getMonth() / 3))
  const quarter = QUARTERS[quarterIdx]

  const rangeStartIdx = useMemo(() => {
    const [startMonth] = quarter.months
    return dateToIdx(`${year}-${String(startMonth + 1).padStart(2, '0')}-01`, year)
  }, [year, quarter])
  const rangeEndIdx = useMemo(() => {
    const [, endMonthExclusive] = quarter.months
    const nextStart = dateToIdx(`${year}-${String(endMonthExclusive + 1).padStart(2, '0')}-01`, year)
    return endMonthExclusive >= 12 ? dateToIdx(`${year}-12-31`, year) : nextStart - 1
  }, [year, quarter])

  const quarterEvents = useMemo(
    () => events.filter((ev) => dateToIdx(ev.endDate, year) >= rangeStartIdx && dateToIdx(ev.startDate, year) <= rangeEndIdx),
    [events, year, rangeStartIdx, rangeEndIdx]
  )

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
        <div className="ep-status-filters">
          {QUARTERS.map((q, idx) => (
            <button
              key={q.label}
              className={`ep-filter-chip${idx === quarterIdx ? ' ep-filter-chip-active' : ''}`}
              onClick={() => setQuarterIdx(idx)}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {planner.error && <p className="error-text">{planner.error}</p>}

      <Timeline
        title={`QUARTER TIMELINE — ${quarter.label}`}
        year={year}
        events={events}
        setEvents={setEvents}
        persist={planner.persist}
        loading={planner.loading}
        monthRange={quarter.months}
        onNameChange={planner.handleNameChange}
        onNameCommit={planner.handleNameCommit}
        onOwnerChange={planner.handleOwnerChange}
        onOwnerCommit={planner.handleOwnerCommit}
        onRemoveEvent={planner.handleRemoveEvent}
      />

      <EventListTable
        title="EVENT LIST"
        hint={`${quarter.label}に含まれるイベントのみ表示`}
        year={year}
        events={quarterEvents}
        loading={planner.loading}
        genres={planner.genres}
        onGenreChange={planner.handleGenreChange}
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
        onCheckpointAchievedChange={planner.handleCheckpointAchievedChange}
        onStatusChange={planner.handleStatusChange}
        onRemoveEvent={planner.handleRemoveEvent}
      />
    </>
  )
}

export default QuarterView
