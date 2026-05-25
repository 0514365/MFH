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

export const PROJECT_STATUSES = [
  { value: 'active', label: '진행' },
  { value: 'onhold', label: '보류' },
  { value: 'done', label: '완료' },
] as const

export const IMPORTANCE_MAX = 3

export const priorityLabel = (v: string): string =>
  PRIORITIES.find((p) => p.value === v)?.label ?? v
export const statusLabel = (v: string): string =>
  PROJECT_STATUSES.find((s) => s.value === v)?.label ?? v
