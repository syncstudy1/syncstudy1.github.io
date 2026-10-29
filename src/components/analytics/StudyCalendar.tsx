import * as React from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/ui/button'
import {
  buildStudyCalendarDays,
  getCalendarMonthKey,
  getDateFromCalendarKey,
  getLocalDateKeyForCalendar,
} from '@/lib/studyCalendar'

interface StudyCalendarProps {
  month: Date
  selectedDate: string
  activityDates: ReadonlySet<string>
  loading?: boolean
  onSelectDate: (date: string) => void
  onPreviousMonth: () => void
  onNextMonth: () => void
  onToday: () => void
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatMonth(month: Date) {
  return month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function StudyCalendar({
  month,
  selectedDate,
  activityDates,
  loading = false,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: StudyCalendarProps) {
  const days = React.useMemo(() => buildStudyCalendarDays(month), [month])
  const today = getLocalDateKeyForCalendar(new Date())
  const monthKey = getCalendarMonthKey(month)

  return (
    <div aria-label="Study calendar">
      <div className="mx-auto mb-3 flex w-full max-w-[22rem] flex-nowrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="ghost" size="icon" onClick={onPreviousMonth} aria-label="Previous month" title="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[10rem] text-center text-base font-bold text-foreground sm:text-lg">{formatMonth(month)}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onNextMonth} aria-label="Next month" title="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading</span>}
          <Button type="button" variant="outline" size="sm" onClick={onToday}>Today</Button>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[22rem] grid-cols-7 gap-1.5" role="grid" aria-label={formatMonth(month)}>
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} title={weekday} className="pb-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground" role="columnheader">
            {weekday.slice(0, 3)}
          </div>
        ))}

        {days.map((day) => {
          const isSelected = day.date === selectedDate
          const isToday = day.date === today
          const hasActivity = activityDates.has(day.date)
          const dayMonthKey = getCalendarMonthKey(getDateFromCalendarKey(day.date))
          const isAdjacent = dayMonthKey !== monthKey

          return (
            <button
              key={day.date}
              type="button"
              role="gridcell"
              aria-label={`${new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${hasActivity ? ', study activity recorded' : ', no study activity recorded'}`}
              aria-pressed={isSelected}
              onClick={() => onSelectDate(day.date)}
              className={`flex aspect-square min-h-0 flex-col items-center justify-start rounded-lg border p-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                  : isAdjacent
                    ? 'border-border/50 bg-muted/20 text-muted-foreground/50 hover:bg-muted/40'
                    : 'border-border/70 bg-card text-foreground hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30'
              } ${isToday && !isSelected ? 'ring-2 ring-indigo-300 dark:ring-indigo-700' : ''}`}
            >
              <span className={`font-semibold ${isAdjacent && !isSelected ? 'text-muted-foreground/50' : ''}`}>{day.dayOfMonth}</span>
              <span
                className={`mt-1 h-1.5 w-1.5 rounded-full ${
                  hasActivity
                    ? isSelected ? 'bg-white' : 'bg-indigo-500 dark:bg-indigo-400'
                    : 'bg-transparent'
                }`}
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

