'use client'

// MFH-TASKS-LIST-V1
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { STATUSES, normalizeStatus, type StatusValue } from '@/lib/constants'
import { chip, chipOn, statusChipCls, toggle } from '@/lib/statusChip'
import { fmtTime } from '@/lib/calendar'
import { StatusBadge, CategoryBadge, ImportanceStars, fmtDate } from '../projects/badges'
import TaskCheck from './TaskCheck'

export type TaskListRow = {
  id: string
  title: string
  description: string | null
  done: boolean
  priority: string
  importance: number
  status: string | null
  category: string | null
  due_date: string | null
  due_time: string | null
  project_id: string | null
  projects: { title: string } | null
}

type SortKey = 'due' | 'importance'

export default function TasksListClient({ tasks }: { tasks: TaskListRow[] }) {
  const [hideDone, setHideDone] = useState(true)
  const [fStatus, setFStatus] = useState<StatusValue[]>([])
  const [fImportance, setFImportance] = useState<number[]>([])
  const [fCategory, setFCategory] = useState<string[]>([])
  const [fProject, setFProject] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('due')
  const [asc, setAsc] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  // 데이터에 실제로 존재하는 값만 칩으로 노출
  const importanceOpts = useMemo(
    () =>
      Array.from(new Set(tasks.map((t) => t.importance).filter((n): n is number => !!n))).sort(
        (a, b) => b - a,
      ),
    [tasks],
  )
  const categoryOpts = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.category).filter((c): c is string => !!c))).sort(),
    [tasks],
  )
  const projectOpts = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of tasks) {
      if (t.project_id && t.projects?.title) map.set(t.project_id, t.projects.title)
    }
    return Array.from(map, ([id, title]) => ({ id, title })).sort((a, b) =>
      a.title.localeCompare(b.title),
    )
  }, [tasks])

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => {
      if (hideDone && t.done) return false
      if (fStatus.length && !fStatus.includes(normalizeStatus(t.status))) return false
      if (fImportance.length && !fImportance.includes(t.importance)) return false
      if (fCategory.length && !(t.category && fCategory.includes(t.category))) return false
      if (fProject.length && !(t.project_id && fProject.includes(t.project_id))) return false
      return true
    })
    const dir = asc ? 1 : -1
    list = [...list].sort((a, b) => {
      if (sortKey === 'due') {
        // 마감 없는 항목은 항상 뒤로
        const av = a.due_date ?? ''
        const bv = b.due_date ?? ''
        if (!av && !bv) return 0
        if (!av) return 1
        if (!bv) return -1
        if (av !== bv) return av < bv ? -1 * dir : 1 * dir
        // 같은 날짜면 시간으로 보조 정렬(시간 없는 건 뒤로)
        const at = a.due_time ?? ''
        const bt = b.due_time ?? ''
        if (!at && !bt) return 0
        if (!at) return 1
        if (!bt) return -1
        return at < bt ? -1 * dir : at > bt ? 1 * dir : 0
      }
      // importance
      return ((a.importance ?? 0) - (b.importance ?? 0)) * dir
    })
    return list
  }, [tasks, hideDone, fStatus, fImportance, fCategory, fProject, sortKey, asc])

  const activeCount =
    (hideDone ? 0 : 1) + fStatus.length + fImportance.length + fCategory.length + fProject.length
  const hasFilter = activeCount > 0
  const sortChanged = sortKey !== 'due' || !asc
  const canReset = hasFilter || sortChanged

  function resetAll() {
    setHideDone(true)
    setFStatus([])
    setFImportance([])
    setFCategory([])
    setFProject([])
    setSortKey('due')
    setAsc(true)
  }

  return (
    <>
      {/* 컨트롤 바: 필터 토글 / 정렬 토글 / 모두 초기화 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            filterOpen || hasFilter
              ? 'border-primary text-primary'
              : 'border-line text-muted hover:border-primary'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          필터
          {hasFilter && (
            <span className="ml-0.5 rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            sortOpen || sortChanged
              ? 'border-primary text-primary'
              : 'border-line text-muted hover:border-primary'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          {sortKey === 'due' ? '마감기한' : '중요도'} {asc ? '↑' : '↓'}
        </button>

        {canReset && (
          <button
            type="button"
            onClick={resetAll}
            className="ml-auto flex items-center gap-1 rounded-xl border border-accent px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent-soft"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            모두 초기화
          </button>
        )}
      </div>

      {/* 필터 칩바 (접이식) */}
      {filterOpen && (
        <div className="mb-3 space-y-2 rounded-xl border border-line bg-surface-subtle p-3">
          {/* 완료 숨김 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold text-faint">완료</span>
            <button
              type="button"
              onClick={() => setHideDone((v) => !v)}
              className={`${chip} ${hideDone ? chipOn : ''}`}
            >
              완료 숨김
            </button>
          </div>

          {/* 상태 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold text-faint">상태</span>
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setFStatus((a) => toggle(a, s.value))}
                className={statusChipCls(s.value, fStatus.includes(s.value))}
              >
                {s.label}
              </button>
            ))}
          </div>

          {importanceOpts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-faint">중요도</span>
              {importanceOpts.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFImportance((a) => toggle(a, n))}
                  className={`${chip} ${fImportance.includes(n) ? chipOn : ''}`}
                >
                  {'★'.repeat(n)}
                </button>
              ))}
            </div>
          )}

          {categoryOpts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-faint">분류</span>
              {categoryOpts.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFCategory((a) => toggle(a, c))}
                  className={`${chip} ${fCategory.includes(c) ? chipOn : ''}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {projectOpts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-faint">프로젝트</span>
              {projectOpts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFProject((a) => toggle(a, p.id))}
                  className={`${chip} ${fProject.includes(p.id) ? chipOn : ''}`}
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 정렬 (접이식) */}
      {sortOpen && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface-subtle p-3">
          <span className="mr-1 text-[11px] font-semibold text-faint">정렬</span>
          <button
            type="button"
            onClick={() => setSortKey('due')}
            className={`${chip} ${sortKey === 'due' ? chipOn : ''}`}
          >
            마감기한
          </button>
          <button
            type="button"
            onClick={() => setSortKey('importance')}
            className={`${chip} ${sortKey === 'importance' ? chipOn : ''}`}
          >
            중요도
          </button>
          <button type="button" onClick={() => setAsc((v) => !v)} className={`${chip} ml-auto`}>
            {asc ? '오름차순 ↑' : '내림차순 ↓'}
          </button>
        </div>
      )}

      {/* 리스트 */}
      {tasks.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          아직 할 일이 없습니다.
          <br />첫 할 일을 만들어 보세요.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          조건에 맞는 할 일이 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <TaskCheck id={t.id} done={t.done} />
              <Link href={`/tasks/${t.id}/edit`} className="min-w-0 flex-1">
                <div
                  className={`truncate text-sm font-semibold ${
                    t.done ? 'text-faint line-through' : 'text-ink'
                  }`}
                >
                  {t.title}
                </div>
                {t.description && (
                  <div className="mt-0.5 line-clamp-1 text-xs text-muted">{t.description}</div>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge value={t.status ?? 'upcoming'} />
                  {t.projects?.title && (
                    <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">
                      {t.projects.title}
                    </span>
                  )}
                  <CategoryBadge value={t.category} />
                  <ImportanceStars value={t.importance} />
                  {t.due_date && (
                    <span className="text-[11px] text-muted">
                      ~ {fmtDate(t.due_date)}
                      {t.due_time ? ` ${fmtTime(t.due_time)}` : ''}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
