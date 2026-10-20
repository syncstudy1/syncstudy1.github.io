export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDateKeyDaysAgo(daysAgo: number, referenceDate: Date = new Date()): string {
  const date = new Date(referenceDate)
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  return getLocalDateKey(date)
}

export function calculateStreakStats(activityDates: Iterable<string>, referenceDate: Date = new Date()) {
  const dates = new Set(activityDates)
  const today = getLocalDateKey(referenceDate)
  const yesterday = getDateKeyDaysAgo(1, referenceDate)

  let currentStreak = 0
  let cursor = dates.has(today) ? today : yesterday

  while (dates.has(cursor)) {
    currentStreak += 1
    const cursorDate = new Date(`${cursor}T12:00:00`)
    cursorDate.setDate(cursorDate.getDate() - 1)
    cursor = getLocalDateKey(cursorDate)
  }

  const sortedDates = [...dates].sort()
  let longestStreak = 0
  let run = 0
  let previousDate: Date | null = null

  for (const dateKey of sortedDates) {
    const date = new Date(`${dateKey}T12:00:00`)
    if (previousDate) {
      const difference = Math.round((date.getTime() - previousDate.getTime()) / 86400000)
      run = difference === 1 ? run + 1 : 1
    } else {
      run = 1
    }
    longestStreak = Math.max(longestStreak, run)
    previousDate = date
  }

  return {
    recordDays: dates.size,
    currentStreak,
    longestStreak,
  }
}
