// lib/calendar.ts
// 순수 TS 달력 계산 — 외부 라이브러리 없음.
// due_date 는 Postgres `date`(YYYY-MM-DD 문자열)이므로 문자열 기준으로 다뤄 타임존 영향을 피한다.
// 주(week)는 일요일 시작, 월(month) 그리드는 6주(42칸) 고정.

export type DateKey = string // 'YYYY-MM-DD'

export type Cell = {
  key: DateKey
  year: number
  month: number // 1-base
  day: number
  inMonth: boolean // month 그리드에서 해당 월 소속 여부
}

export const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
] as const

export const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

export function toKey(y: number, m: number, d: number): DateKey {
  return `${y}-${pad2(m)}-${pad2(d)}`
}

export function parseKey(key: DateKey): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number)
  return { y, m, d }
}

export function todayKey(): DateKey {
  const now = new Date()
  return toKey(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

// 월 그리드: 1일이 속한 주의 일요일부터 42칸.
export function monthGrid(y: number, m: number): Cell[] {
  const first = new Date(y, m - 1, 1)
  const startDow = first.getDay() // 0=일
  const cells: Cell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m - 1, 1 - startDow + i)
    const yy = d.getFullYear()
    const mm = d.getMonth() + 1
    const dd = d.getDate()
    cells.push({ key: toKey(yy, mm, dd), year: yy, month: mm, day: dd, inMonth: mm === m && yy === y })
  }
  return cells
}

// 주 그리드: 기준 날짜가 속한 주(일~토) 7칸.
export function weekGrid(key: DateKey): Cell[] {
  const { y, m, d } = parseKey(key)
  const dow = new Date(y, m - 1, d).getDay()
  const cells: Cell[] = []
  for (let i = 0; i < 7; i++) {
    const dt = new Date(y, m - 1, d - dow + i)
    const yy = dt.getFullYear()
    const mm = dt.getMonth() + 1
    const dd = dt.getDate()
    cells.push({ key: toKey(yy, mm, dd), year: yy, month: mm, day: dd, inMonth: true })
  }
  return cells
}

// 월 이동
export function addMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const idx = y * 12 + (m - 1) + delta
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 }
}

// 주 이동(키 기준 ±7일)
export function addWeek(key: DateKey, delta: number): DateKey {
  const { y, m, d } = parseKey(key)
  const dt = new Date(y, m - 1, d + delta * 7)
  return toKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
}

// 표시용: 'YYYY. MM. DD' (기기 로케일 무관, DateField 와 동일 톤)
export function fmtKey(key: DateKey): string {
  const { y, m, d } = parseKey(key)
  return `${y}. ${pad2(m)}. ${pad2(d)}`
}

// 주 범위 라벨: 'M월 D일 – D일' / 월이 바뀌면 'M월 D일 – M월 D일'
export function weekRangeLabel(cells: Cell[]): string {
  if (cells.length === 0) return ''
  const a = cells[0]
  const b = cells[cells.length - 1]
  const left = `${a.month}월 ${a.day}일`
  const right = a.month === b.month ? `${b.day}일` : `${b.month}월 ${b.day}일`
  return `${left} – ${right}`
}
