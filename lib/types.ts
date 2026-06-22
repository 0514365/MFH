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
  // 목록·갤러리 표시용 축소 썸네일 경로. 있으면 목록은 이것을, 원본(path)은 클릭(라이트박스) 시 로드.
  // 레거시 사진·썸네일 생성 전에는 없음(없으면 원본으로 폴백).
  thumb_path?: string | null
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

// 첨부파일 1개. tasks.attachments / projects.attachments jsonb 배열의 요소.
// 이미지(image/*) 또는 PDF(application/pdf). 미리보기는 상세 페이지에서 signed URL 로.
export type Attachment = {
  path: string // attachments 버킷 내 경로 {userId}/{ts}-{rand}.{ext}
  name: string // 원본 파일명(표시용)
  mime: string // MIME 타입
  size: number // 바이트
  // 캡션 — 이미지 첨부만(PDF 제외). 사진모음 표시·편지 재료에 사용. JournalPhoto 와 동일 패턴.
  // ai_caption: 비전 루틴 생성 / caption: 사용자 수동 입력(표시·편지에서 우선, AI 재스캔이 덮지 않음).
  ai_caption?: string | null
  caption?: string | null
}

export const MAX_ATTACHMENTS = 10

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
  attachments: Attachment[] | null
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
  attachments: Attachment[] | null
  // 프로젝트 내 수동 순서(patch95). 프로젝트 상세에서 ↑↓ 재배치. 단독 할 일은 null.
  sort_order: number | null
  // 선행/후속 작업(patch96). 같은 프로젝트 할 일 id 배열. 순서와 독립 — 상세에 표시만.
  predecessor_ids: string[] | null
  successor_ids: string[] | null
  created_at: string
}
