export type YearTheme = {
  id: string
  user_id: string
  year: number
  theme: string | null
  goals: string[] | null
  verse_ref?: string | null
  theme_en?: string | null
  quote?: string | null
  created_at: string
}

// 일지 사진 1장. journal_entries.photos jsonb 배열의 요소.
// place_name 이 비면 일지 레벨 대표 place_name 을 상속(공통 기본).
export type JournalPhoto = {
  path: string
  place_name?: string | null
  taken_at?: string | null
  lat?: number | null
  lng?: number | null
  meta?: Record<string, unknown> | null
  // AI 캡션(Phase 3 Local 루틴이 비전 분석으로 생성). 사진 보기 표시·편지 이미지 제안에 사용.
  ai_caption?: string | null
  // 수동 캡션(사용자 직접 입력). 표시·편지에서 ai_caption 보다 우선. AI 재스캔이 이 값을 덮지 않는다.
  caption?: string | null
}

export const MAX_JOURNAL_PHOTOS = 5

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
  // 다중 사진(최대 5장). 저장은 이 컬럼을 사용.
  photos: JournalPhoto[] | null
  // 단일 사진 레거시 컬럼 — 읽기 fallback 용으로 보존(patch82 로 photos 로 이전됨).
  photo_path: string | null
  photo_taken_at: string | null
  photo_lat: number | null
  photo_lng: number | null
  photo_meta: Record<string, unknown> | null
  place_name: string | null
  project_id: string | null
  task_id: string | null
  intercession_id: string | null
  created_at: string
}

export type Project = {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string | null
  status: string
  priority: string
  importance: number
  start_date: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export type Task = {
  id: string
  user_id: string
  project_id: string | null
  title: string
  description: string | null
  done: boolean
  priority: string
  importance: number
  due_date: string | null
  due_time: string | null
  completed_at: string | null
  category: string | null
  place_name: string | null
  status: string
  // 반복 시리즈(patch85). 단건은 null. 같은 시리즈의 모든 발생 행이 같은 recurrence_id.
  recurrence_id: string | null
  recurrence_freq: string | null
  created_at: string
}
