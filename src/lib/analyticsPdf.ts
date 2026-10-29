import type { QuizSession, StudySession, Task } from '@/types/database'
import type {
  DailyDataPoint,
  QuizScorePoint,
  WarningStatPoint,
  WeeklyDataPoint,
} from '@/hooks/useAnalytics'

export interface AnalyticsPdfInput {
  date: string
  selectedSessions: StudySession[]
  selectedTasks: Task[]
  selectedQuizzes: QuizSession[]
  activityCount: number
  activityTypes: string[]
  streakDaysThroughDate: number
  sessions: StudySession[]
  dailyData: DailyDataPoint[]
  weeklyData: WeeklyDataPoint[]
  quizScores: QuizScorePoint[]
  warningStats: WarningStatPoint[]
  bestDayThisWeek: { label: string; minutes: number }
}
const W = 595
const H = 842
const M = 36
const CONTENT_W = W - M * 2
const C = {
  ink: '0.12 0.11 0.22',
  muted: '0.38 0.36 0.48',
  indigo: '0.39 0.38 0.93',
  lavender: '0.94 0.93 1.00',
  blue: '0.26 0.55 0.92',
  green: '0.06 0.63 0.45',
  amber: '0.96 0.62 0.08',
  slate: '0.58 0.64 0.72',
  border: '0.86 0.85 0.91',
  grid: '0.91 0.91 0.95',
  white: '1 1 1',
}

function esc(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, '?').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function formatSecondsHhMm(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0h 0m'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

function formatMinutes(totalSeconds: number): string {
  return `${Math.round(totalSeconds / 60)} min`
}

function dateLabel(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, options)
}

function dateTimeLabel(timestamp: string): string {
  const date = new Date(timestamp)
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
}

function wrap(value: string, max = 88): string[] {
  const lines: string[] = []
  let current = ''
  value.split(/\s+/).forEach((word) => {
    if ((current + ' ' + word).trim().length > max && current) {
      lines.push(current)
      current = word
    } else {
      current = `${current} ${word}`.trim()
    }
  })
  if (current) lines.push(current)
  return lines
}

/** Generates a multi-page A4 PDF with vector cards, charts, labels, and tables. */
export function buildAnalyticsPdf(input: AnalyticsPdfInput): Blob {
  const pages: string[] = []
  let commands: string[] = []
  let cursor = M

  const addPage = () => {
    if (commands.length) pages.push(commands.join('\n'))
    commands = []
    cursor = M
  }
  const cmd = (value: string) => commands.push(value)
  const rect = (x: number, top: number, width: number, height: number, color: string, stroke = false) => {
    const operation = stroke ? `${color} RG 0.7 w` : `${color} rg`
    cmd(`q ${operation} ${x} ${H - top - height} ${width} ${height} re ${stroke ? 'S' : 'f'} Q`)
  }
  const line = (x1: number, top1: number, x2: number, top2: number, color: string, width = 0.6) => {
    cmd(`q ${color} RG ${width} w ${x1} ${H - top1} m ${x2} ${H - top2} l S Q`)
  }
  const circle = (x: number, top: number, radius: number, color: string) => {
    const k = 0.5522848 * radius
    const y = H - top
    cmd(`q ${color} rg ${x + radius} ${y} m ${x + radius} ${y + k} ${x + k} ${y + radius} ${x} ${y + radius} c ${x - k} ${y + radius} ${x - radius} ${y + k} ${x - radius} ${y} c ${x - radius} ${y - k} ${x - k} ${y - radius} ${x} ${y - radius} c ${x + k} ${y - radius} ${x + radius} ${y - k} ${x + radius} ${y} c f Q`)
  }
  const text = (value: string, x: number, top: number, size = 10, color = C.ink, bold = false) => {
    cmd(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} scn ${x} ${H - top - size} Td (${esc(value)}) Tj ET`)
  }
  const sectionHeading = (title: string, description: string, top: number) => {
    text(title, M, top, 15, C.indigo, true)
    text(description, M, top + 22, 8.5, C.muted)
  }

  const drawCard = (x: number, top: number, width: number, title: string, value: string, caption: string, color: string) => {
    rect(x, top, width, 72, C.white)
    rect(x, top, width, 72, C.border, true)
    rect(x, top, 4, 72, color)
    text(title.toUpperCase(), x + 14, top + 12, 7.5, C.muted, true)
    text(value, x + 14, top + 29, 16, C.ink, true)
    text(caption, x + 14, top + 53, 8, C.muted)
  }

  const drawEmptyChart = (title: string, description: string, message: string, top: number, height: number) => {
    rect(M, top, CONTENT_W, height, C.white)
    rect(M, top, CONTENT_W, height, C.border, true)
    text(title, M + 14, top + 14, 12, C.ink, true)
    text(description, M + 14, top + 31, 8, C.muted)
    text(message, M + 14, top + Math.round(height / 2), 9, C.muted)
  }

  const drawBarChart = (
    title: string,
    description: string,
    data: Array<{ label: string; actual: number; planned?: number }>,
    top: number,
    planned: boolean,
    axisLabel = 'Minutes',
    showValues = false,
  ) => {
    const height = 236
    rect(M, top, CONTENT_W, height, C.white)
    rect(M, top, CONTENT_W, height, C.border, true)
    text(title, M + 14, top + 14, 12, C.ink, true)
    text(description, M + 14, top + 31, 8, C.muted)

    const plotLeft = M + 45
    const plotTop = top + 57
    const plotWidth = CONTENT_W - 60
    const plotHeight = height - 92
    const maxValue = Math.max(1, ...data.map((point) => planned ? Math.max(point.actual, point.planned || 0) : point.actual))

    for (let step = 0; step <= 4; step += 1) {
      const value = Math.round(maxValue * step / 4)
      const y = plotTop + plotHeight - plotHeight * step / 4
      line(plotLeft, y, plotLeft + plotWidth, y, C.grid)
      text(String(value), plotLeft - 29, y - 4, 7, C.muted)
    }
    line(plotLeft, plotTop, plotLeft, plotTop + plotHeight, C.slate)
    line(plotLeft, plotTop + plotHeight, plotLeft + plotWidth, plotTop + plotHeight, C.slate)
    text(axisLabel, M + 12, plotTop + 6, 7, C.muted)

    const groupWidth = plotWidth / Math.max(data.length, 1)
    const barWidth = planned ? Math.max(3, groupWidth * 0.27) : Math.max(4, groupWidth * 0.5)
    data.forEach((point, index) => {
      const center = plotLeft + groupWidth * index + groupWidth / 2
      const entries = planned
        ? [{ value: point.planned || 0, color: C.slate }, { value: point.actual, color: C.green }]
        : [{ value: point.actual, color: C.indigo }]
      entries.forEach((entry, entryIndex) => {
        const barHeight = plotHeight * entry.value / maxValue
        const barX = planned ? center - barWidth + entryIndex * barWidth : center - barWidth / 2
        if (entry.value > 0) rect(barX, plotTop + plotHeight - barHeight, barWidth - 1, barHeight, entry.color)
        if (showValues && !planned && entryIndex === 0) {
          text(String(entry.value), center - 4, Math.max(plotTop + 44, plotTop + plotHeight - barHeight - 11), 6.5, C.muted)
        }
      })
      text(point.label, center - 12, plotTop + plotHeight + 7, data.length > 10 ? 6 : 7, C.muted)
    })

    if (planned) {
      const legendX = M + CONTENT_W - 158
      rect(legendX, top + 14, 8, 8, C.slate)
      text('Planned target', legendX + 12, top + 13, 7.5, C.muted)
      rect(legendX + 83, top + 14, 8, 8, C.green)
      text('Actual focus', legendX + 95, top + 13, 7.5, C.muted)
    }
  }

  const drawLineChart = (
    title: string,
    description: string,
    data: Array<{ label: string; value: number }>,
    top: number,
    color: string,
    axisLabel: string,
    maxOverride?: number,
  ) => {
    const height = 246
    if (data.length === 0) {
      drawEmptyChart(title, description, 'No recorded data is available for this chart.', top, height)
      return
    }
    rect(M, top, CONTENT_W, height, C.white)
    rect(M, top, CONTENT_W, height, C.border, true)
    text(title, M + 14, top + 14, 12, C.ink, true)
    text(description, M + 14, top + 31, 8, C.muted)

    const plotLeft = M + 45
    const plotTop = top + 57
    const plotWidth = CONTENT_W - 60
    const plotHeight = height - 92
    const maxValue = Math.max(maxOverride || 0, 1, ...data.map((point) => point.value))
    for (let step = 0; step <= 4; step += 1) {
      const value = Math.round(maxValue * step / 4)
      const y = plotTop + plotHeight - plotHeight * step / 4
      line(plotLeft, y, plotLeft + plotWidth, y, C.grid)
      text(String(value), plotLeft - 29, y - 4, 7, C.muted)
    }
    line(plotLeft, plotTop, plotLeft, plotTop + plotHeight, C.slate)
    line(plotLeft, plotTop + plotHeight, plotLeft + plotWidth, plotTop + plotHeight, C.slate)
    text(axisLabel, M + 12, plotTop + 6, 7, C.muted)

    const stepWidth = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth
    const points = data.map((point, index) => ({
      x: data.length > 1 ? plotLeft + stepWidth * index : plotLeft + plotWidth / 2,
      y: plotTop + plotHeight - plotHeight * point.value / maxValue,
    }))
    points.forEach((point, index) => {
      if (index > 0) line(points[index - 1].x, points[index - 1].y, point.x, point.y, color, 2.2)
      circle(point.x, point.y, 3.2, color)
      const label = data[index].label
      const labelX = data.length > 8 ? point.x - 13 : point.x - 18
      text(label, labelX, plotTop + plotHeight + 7, data.length > 8 ? 6.5 : 7, C.muted)
    })
  }

  const totalSeconds = input.sessions.reduce((sum, session) => sum + (session.actual_duration_s || 0), 0)
  const averageSeconds = input.sessions.length ? Math.round(totalSeconds / input.sessions.length) : 0
  const dailyData = input.dailyData.map((point) => ({ label: point.dateLabel, actual: point.minutes }))
  const plannedData = input.dailyData.slice(-7).map((point) => ({ label: point.dateLabel, actual: point.minutes, planned: point.plannedMinutes }))
  const plannedAvailable = plannedData.some((point) => (point.planned || 0) > 0)
  const weeklyData = input.weeklyData.map((point) => ({ label: point.week, value: point.hours }))
  const quizData = input.quizScores.map((point) => ({ label: point.date, value: point.percentage }))
  const warningData = input.warningStats.map((point) => ({ label: point.date, actual: point.warnings }))
  const selectedDate = dateLabel(input.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const generated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  const selectedSeconds = input.selectedSessions.reduce((sum, session) => sum + (session.actual_duration_s || 0), 0)
  const selectedActivity = input.activityCount > 0
    ? `Yes${input.activityTypes.length ? ` (${input.activityTypes.join(', ')})` : ''}`
    : 'No'

  // Page 1: dashboard summary cards, selected-date context, and daily charts.
  rect(0, 0, W, 10, C.indigo)
  text('SyncStudy Analytics Report', M, cursor, 22, C.indigo, true)
  text(`Selected date: ${selectedDate}`, M, cursor + 31, 10.5, C.muted)
  text(`Generated ${generated}`, W - M - 105, cursor + 33, 8, C.muted)
  cursor += 70

  const cardWidth = (CONTENT_W - 18) / 4
  drawCard(M, cursor, cardWidth, 'Total Time (All Time)', formatSecondsHhMm(totalSeconds), 'Recorded deep work', C.indigo)
  drawCard(M + cardWidth + 6, cursor, cardWidth, 'Sessions Completed', String(input.sessions.length), 'Focus intervals finished', C.green)
  drawCard(M + (cardWidth + 6) * 2, cursor, cardWidth, 'Avg. Session Length', formatMinutes(averageSeconds), 'Per study session', C.blue)
  drawCard(M + (cardWidth + 6) * 3, cursor, cardWidth, 'Best Day This Week', input.bestDayThisWeek.label, `${input.bestDayThisWeek.minutes} minutes logged`, C.amber)
  cursor += 88

  rect(M, cursor, CONTENT_W, 78, C.lavender)
  text('Selected-date summary', M + 14, cursor + 10, 10, C.indigo, true)
  text(`${selectedDate} | Recorded activity: ${selectedActivity} | Streak through date: ${input.streakDaysThroughDate} day${input.streakDaysThroughDate === 1 ? '' : 's'}`, M + 14, cursor + 27, 8.5, C.muted)
  text(`Study sessions: ${input.selectedSessions.length} | Recorded study time: ${formatSecondsHhMm(selectedSeconds)} | Tasks due: ${input.selectedTasks.length} | Quiz attempts: ${input.selectedQuizzes.length}`, M + 14, cursor + 44, 8.5, C.muted)
  text('All-time cards and rolling-window charts below use the same dashboard data calculations.', M + 14, cursor + 61, 7.5, C.muted)
  cursor += 94

  drawBarChart('Daily Focus Time', 'Study minutes logged per day - last 14 days', dailyData, cursor, false)
  cursor += 254
  if (plannedAvailable) {
    drawBarChart('Planned vs. Actual Study', 'Goal adherence - last 7 days', plannedData, cursor, true)
  } else {
    drawEmptyChart('Planned vs. Actual Study', 'Goal adherence - last 7 days', 'Unavailable: no planned-study targets were recorded in this reporting window.', cursor, 236)
  }
  addPage()

  // Page 2: weekly and quiz trend charts.
  sectionHeading('Analytics Trends', 'Rolling windows match the Analytics dashboard.', cursor)
  drawLineChart('Weekly Study Hours Trend', 'Aggregate study volume across the last 8 weeks', weeklyData, cursor + 32, C.indigo, 'Hours')
  drawLineChart('Quiz Score Performance', 'Percentage scores on generated practice quizzes', quizData, cursor + 294, C.amber, 'Percent', 100)
  addPage()

  // Page 3+: distraction chart and the complete session record table.
  sectionHeading('Focus Monitoring & Sessions', 'Warnings and all saved focus sessions for the authenticated user.', cursor)
  drawBarChart('Distraction Frequency & Posture Shifts', 'Warnings logged by computer vision monitor - last 14 days', warningData, cursor + 32, false, 'Warnings', true)
  cursor += 286

  const drawTableHeader = (top: number) => {
    const headerHeight = 25
    rect(M, top, CONTENT_W, headerHeight, C.lavender)
    rect(M, top, CONTENT_W, headerHeight, C.border, true)
    const headers = [
      ['Subject', M + 8],
      ['Date & Time', M + 116],
      ['Duration', M + 218],
      ['Target', M + 276],
      ['Warnings', M + 332],
      ['Notes', M + 392],
    ] as const
    headers.forEach(([label, x]) => text(label, x, top + 8, 7.5, C.indigo, true))
    return top + headerHeight
  }

  text('Focus Sessions Record', M, cursor, 13, C.ink, true)
  text('Complete saved-session history; newest records first.', M, cursor + 18, 8, C.muted)
  cursor += 36
  cursor = drawTableHeader(cursor)

  if (input.sessions.length === 0) {
    rect(M, cursor, CONTENT_W, 48, C.white)
    rect(M, cursor, CONTENT_W, 48, C.border, true)
    text('No focus sessions recorded yet.', M + 10, cursor + 18, 9, C.muted)
    cursor += 60
  } else {
    input.sessions.forEach((session) => {
      const noteLines = session.notes ? wrap(session.notes, 25) : ['—']
      const rowHeight = Math.max(25, noteLines.length * 9 + 12)
      if (cursor + rowHeight > H - M) {
        addPage()
        sectionHeading('Focus Sessions Record', 'Continued - newest records first.', cursor)
        cursor += 35
        cursor = drawTableHeader(cursor)
      }
      rect(M, cursor, CONTENT_W, rowHeight, C.white)
      rect(M, cursor, CONTENT_W, rowHeight, C.border, true)
      text(session.subject?.name || 'General Study', M + 8, cursor + 8, 7.5, C.ink, true)
      text(dateTimeLabel(session.started_at), M + 116, cursor + 8, 7, C.muted)
      text(formatSecondsHhMm(session.actual_duration_s || 0), M + 218, cursor + 8, 7.5, C.ink)
      text(formatSecondsHhMm(session.planned_duration_s || 0), M + 276, cursor + 8, 7.5, C.muted)
      text(String(session.warning_count || 0), M + 345, cursor + 8, 7.5, session.warning_count ? C.amber : C.green)
      noteLines.forEach((lineText, index) => text(lineText, M + 392, cursor + 8 + index * 9, 7, C.muted))
      cursor += rowHeight
    })
  }
  addPage()

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${5 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ]
  pages.forEach((page, index) => {
    const stream = `${page}\nq ${C.lavender} rg 0 0 ${W} 10 re f Q`
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + index * 2} 0 R >>`)
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}
