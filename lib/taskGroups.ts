// MFH-TASK-GROUPS-V2
// 할 일 기한 그룹: 연체 / 이번 주 / 다음 주 / 이번 달 / 나머지 / 미지정.
// 주 시작 = 일요일 기준. 이번 달 = 이번주·다음주 이후의 같은 달 잔여(다음다음주 일요일 ~ 월말).
// 로컬 날짜 문자열(YYYY-MM-DD) 비교.

export type TaskGroupKey =
  | 'overdue'
  | 'this_week'
  | 'next_week'
  | 'this_month'
  | 'later'
  | 'unset'

export const TASK_GROUP_LABEL: Record<TaskGroupKey, string> = {
  overdue: '연체',
  this_week: '이번 주',
  next_week: '다음 주',
  this_month: '이번 달',
  later: '나머지',
  unset: '미지정',
}

export const TASK_GROUP_ORDER: TaskGroupKey[] = [
  'overdue',
  'this_week',
  'next_week',
  'this_month',
  'later',
  'unset',
]

function fmtLocal(d: Date): string {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

function localTodayStr(): string {
  return fmtLocal(new Date())
}

// 일요일 시작 주의 경계(YYYY-MM-DD). 이번주 [sun, nextSun), 다음주 [nextSun, afterNextSun).
function weekBounds(baseStr: string): { sun: string; nextSun: string; afterNextSun: string } {
  const base = new Date(baseStr + 'T00:00:00')
  const dow = base.getDay() // 일=0 … 토=6
  const sun = new Date(base)
  sun.setDate(base.getDate() - dow)
  const nextSun = new Date(sun)
  nextSun.setDate(sun.getDate() + 7)
  const afterNextSun = new Date(sun)
  afterNextSun.setDate(sun.getDate() + 14)
  return { sun: fmtLocal(sun), nextSun: fmtLocal(nextSun), afterNextSun: fmtLocal(afterNextSun) }
}

// 이번 달 마지막 날 다음 날(YYYY-MM-DD). 즉 "이번 달 범위"의 exclusive upper bound.
// 예: 2026-05-27 기준 → 2026-06-01.
function nextMonthStart(baseStr: string): string {
  const base = new Date(baseStr + 'T00:00:00')
  const next = new Date(base.getFullYear(), base.getMonth() + 1, 1)
  return fmtLocal(next)
}

// 마감일(YYYY-MM-DD|null) → 그룹 키.
//   < today                    : overdue
//   [today, nextSun)           : this_week
//   [nextSun, afterNextSun)    : next_week
//   [afterNextSun, monthEnd+1) : this_month  ← 이번주·다음주를 지나서도 이번달이 남아있을 때만 등장
//   그 외 미래                 : later
//   null/undefined             : unset
export function taskGroupOf(dueDate: string | null | undefined): TaskGroupKey {
  if (!dueDate) return 'unset'
  const today = localTodayStr()
  if (dueDate < today) return 'overdue'
  const { nextSun, afterNextSun } = weekBounds(today)
  if (dueDate < nextSun) return 'this_week'
  if (dueDate < afterNextSun) return 'next_week'
  const monthBound = nextMonthStart(today)
  // afterNextSun 이 이미 다음달이면 this_month 구간 비어있음 → 자연스럽게 later 로 빠짐.
  if (dueDate < monthBound) return 'this_month'
  return 'later'
}
