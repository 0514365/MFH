// MFH-BULK-UPDATE-V3
// 다중선택 일괄변경의 supabase 헬퍼. 모듈별 함수 export.
// V2: 내부에서 createClient 호출 → 호출자가 client 주입 안 해도 됨. 타입 충돌 회피.
// V3: bulkUpdateJournals / bulkDeleteJournals 추가 (patch58b).
import { createClient } from '@/lib/supabase-browser'
import type { StatusValue } from '@/lib/constants'

// ───────── Tasks ─────────
// 할일 일괄변경. patch 객체는 변경할 컬럼만 포함.
// - status: Status 변경. 'done' 으로 바뀔 때 done=true·completed_at=now 도 함께 처리.
// - importance: 1~5
// - category: null 허용(분류 제거)
// - done: 완료/미완료 토글. done=true 면 completed_at=now, false 면 completed_at=null.
export type TaskBulkPatch = {
  status?: StatusValue
  importance?: number
  category?: string | null
  done?: boolean
}

export async function bulkUpdateTasks(
  ids: string[],
  patch: TaskBulkPatch,
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: true }
  const update: Record<string, unknown> = {}
  if (patch.status !== undefined) {
    update.status = patch.status
    if (patch.status === 'done') {
      update.done = true
      update.completed_at = new Date().toISOString()
    }
  }
  if (patch.importance !== undefined) update.importance = patch.importance
  if (patch.category !== undefined) update.category = patch.category
  if (patch.done !== undefined) {
    update.done = patch.done
    update.completed_at = patch.done ? new Date().toISOString() : null
  }
  if (Object.keys(update).length === 0) return { ok: true }

  const supabase = createClient()
  const { error } = await supabase.from('tasks').update(update).in('id', ids)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function bulkDeleteTasks(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: true }
  const supabase = createClient()
  const { error } = await supabase.from('tasks').delete().in('id', ids)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ───────── Journals ─────────
// 일지 일괄변경.
// - category: 사역분류 (null 허용)
// - prayer_candidate: 기도후보 토글
// - project_id: 연계 프로젝트 (단일 FK 컬럼, null=연결 해제, 기존값 덮어씀)
// - task_id: 연계 할일 (단일 FK 컬럼, null=연결 해제, 기존값 덮어씀)
export type JournalBulkPatch = {
  category?: string | null
  prayer_candidate?: boolean
  project_id?: string | null
  task_id?: string | null
}

export async function bulkUpdateJournals(
  ids: string[],
  patch: JournalBulkPatch,
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: true }
  const update: Record<string, unknown> = {}
  if (patch.category !== undefined) update.category = patch.category
  if (patch.prayer_candidate !== undefined) update.prayer_candidate = patch.prayer_candidate
  if (patch.project_id !== undefined) update.project_id = patch.project_id
  if (patch.task_id !== undefined) update.task_id = patch.task_id
  if (Object.keys(update).length === 0) return { ok: true }

  const supabase = createClient()
  const { error } = await supabase.from('journal_entries').update(update).in('id', ids)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function bulkDeleteJournals(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: true }
  const supabase = createClient()
  const { error } = await supabase.from('journal_entries').delete().in('id', ids)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
