/**
 * AUTHORITATIVE subject list for SyncStudy.
 *
 * This is the single source of truth for the 50 standard subjects shown
 * in the Quiz and Planner pages.  Every entry is unique — do not add
 * duplicates here or in any consuming component.
 *
 * If a user's custom Supabase subject shares a name with one of these
 * entries it should NOT be shown as an additional duplicate option.
 */
export const STANDARD_SUBJECTS: string[] = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Information Technology',
  'Electronics and Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence and Machine Learning',
  'Data Science',
  'Cybersecurity',
  'Computer Networks',
  'Database Management Systems',
  'Operating Systems',
  'Data Structures and Algorithms',
  'Software Engineering',
  'Web Development',
  'Cloud Computing',
  'Discrete Mathematics',
  'Engineering Mathematics',
  'Digital Logic Design',
  'Computer Organization and Architecture',
  'Theory of Computation',
  'Compiler Design',
  'Design and Analysis of Algorithms',
  'Microprocessors and Microcontrollers',
  'Signals and Systems',
  'Control Systems',
  'Communication Systems',
  'Engineering Mechanics',
  'Thermodynamics',
  'Strength of Materials',
  'Fluid Mechanics',
  'Environmental Engineering',
  'Accounting',
  'Economics',
  'Business Studies',
  'Commerce',
  'Statistics',
  'English',
  'History',
  'Geography',
  'Political Science',
  'Sociology',
  'Psychology',
  'General Knowledge',
  'Indian Polity',
  'Biology and Life Sciences',
]
