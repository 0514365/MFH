export type YearTheme = {
  id: string
  user_id: string
  year: number
  theme: string | null
  goals: string[] | null
  created_at: string
}

export type JournalEntry = {
  id: string
  user_id: string
  entry_date: string
  category: string | null
  headline: string | null
  today: string | null
  thanks: string | null
  meditation: string | null
  prayer: string | null
  prayer_candidate: boolean
  photo_path: string | null
  photo_taken_at: string | null
  photo_lat: number | null
  photo_lng: number | null
  photo_meta: Record<string, unknown> | null
  project_id: string | null
  task_id: string | null
  created_at: string
}

export type Project = {
  id: string
  title: string
}

export type Task = {
  id: string
  title: string
  project_id: string | null
}
