// MFH-SIGNALS-V1 — L1 무료 규칙 신호(Phase 4b)
// 페이지가 이미 조회한 tasks/projects 배열로 칩 카운트를 계산(추가 쿼리·AI 0).
// 날짜는 'YYYY-MM-DD' 문자열 비교(사전순 = 날짜순). today 는 호출부에서 온두라스 기준으로 전달.

export type SignalKind = 'overdue' | 'soon' | 'stalled' | 'important'
export type Signal = { kind: SignalKind; label: string; count: number }

// 'YYYY-MM-DD' + 일수 → 'YYYY-MM-DD' (UTC 날짜 산술, 타임존 무관)
function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

type TaskLike = { done: boolean; due_date: string | null; importance: number }

export function taskSignals(tasks: TaskLike[], today: string): Signal[] {
  const soonMax = addDaysISO(today, 2)
  let overdue = 0
  let soon = 0
  let important = 0
  for (const t of tasks) {
    if (t.done) continue
    if (t.due_date) {
      if (t.due_date < today) overdue += 1
      else if (t.due_date <= soonMax) soon += 1
    }
    if (t.importance >= 4) important += 1
  }
  return (
    [
      { kind: 'overdue', label: '지남', count: overdue },
      { kind: 'soon', label: '임박', count: soon },
      { kind: 'important', label: '중요', count: important },
    ] as Signal[]
  ).filter((s) => s.count > 0)
}

type ProjectLike = { status: string; due_date: string | null; importance: number; updated_at: string }

export function projectSignals(projects: ProjectLike[], today: string): Signal[] {
  const soonMax = addDaysISO(today, 7)
  const stalledBefore = addDaysISO(today, -14)
  let overdue = 0
  let soon = 0
  let stalled = 0
  let important = 0
  for (const p of projects) {
    if (p.status === 'done') continue
    if (p.due_date) {
      if (p.due_date < today) overdue += 1
      else if (p.due_date <= soonMax) soon += 1
    }
    if (p.status === 'in_progress' && p.updated_at && p.updated_at.slice(0, 10) < stalledBefore) {
      stalled += 1
    }
    if (p.importance >= 4) important += 1
  }
  return (
    [
      { kind: 'overdue', label: '지남', count: overdue },
      { kind: 'soon', label: '임박', count: soon },
      { kind: 'stalled', label: '정체', count: stalled },
      { kind: 'important', label: '중요', count: important },
    ] as Signal[]
  ).filter((s) => s.count > 0)
}
