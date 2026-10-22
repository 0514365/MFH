'use client'
// MFH-PROJECT-TASK-LIST-2027 — 4-3: 행(그립 · 원형 체크 · 제목 · 마감 색) + 구분선 · 그룹 머리 Manrope 회색 · 완료 그룹 흐리게.

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

// 오늘(로컬) 'YYYY-MM-DD' · 마감 글자색(지남 빨강 · 2일 이내 호박 · 그 외 회색).
function todayLocal(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
function dueTone(d: string): string {
  const today = todayLocal()
  if (d < today) return 'font-semibold text-b27-expense'
  const soon = new Date(today + 'T00:00:00')
  soon.setDate(soon.getDate() + 2)
  const soonMax = new Date(soon.getTime() - soon.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  return d <= soonMax ? 'font-semibold text-b27-wait' : 'text-b27-muted'
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
    <li ref={setNodeRef} style={style} className="flex items-center gap-3 border-b border-b27-line py-2.5 last:border-b-0">
      {canReorder && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="순서 변경 (드래그)"
          className="flex h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center text-[#C9CDD8] transition-colors hover:text-b27-ink active:cursor-grabbing"
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
          className={`min-w-0 truncate text-[15px] ${t.done ? 'text-b27-muted line-through' : 'text-b27-ink'}`}
        >
          {t.title}
        </span>
        {t.due_date && (
          <span
            className={`shrink-0 whitespace-nowrap font-num text-[12px] tabular-nums ${
              t.done ? 'text-b27-muted' : dueTone(t.due_date)
            }`}
          >
            {fmtMD(t.due_date)}
            {!t.done && t.due_date < todayLocal() ? ' 지남' : ''}
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
          <ul className="flex flex-col">
            {group.map((t) => (
              <SortableTask key={t.id} t={t} canReorder={canReorder} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 미완료 그룹 */}
      {todo.length > 0 && (
        <div>
          <div className="mb-1 font-num text-[12px] font-medium text-b27-muted">남은 할 일 {todo.length}</div>
          {renderGroup(todo, setTodo)}
        </div>
      )}

      {/* 완료 그룹 */}
      {doneList.length > 0 && (
        <div className="opacity-70">
          <div className="mb-1 font-num text-[12px] font-medium text-b27-muted">완료 {doneList.length}</div>
          {renderGroup(doneList, setDoneList)}
        </div>
      )}
    </div>
  )
}
