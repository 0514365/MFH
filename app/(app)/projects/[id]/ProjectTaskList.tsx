'use client'

// MFH-PROJECT-TASK-LIST-V3
// 프로젝트 상세 "진행 상황" 할 일 목록.
// - 그룹 분리: 미완료(To-do, 위) / 완료(Done, 아래·취소선). 각 그룹 내 sort_order 순(서버 정렬).
// - 순서 변경(소유자·마스터): 좌측 그립(⋮⋮) 드래그앤드롭(@dnd-kit, 터치 지원) → 그룹 내 재정렬
//   → 해당 그룹 sort_order 0..n 일괄 저장 → router.refresh().
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

// 드래그 그립(6점) 아이콘.
function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}

function SortableTask({ t, canReorder }: { t: ProjTaskItem; canReorder: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: t.id,
    disabled: !canReorder,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  }
  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-3">
      {canReorder && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="순서 변경 (드래그)"
          className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-faint transition-colors hover:text-primary active:cursor-grabbing"
        >
          <GripIcon />
        </button>
      )}
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
    </li>
  )
}

export default function ProjectTaskList({
  items,
  canReorder,
}: {
  items: ProjTaskItem[]
  canReorder: boolean
}) {
  const router = useRouter()
  const [todo, setTodo] = useState<ProjTaskItem[]>(() => items.filter((t) => !t.done))
  const [doneList, setDoneList] = useState<ProjTaskItem[]>(() => items.filter((t) => t.done))

  // 서버 데이터(items) 갱신 시 로컬 그룹 동기화.
  useEffect(() => {
    setTodo(items.filter((t) => !t.done))
    setDoneList(items.filter((t) => t.done))
  }, [items])

  // 모바일: 롱프레스(200ms)로 드래그 시작(스크롤과 구분). 데스크톱: 5px 이동.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  )

  // 드래그 종료된 그룹의 새 순서를 sort_order 0..n 으로 일괄 저장.
  async function persist(group: ProjTaskItem[]) {
    const supabase = createClient()
    await Promise.all(
      group.map((t, i) => supabase.from('tasks').update({ sort_order: i }).eq('id', t.id)),
    )
    router.refresh()
  }

  function onDragEnd(
    group: ProjTaskItem[],
    setGroup: (g: ProjTaskItem[]) => void,
  ): (e: DragEndEvent) => void {
    return (e) => {
      const { active, over } = e
      if (!over || active.id === over.id) return
      const oldI = group.findIndex((t) => t.id === active.id)
      const newI = group.findIndex((t) => t.id === over.id)
      if (oldI < 0 || newI < 0) return
      const next = arrayMove(group, oldI, newI)
      setGroup(next)
      void persist(next)
    }
  }

  function renderGroup(group: ProjTaskItem[], setGroup: (g: ProjTaskItem[]) => void) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd(group, setGroup)}
      >
        <SortableContext items={group.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-3.5">
            {group.map((t) => (
              <SortableTask key={t.id} t={t} canReorder={canReorder} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
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
          {renderGroup(todo, setTodo)}
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
          {renderGroup(doneList, setDoneList)}
        </div>
      )}
    </div>
  )
}
