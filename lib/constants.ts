export const JOURNAL_CATEGORIES = [
  '교회사역',
  '방과후학교',
  '선교사가정',
  '훈련·행정',
  '긴급구호',
  '일상',
  '묵상',
] as const

export type JournalCategory = (typeof JOURNAL_CATEGORIES)[number]

export const PRIORITIES = [
  { value: 'high', label: '높음' },
  { value: 'med', label: '보통' },
  { value: 'low', label: '낮음' },
] as const

export const IMPORTANCE_MAX = 3

export const priorityLabel = (v: string): string =>
  PRIORITIES.find((p) => p.value === v)?.label ?? v

// ── Status 체계 (2026 개편: upcoming / in_progress / done) ──────────
// projects·tasks 공통. NOTION 식 색 배지(soft 채움) — palette.ts 의 status* 토큰과 짝.
export type StatusValue = 'upcoming' | 'in_progress' | 'done'

export const STATUSES: { value: StatusValue; label: string; colorKey: 'statusUpcoming' | 'statusProgress' | 'statusDone' }[] = [
  { value: 'upcoming', label: 'Upcoming', colorKey: 'statusUpcoming' },
  { value: 'in_progress', label: 'In Progress', colorKey: 'statusProgress' },
  { value: 'done', label: 'Done', colorKey: 'statusDone' },
]

// 할 일 신규 생성 기본값
export const TASK_DEFAULT_STATUS: StatusValue = 'upcoming'

// 임의 문자열 → 새 체계로 정규화(구 값 호환: active/onhold/done, not_started 등)
export function normalizeStatus(v: string | null | undefined): StatusValue {
  switch (v) {
    case 'in_progress':
    case 'active':
      return 'in_progress'
    case 'done':
      return 'done'
    case 'upcoming':
    case 'onhold':
    case 'not_started':
    default:
      return 'upcoming'
  }
}

export const STATUS_META: Record<StatusValue, { label: string; colorKey: string }> = {
  upcoming: { label: 'Upcoming', colorKey: 'statusUpcoming' },
  in_progress: { label: 'In Progress', colorKey: 'statusProgress' },
  done: { label: 'Done', colorKey: 'statusDone' },
}

export const statusV2Label = (v: string): string => STATUS_META[normalizeStatus(v)].label
