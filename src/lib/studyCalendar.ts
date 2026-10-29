export interface StudyCalendarDay {
  date: string
  dayOfMonth: number
  isCurrentMonth: boolean
}

export function getCalendarMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function getLocalDateKeyForCalendar(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getDateFromCalendarKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0)
}

export function shiftCalendarMonth(month: Date, offset: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + offset, 1, 12, 0, 0, 0)
}

/** Returns Monday-first calendar cells, including only the adjacent dates needed to complete the final week. */
export function buildStudyCalendarDays(month: Date): StudyCalendarDay[] {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1, 12, 0, 0, 0)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const leadingDays = (firstDay.getDay() + 6) % 7
  const cellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(year, monthIndex, index - leadingDays + 1, 12, 0, 0, 0)
    return {
      date: getLocalDateKeyForCalendar(date),
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === monthIndex,
    }
  })
}

