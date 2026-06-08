// MFH-RECURRENCE-V1
// 반복 할 일 시리즈(patch85) 공용 로직. 편집/삭제의 "이 항목만 / 이후 모두" 범위 처리.
//  · following = 같은 recurrence_id · 미완료(done=false) · 마감일 ≥ 기준일(fromDueDate).
//  · 마감일 변경은 "바뀐 일수만큼" 이후 항목도 시프트 → 반복 간격 유지.
//  · 완료상태/진행상태는 전파하지 않음(개별 유지) — 정의 필드만 전파.
import { createClient } from '@/lib/supabase-browser'

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly'
export type RecurrenceScope = 'one' | 'following'

export function recurrenceLabel(freq: string | null | undefined): string {
  if (freq === 'daily') return '매일'
  if (freq === 'weekly') return '매주'
  if (freq === 'monthly') return '매월'
  return '반복'
}

const pad2 = (n: number) => String(n).padStart(2, '0')

// 두 날짜(YYYY-MM-DD) 간 일수 차(b - a). 로컬 자정 기준.
export function dayDelta(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`)
  const db = new Date(`${b}T00:00:00`)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 0
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}

// 날짜(YYYY-MM-DD)에 일수를 더해 다시 YYYY-MM-DD.
export function shiftDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + deltaDays)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

// 같은 시리즈의 "이후(미완료)" 항목에 정의 필드 동일 적용 + 마감일은 delta 만큼 시프트.
// 현재 항목(currentId)은 호출자가 따로 update 하므로 제외한다.
export async function updateRecurringFollowing(params: {
  recurrenceId: string
  currentId: string
  fromDueDate: string | null
  dateDelta: number
  template: {
    title: string
    description: string | null
    category: string | null
    place_name: string | null
    importance: number
    due_time: string | null
  }
}): Promise<{ ok: boolean; error?: string; count: number }> {
  const supabase = createClient()
  let sel = supabase
    .from('tasks')
    .select('id, due_date')
    .eq('recurrence_id', params.recurrenceId)
    .neq('id', params.currentId)
    .eq('done', false)
  if (params.fromDueDate) sel = sel.gte('due_date', params.fromDueDate)
  const { data, error } = await sel
  if (error) return { ok: false, error: error.message, count: 0 }
  const rows = (data ?? []) as { id: string; due_date: string | null }[]
  if (rows.length === 0) return { ok: true, count: 0 }

  // 비-날짜 정의 필드는 한 번에 일괄 update.
  const ids = rows.map((r) => r.id)
  const { error: updErr } = await supabase.from('tasks').update(params.template).in('id', ids)
  if (updErr) return { ok: false, error: updErr.message, count: 0 }

  // 마감일 이동이 있으면 각 행의 due_date 를 개별 시프트(간격 유지).
  if (params.dateDelta !== 0) {
    for (const r of rows) {
      if (!r.due_date) continue
      const nd = shiftDate(r.due_date, params.dateDelta)
      const { error: e } = await supabase.from('tasks').update({ due_date: nd }).eq('id', r.id)
      if (e) return { ok: false, error: e.message, count: rows.length }
    }
  }
  return { ok: true, count: rows.length }
}

// 같은 시리즈의 "남은(미완료) 항목 모두" + 현재 항목 삭제. 완료된 과거 항목은 보존.
export async function deleteRecurringFollowing(params: {
  recurrenceId: string
  fromDueDate: string | null
  currentId: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient()
  // 1) 같은 시리즈의 미완료(이후) 항목 삭제.
  let del = supabase.from('tasks').delete().eq('recurrence_id', params.recurrenceId).eq('done', false)
  if (params.fromDueDate) del = del.gte('due_date', params.fromDueDate)
  const { error } = await del
  if (error) return { ok: false, error: error.message }
  // 2) 현재 항목이 완료 상태였어도 확실히 삭제.
  const { error: e2 } = await supabase.from('tasks').delete().eq('id', params.currentId)
  if (e2) return { ok: false, error: e2.message }
  return { ok: true }
}
