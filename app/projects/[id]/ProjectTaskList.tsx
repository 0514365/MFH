'use client'

// MFH-PROJECT-TASK-LIST-V2
// 프로젝트 상세 "진행 상황" 할 일 목록.
// - 그룹 영역 분리: 미완료(To-do, 위) / 완료(Done, 아래·취소선). 각 그룹 내 sort_order 순(서버 정렬).
// - 순서 변경(소유자·마스터): 각 항목 날짜 우측 ▲▼ 상시 노출 → 같은 그룹 내 인접 교환
//   → swap_task_sort_order RPC(patch95) → router.refresh().
// - 선행/후속(patch96): 같은 프로젝트 할 일 id 를 제목으로 바꿔 행 아래에 표시(순서와 독립).
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TaskCheck from '../../tasks/TaskCheck'

export type ProjTaskItem = {
  id: string
  title: string
  done: boolean
  due_date: string | null
  sort_order: number | null
  predecessor_ids: string[] | null
  successor_ids: string[] | null
}

// 'YYYY-MM-DD' → 'MM.DD'
function fmtMD(d: string): string {
  return d.slice(5).replace('-', '.')
}

export default function ProjectTaskList({
  items,
  canReorder,
}: {
  items: ProjTaskItem[]
  canReorder: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  // id → 제목 (선행/후속 표시용). 같은 프로젝트 할 일이라 items 안에 모두 있음.
  const titleById = new Map(items.map((t) => [t.id, t.title]))
  const names = (ids: string[] | null): string =>
    (ids ?? []).map((id) => titleById.get(id) ?? '(삭제됨)').join(', ')

  const todo = items.filter((t) => !t.done)
  const doneList = items.filter((t) => t.done)

  // 같은 그룹 내 인접 두 항목의 sort_order 교환.
  async function swap(aId: string, bId: string) {
    if (busy) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('swap_task_sort_order', { a_id: aId, b_id: bId })
    setBusy(false)
    if (error) {
      alert('순서 변경 실패: ' + error.message)
      return
    }
    router.refresh()
  }

  // 한 그룹(미완료/완료) 렌더 — group 배열 내 인접끼리만 ▲▼.
  function renderGroup(group: ProjTaskItem[]) {
    return (
      <ul className="flex flex-col gap-3.5">
        {group.map((t, i) => {
          const pred = names(t.predecessor_ids)
          const succ = names(t.successor_ids)
          return (
            <li key={t.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-3.5">
                <TaskCheck id={t.id} done={t.done} />
                <Link
                  href={`/tasks/${t.id}/edit`}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3"
                >
                  <span
                    className={`min-w-0 truncate text-[15px] font-light tracking-tight ${
                      t.done ? 'text-faint line-through' : 'text-ink'
                    }`}
                  >
                    {t.title}
                  </span>
                  {t.due_date && (
                    <span
                      className={`shrink-0 whitespace-nowrap font-display text-[11px] font-medium tracking-wide ${
                        t.done ? 'text-faint' : 'text-muted'
                      }`}
                    >
                      {fmtMD(t.due_date)}
                    </span>
                  )}
                </Link>
                {canReorder && (
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => i > 0 && swap(t.id, group[i - 1].id)}
                      disabled={i === 0 || busy}
                      aria-label="위로 이동"
                      className="flex h-4 w-6 items-center justify-center text-[10px] text-muted transition-colors hover:text-primary disabled:opacity-20"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => i < group.length - 1 && swap(t.id, group[i + 1].id)}
                      disabled={i === group.length - 1 || busy}
                      aria-label="아래로 이동"
                      className="flex h-4 w-6 items-center justify-center text-[10px] text-muted transition-colors hover:text-primary disabled:opacity-20"
                    >
                      ▼
                    </button>
                  </div>
                )}
              </div>
              {(pred || succ) && (
                <div className="ml-9 flex flex-col gap-0.5 text-[11px] text-muted">
                  {pred && (
                    <span className="truncate">
                      <span className="mr-1 font-display text-[9px] uppercase tracking-wider text-faint">선행</span>
                      {pred}
                    </span>
                  )}
                  {succ && (
                    <span className="truncate">
                      <span className="mr-1 font-display text-[9px] uppercase tracking-wider text-faint">후속</span>
                      {succ}
                    </span>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 미완료 그룹 */}
      {todo.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
              To-do
            </span>
            <span className="text-[11px] text-muted">남은 {todo.length}</span>
          </div>
          {renderGroup(todo)}
        </div>
      )}

      {/* 완료 그룹 */}
      {doneList.length > 0 && (
        <div className={todo.length > 0 ? 'border-t border-line pt-5' : ''}>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.15em] text-faint">
              Done
            </span>
            <span className="text-[11px] text-faint">완료 {doneList.length}</span>
          </div>
          {renderGroup(doneList)}
        </div>
      )}
    </div>
  )
}
