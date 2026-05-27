// MFH-TASK-GROUPS-V1
// 할 일 기한 그룹: 연체 / 이번주 / 다음주 / 나머지(시간순) / 미지정.
// 주 시작 = 일요일 기준. 로컬 날짜 문자열(YYYY-MM-DD) 비교.

export type TaskGroupKey = 'overdue' | 'this_week' | 'next_week' | 'later' | 'unset'

export const TASK_GROUP_LABEL: Record<TaskGroupKey, string> = {
  overdue: '연체',
  this_week: '이번 주',
  next_week: '다음 주',
  later: '나머지',
  unset: '미지정',
}

export const TASK_GROUP_ORDER: TaskGroupKey[] = [
  'overdue',
  'this_week',
  'next_week',
  'later',
  'unset',
]

function localTodayStr(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

// 일요일 시작 주의 경계(YYYY-MM-DD). base 미지정 시 오늘 기준.
function weekBounds(baseStr: string): { sun: string; nextSun: string; afterNextSun: string } {
  const base = new Date(baseStr + 'T00:00:00')
  const dow = base.getDay() // 일=0 … 토=6
  const sun = new Date(base)
  sun.setDate(base.getDate() - dow)
  const fmt = (d: Date) => {
    const off = d.getTimezoneOffset()
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
  }
  const nextSun = new Date(sun)
  nextSun.setDate(sun.getDate() + 7)
  const afterNextSun = new Date(sun)
  afterNextSun.setDate(sun.getDate() + 14)
  return { sun: fmt(sun), nextSun: fmt(nextSun), afterNextSun: fmt(afterNextSun) }
}

// 마감일(YYYY-MM-DD|null) → 그룹 키.
export function taskGroupOf(dueDate: string | null | undefined): TaskGroupKey {
  if (!dueDate) return 'unset'
  const today = localTodayStr()
  if (dueDate < today) return 'overdue'
  const { nextSun, afterNextSun } = weekBounds(today)
  if (dueDate < nextSun) return 'this_week'
  if (dueDate < afterNextSun) return 'next_week'
  return 'later'
}
