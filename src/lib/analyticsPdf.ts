import type { QuizSession, StudySession, Task } from '@/types/database'
import type { DailyDataPoint } from '@/hooks/useAnalytics'

export interface AnalyticsPdfInput {
  date: string
  sessions: StudySession[]
  tasks: Task[]
  quizzes: QuizSession[]
  activityCount: number
  activityTypes: string[]
  streakDaysThroughDate: number
  dailyData: DailyDataPoint[]
}

const W = 595
const H = 842
const M = 42
const C = { ink: '0.12 0.11 0.22', muted: '0.38 0.36 0.48', indigo: '0.39 0.38 0.93', lavender: '0.94 0.93 1.00', blue: '0.26 0.55 0.92', green: '0.06 0.63 0.45', amber: '0.96 0.62 0.08', slate: '0.58 0.64 0.72', border: '0.86 0.85 0.91', grid: '0.91 0.91 0.95', white: '1 1 1' }

function esc(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, '?').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
function duration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
function dateLabel(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, options)
}
function wrap(text: string, max = 88): string[] {
  const lines: string[] = []
  let current = ''
  text.split(/\s+/).forEach((word) => {
    if ((current + ' ' + word).trim().length > max && current) { lines.push(current); current = word }
    else current = `${current} ${word}`.trim()
  })
  if (current) lines.push(current)
  return lines
}

/** Generates a dependency-free A4 PDF with vector cards, axes, labels, and bars. */
export function buildAnalyticsPdf(input: AnalyticsPdfInput): Blob {
  const pages: string[] = []
  let commands: string[] = []
  let cursor = M
  const addPage = () => { if (commands.length) pages.push(commands.join('\n')); commands = []; cursor = M }
  const cmd = (value: string) => commands.push(value)
  const rect = (x: number, top: number, width: number, height: number, color: string, stroke = false) => {
    const op = stroke ? `${color} RG 0.7 w` : `${color} rg`
    cmd(`q ${op} ${x} ${H - top - height} ${width} ${height} re ${stroke ? 'S' : 'f'} Q`)
  }
  const line = (x1: number, top1: number, x2: number, top2: number, color: string, width = 0.6) => cmd(`q ${color} RG ${width} w ${x1} ${H - top1} m ${x2} ${H - top2} l S Q`)
  const text = (value: string, x: number, top: number, size = 10, color = C.ink, bold = false) => cmd(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} scn ${x} ${H - top - size} Td (${esc(value)}) Tj ET`)
  const section = (title: string) => { text(title, M, cursor, 12, C.indigo, true); cursor += 22 }
  const card = (x: number, top: number, width: number, title: string, value: string, caption: string, color: string) => {
    rect(x, top, width, 72, C.white); rect(x, top, width, 72, C.border, true); rect(x, top, 4, 72, color)
    text(title.toUpperCase(), x + 14, top + 12, 7.5, C.muted, true); text(value, x + 14, top + 29, 17, C.ink, true); text(caption, x + 14, top + 53, 8, C.muted)
  }
  const chart = (title: string, description: string, data: DailyDataPoint[], planned: boolean) => {
    const height = 246
    if (cursor + height > H - M) addPage()
    const top = cursor
    const width = W - M * 2
    rect(M, top, width, height, C.white); rect(M, top, width, height, C.border, true)
    text(title, M + 14, top + 14, 12, C.ink, true); text(description, M + 14, top + 31, 8, C.muted)
    const px = M + 43; const py = top + 57; const pw = width - 58; const ph = height - 91
    const max = Math.max(1, ...data.map((point) => planned ? Math.max(point.minutes, point.plannedMinutes) : point.minutes))
    for (let step = 0; step <= 4; step += 1) {
      const value = Math.round(max * step / 4); const y = py + ph - ph * step / 4
      line(px, y, px + pw, y, C.grid); text(String(value), px - 28, y - 4, 7, C.muted)
    }
    line(px, py, px, py + ph, C.slate); line(px, py + ph, px + pw, py + ph, C.slate)
    const group = pw / Math.max(data.length, 1); const bar = planned ? Math.max(3, group * 0.27) : Math.max(4, group * 0.5)
    data.forEach((point, index) => {
      const center = px + group * index + group / 2
      const values = planned ? [{ value: point.plannedMinutes, color: C.slate }, { value: point.minutes, color: C.green }] : [{ value: point.minutes, color: C.indigo }]
      values.forEach((entry, barIndex) => { const bh = ph * entry.value / max; const bx = planned ? center - bar + barIndex * bar : center - bar / 2; if (entry.value > 0) rect(bx, py + ph - bh, bar - 1, bh, entry.color) })
      text(point.date.slice(5).replace('-', '/'), center - 10, py + ph + 7, data.length > 10 ? 6.5 : 7.5, C.muted)
    })
    text('Minutes', M + 12, py + 7, 7, C.muted)
    if (planned) {
      rect(W - M - 155, top + 14, 8, 8, C.slate); text('Planned target', W - M - 143, top + 13, 7.5, C.muted)
      rect(W - M - 74, top + 14, 8, 8, C.green); text('Actual focus', W - M - 62, top + 13, 7.5, C.muted)
    }
    cursor = top + height + 18
  }

  const selectedDate = dateLabel(input.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const generated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  const total = input.sessions.reduce((sum, session) => sum + (session.actual_duration_s || 0), 0)
  const average = input.sessions.length ? Math.round(total / input.sessions.length) : 0
  const completedTasks = input.tasks.filter((task) => task.status === 'done').length
  const bestDay = input.dailyData.slice(-7).reduce<{ label: string; minutes: number }>((best, day) => day.minutes > best.minutes ? { label: dateLabel(day.date, { weekday: 'long' }), minutes: day.minutes } : best, { label: 'None', minutes: 0 })
  const plannedData = input.dailyData.slice(-7)
  const plannedAvailable = plannedData.some((day) => day.plannedMinutes > 0)

  rect(0, 0, W, 10, C.indigo); text('SyncStudy Analytics Report', M, cursor, 22, C.indigo, true)
  text(`Selected date: ${selectedDate}`, M, cursor + 31, 11, C.muted); text(`Generated ${generated}`, W - M - 105, cursor + 33, 8, C.muted); cursor += 70
  rect(M, cursor, W - M * 2, 34, C.lavender); text('Selected-date report', M + 14, cursor + 9, 9, C.indigo, true); text('Summary cards describe only the selected date. Charts use the Analytics rolling windows.', M + 14, cursor + 21, 7.5, C.muted); cursor += 48
  const cardWidth = (W - M * 2 - 18) / 4
  card(M, cursor, cardWidth, 'Study time', duration(total), 'Selected date', C.indigo); card(M + cardWidth + 6, cursor, cardWidth, 'Sessions', String(input.sessions.length), 'Completed on date', C.green); card(M + (cardWidth + 6) * 2, cursor, cardWidth, 'Average session', `${Math.round(average / 60)} min`, 'Selected date', C.blue); card(M + (cardWidth + 6) * 3, cursor, cardWidth, 'Streak', `${input.streakDaysThroughDate} day${input.streakDaysThroughDate === 1 ? '' : 's'}`, 'Through selected date', C.amber); cursor += 92
  chart('Daily Focus Time', 'Study minutes logged per day - last 14 days', input.dailyData, false)
  if (plannedAvailable) chart('Planned vs. Actual Study', 'Goal adherence - last 7 days', plannedData, true)
  else { if (cursor + 112 > H - M) addPage(); rect(M, cursor, W - M * 2, 96, C.white); rect(M, cursor, W - M * 2, 96, C.border, true); text('Planned vs. Actual Study', M + 14, cursor + 14, 12, C.ink, true); text('Goal adherence - last 7 days', M + 14, cursor + 31, 8, C.muted); text('Unavailable: no planned-study targets were recorded in this reporting window.', M + 14, cursor + 61, 9, C.amber); cursor += 114 }

  addPage(); text('Analytics detail', M, cursor, 18, C.indigo, true); text(`Rolling-window context: best day this week was ${bestDay.label} (${bestDay.minutes} minutes).`, M, cursor + 27, 9, C.muted); cursor += 54
  section('DAILY OVERVIEW'); text(`Recorded activity: ${input.activityCount > 0 ? 'Yes' : 'No'}${input.activityTypes.length ? ` (${input.activityTypes.join(', ')})` : ''}`, M, cursor, 10); cursor += 16; text(`Tasks for selected date: ${input.tasks.length}; completed: ${completedTasks}`, M, cursor, 10); cursor += 16; text(`Consistency streak through selected date: ${input.streakDaysThroughDate} day${input.streakDaysThroughDate === 1 ? '' : 's'}`, M, cursor, 10); cursor += 28
  if (input.sessions.length) { section('STUDY SESSIONS'); input.sessions.forEach((session, index) => { if (cursor > H - 90) addPage(); const subject = session.subject?.name || 'General Study'; const warnings = session.warning_count || 0; text(`${index + 1}. ${subject}`, M, cursor, 9.5, C.ink, true); text(`${duration(session.actual_duration_s || 0)} actual / ${duration(session.planned_duration_s || 0)} planned`, M + 180, cursor, 8.5, C.muted); text(`${warnings} warning${warnings === 1 ? '' : 's'}`, W - M - 70, cursor, 8.5, warnings ? C.amber : C.green); cursor += 15; if (session.notes) wrap(`Notes: ${session.notes}`, 92).forEach((note) => { text(note, M + 12, cursor, 8, C.muted); cursor += 12 }); line(M, cursor + 2, W - M, cursor + 2, C.grid); cursor += 11 }) }
  else { text('No study sessions were recorded for the selected date.', M, cursor, 10, C.muted); cursor += 28 }
  if (input.tasks.length) { if (cursor > H - 150) addPage(); section('TASK PROGRESS'); input.tasks.forEach((task) => { text(`${task.status === 'done' ? '[x]' : '[ ]'} ${task.title} - ${task.status.replace('_', ' ')}`, M, cursor, 9); cursor += 15 }); cursor += 12 }
  if (input.quizzes.length) { if (cursor > H - 140) addPage(); section('QUIZ ACTIVITY'); input.quizzes.forEach((quiz) => { text(`${quiz.subject} | ${quiz.topic} | ${quiz.score}/${quiz.total} | ${quiz.difficulty}`, M, cursor, 9); cursor += 15 }) }
  if (!input.sessions.length && !input.tasks.length && !input.quizzes.length && input.activityCount === 0) text('No analytics data exists for the selected date.', M, cursor, 11, C.muted)
  text('Focus-monitoring statistics are represented by the warning counts above.', M, H - 30, 8, C.muted); addPage()

  const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${pages.map((_, index) => `${5 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>']
  pages.forEach((page, index) => { const stream = `${page}\nq ${C.lavender} rg 0 0 ${W} 10 re f Q`; objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + index * 2} 0 R >>`); objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`) })
  let pdf = '%PDF-1.4\n'; const offsets: number[] = [0]; objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n` }); const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`; offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` }); pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}
