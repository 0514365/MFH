'use client'

// MFH-PROJECT-TASK-LIST-V1
// 프로젝트 상세 "진행 상황" 할 일 목록 + 순서 편집(patch95).
// 평소: 체크 토글 + 제목 링크 + 마감일. 정렬은 서버에서 미완료(sort_order↑) → 완료(sort_order↑) 그룹.
// "순서 편집"(소유자·마스터만): 각 항목 ↑↓ 로 같은 그룹 내 한 칸 이동
//   → swap_task_sort_order RPC(권한·같은프로젝트 검증) → router.refresh() 로 재동기화.
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
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  // 인접 두 항목(같은 done 그룹)의 sort_order 교환.
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

  return (
    <>
      {canReorder && items.length > 1 && (
        <div className="-mt-1 mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg px-2 py-1 text-[12px] font-medium text-primary transition-colors hover:text-accent"
          >
            {editing ? '완료' : '순서 편집'}
          </button>
        </div>
      )}
      <ul className="flex flex-col gap-4">
        {items.map((t, i) => {
          // 같은 done 그룹 내 인접 항목과만 교환(미완료↔완료 경계는 넘지 않음).
          const prev = items[i - 1]
          const next = items[i + 1]
          const canUp = editing && !!prev && prev.done === t.done
          const canDown = editing && !!next && next.done === t.done
          return (
            <li key={t.id} className="flex items-center gap-3.5">
              {editing ? (
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => canUp && swap(t.id, prev!.id)}
                    disabled={!canUp || busy}
                    aria-label="위로 이동"
                    className="flex h-5 w-6 items-center justify-center text-[11px] text-muted transition-colors hover:text-primary disabled:opacity-20"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => canDown && swap(t.id, next!.id)}
                    disabled={!canDown || busy}
                    aria-label="아래로 이동"
                    className="flex h-5 w-6 items-center justify-center text-[11px] text-muted transition-colors hover:text-primary disabled:opacity-20"
                  >
                    ▼
                  </button>
                </div>
              ) : (
                <TaskCheck id={t.id} done={t.done} />
              )}

              {editing ? (
                <span
                  className={`min-w-0 flex-1 truncate text-[15px] font-light tracking-tight ${
                    t.done ? 'text-faint line-through' : 'text-ink'
                  }`}
                >
                  {t.title}
                </span>
              ) : (
                <Link
                  href={`/tasks/${t.id}/edit`}
                  className="flex flex-1 items-center justify-between gap-4"
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
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
