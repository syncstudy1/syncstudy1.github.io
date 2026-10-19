export type UserTier = 'free' | 'premium'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  tier: UserTier
  premium_expires_at: string | null
  redeem_code_used: string | null
  redeem_used_at: string | null
  created_at: string
}

export interface Subject {
  id: string
  user_id: string
  name: string
  color: string
  created_at?: string
}

export interface StudySession {
  id: string
  user_id: string
  subject_id: string | null
  started_at: string
  ended_at: string | null
  planned_duration_s: number
  actual_duration_s: number
  warning_count: number
  auto_paused: boolean
  notes: string | null
  subject?: Subject
}

export type TaskStatus = 'pending' | 'in_progress' | 'done'

export interface Task {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  description: string | null
  deadline: string
  status: TaskStatus
  estimated_hours: number
  created_at?: string
  subject?: Subject
}

export interface StudyPlanBlock {
  id: string
  day: string // e.g. "Monday", "2026-10-16"
  subject: string
  taskTitle: string
  durationMinutes: number
  timeSlot?: string
  tips?: string
}

export interface StudyPlanJson {
  title: string
  summary: string
  dailyTargetHours: number
  schedule: StudyPlanBlock[]
}

export interface StudyPlan {
  id: string
  user_id: string
  generated_at: string
  approved: boolean
  plan_json: StudyPlanJson
}

export type QuizDifficulty = 'easy' | 'medium' | 'hard'

export interface QuizQuestion {
  id: number
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  revisionTip?: string
}

export interface QuizSession {
  id: string
  user_id: string
  subject: string
  topic: string
  difficulty: QuizDifficulty
  questions_json: QuizQuestion[]
  score: number
  total: number
  taken_at: string
}

export interface RedeemCode {
  code: string
  duration_days: number
  active: boolean
}
