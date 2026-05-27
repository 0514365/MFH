// MFH-BULK-UPDATE-V1
// 다중선택 일괄변경의 supabase 헬퍼. 모듈별 함수 export.
// 호출자가 supabase client 를 주입(client/server 양쪽 지원).
// patch58b·c 에서 bulkUpdateJournals / bulkUpdateProjects 추가 예정.
import type { StatusValue } from '@/lib/constants'

type SupabaseLike = {
  from: (table: string) => {
    update: (patch: Record<string, unknown>) => {
      in: (col: string, vals: string[]) => Promise<{ error: { message: string } | null }>
    }
    delete: () => {
      in: (col: string, vals: string[]) => Promise<{ error: { message: string } | null }>
    }
  }
}

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
  supabase: SupabaseLike,
  ids: string[],
  patch: TaskBulkPatch,
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: true }
  const update: Record<string, unknown> = {}
  if (patch.status !== undefined) {
    update.status = patch.status
    // status=done 이면 done 도 true 로 함께(데이터 정합성)
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

  const { error } = await supabase.from('tasks').update(update).in('id', ids)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function bulkDeleteTasks(
  supabase: SupabaseLike,
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (ids.length === 0) return { ok: true }
  const { error } = await supabase.from('tasks').delete().in('id', ids)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
