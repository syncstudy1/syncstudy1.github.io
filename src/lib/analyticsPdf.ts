import type { QuizSession, StudySession, Task } from '@/types/database'

export interface AnalyticsPdfInput {
  date: string
  sessions: StudySession[]
  tasks: Task[]
  quizzes: QuizSession[]
  activityCount: number
  activityTypes: string[]
  streakDaysThroughDate: number
}

function pdfEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function wrap(text: string, max = 92): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > max && current) {
      lines.push(current)
      current = word
    } else current = `${current} ${word}`.trim()
  }
  if (current) lines.push(current)
  return lines
}

/** Builds a small dependency-free, A4-friendly PDF using standard PDF fonts. */
export function buildAnalyticsPdf(input: AnalyticsPdfInput): Blob {
  const dateLabel = new Date(`${input.date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const totalSeconds = input.sessions.reduce((sum, session) => sum + (session.actual_duration_s || 0), 0)
  const completedTasks = input.tasks.filter((task) => task.status === 'done').length
  const lines: Array<{ text: string; size: number; color: string; gap?: number }> = []
  const add = (text: string, size = 10, color = '0.16 0.14 0.30', gap = 15) => lines.push({ text, size, color, gap })

  add('SyncStudy Analytics Report', 20, '0.20 0.16 0.55', 27)
  add(dateLabel, 11, '0.32 0.29 0.48', 22)
  add(`Total study time: ${formatDuration(totalSeconds)}    Completed sessions: ${input.sessions.length}`, 11, '0.16 0.14 0.30', 24)
  add('DAILY OVERVIEW', 12, '0.29 0.25 0.72', 19)
  add(`Recorded activity: ${input.activityCount > 0 ? 'Yes' : 'No'}${input.activityTypes.length ? ` (${input.activityTypes.join(', ')})` : ''}`, 10)
  add(`Consistency streak through this date: ${input.streakDaysThroughDate} day${input.streakDaysThroughDate === 1 ? '' : 's'}`, 10)
  add(`Tasks recorded for this date: ${input.tasks.length}; completed: ${completedTasks}`, 10, '0.16 0.14 0.30', 21)

  if (input.sessions.length === 0 && input.tasks.length === 0 && input.quizzes.length === 0 && input.activityCount === 0) {
    add('No analytics data exists for the selected date.', 11, '0.40 0.35 0.55', 20)
  } else {
    add('STUDY SESSIONS', 12, '0.29 0.25 0.72', 19)
    input.sessions.forEach((session, index) => {
      const subject = session.subject?.name || 'General Study'
      const warnings = session.warning_count || 0
      add(`${index + 1}. ${subject} | ${formatDuration(session.actual_duration_s || 0)} | ${warnings} focus warning${warnings === 1 ? '' : 's'}`, 10, '0.16 0.14 0.30', 15)
      if (session.notes) wrap(`Notes: ${session.notes}`, 88).forEach((line) => add(line, 9, '0.32 0.29 0.48', 12))
    })
    const subjectTotals = new Map<string, number>()
    input.sessions.forEach((session) => {
      const subject = session.subject?.name || 'General Study'
      subjectTotals.set(subject, (subjectTotals.get(subject) || 0) + (session.actual_duration_s || 0))
    })
    add('SUBJECT ACTIVITY', 12, '0.29 0.25 0.72', 19)
    subjectTotals.forEach((seconds, subject) => add(`${subject} | ${formatDuration(seconds)}`, 10, '0.16 0.14 0.30', 15))
    if (input.tasks.length) {
      add('TASK PROGRESS', 12, '0.29 0.25 0.72', 19)
      input.tasks.forEach((task) => add(`${task.status === 'done' ? '[x]' : '[ ]'} ${task.title} | ${task.status.replace('_', ' ')}`, 10, '0.16 0.14 0.30', 15))
    }
    if (input.quizzes.length) {
      add('QUIZ ACTIVITY', 12, '0.29 0.25 0.72', 19)
      input.quizzes.forEach((quiz) => add(`${quiz.subject} | ${quiz.topic} | ${quiz.score}/${quiz.total} | ${quiz.difficulty}`, 10, '0.16 0.14 0.30', 15))
    }
  }
  add('Focus-monitoring statistics are represented by the recorded warning counts above.', 9, '0.40 0.35 0.55', 20)

  const pageHeight = 842
  const margin = 54
  const content: string[] = []
  let y = pageHeight - margin
  const pages: string[] = []
  const flush = () => { pages.push(content.join('\n')); content.length = 0; y = pageHeight - margin }
  for (const line of lines) {
    if (y < margin + 30) flush()
    content.push(`BT /F1 ${line.size} Tf ${line.color} scn ${margin} ${y} Td (${pdfEscape(line.text)}) Tj ET`)
    y -= line.gap || 15
  }
  flush()

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ]
  pages.forEach((page, index) => {
    const stream = `q 0.94 0.93 1 rg 0 0 595 12 re f Q\n${page}`
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + index * 2} 0 R >>`)
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}
