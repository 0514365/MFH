// MFH-BULK-UPDATE-V4
// 다중선택 일괄변경의 supabase 헬퍼. 모듈별 함수 export.
// V2: 내부에서 createClient 호출 → 호출자가 client 주입 안 해도 됨. 타입 충돌 회피.
// V3: bulkUpdateJournals / bulkDeleteJournals 추가 (patch58b).
// V4: bulkUpdateProjects / bulkDeleteProjects 추가 (patch58c).
import { createClient } from '@/lib/supabase-browser'
import type { StatusValue } from '@/lib/constants'

// ───────── Tasks ─────────
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

// ───────── Projects ─────────
// 프로젝트 일괄변경.
// - category: 사역분류 (null 허용)
// - status: upcoming / in_progress / done
// - importance: 1~5
// 프로젝트엔 done 컬럼이 없음 → '완료' = status === 'done' 으로 표현.
export type ProjectBulkPatch = {
  category?: string | null
  status?: StatusValue
  importance?: number
}

export async function bulkUpdateProjects(
  ids: string[],
  patch: ProjectBulkPatch,
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: true }
  const update: Record<string, unknown> = {}
  if (patch.category !== undefined) update.category = patch.category
  if (patch.status !== undefined) update.status = patch.status
  if (patch.importance !== undefined) update.importance = patch.importance
  if (Object.keys(update).length === 0) return { ok: true }

  const supabase = createClient()
  const { error } = await supabase.from('projects').update(update).in('id', ids)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function bulkDeleteProjects(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: true }
  const supabase = createClient()
  const { error } = await supabase.from('projects').delete().in('id', ids)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
