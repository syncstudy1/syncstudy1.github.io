export interface HeatmapDay {
  date: string
  minutes: number
  count: number
}

export type HeatmapWeek = Array<HeatmapDay | null>

/** Groups an ascending date window into Monday-Sunday week columns. */
export function buildHeatmapWeeks(days: HeatmapDay[]): HeatmapWeek[] {
  if (days.length === 0) return []

  const firstDate = new Date(`${days[0].date}T12:00:00`)
  const leadingDays = (firstDate.getDay() + 6) % 7
  const weeks: HeatmapWeek[] = []

  days.forEach((day, index) => {
    const position = leadingDays + index
    const weekIndex = Math.floor(position / 7)
    if (!weeks[weekIndex]) weeks[weekIndex] = Array<HeatmapDay | null>(7).fill(null)
    weeks[weekIndex][position % 7] = day
  })

  return weeks
}

/** Shows a month at the first week and at weeks containing the first day. */
export function getHeatmapMonthLabel(week: HeatmapWeek, weekIndex: number): string {
  const days = week.filter((day): day is HeatmapDay => day !== null)
  if (days.length === 0) return ''

  const monthBoundary = days.find(
    (day) => new Date(`${day.date}T12:00:00`).getDate() === 1
  )
  if (weekIndex !== 0 && !monthBoundary) return ''

  const date = monthBoundary || days[0]
  return new Date(`${date.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short' })
}
