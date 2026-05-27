'use client'

// MFH-TASKS-LIST-V1
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { STATUSES, normalizeStatus, type StatusValue } from '@/lib/constants'
import { chip, chipOn, statusChipCls, toggle } from '@/lib/statusChip'
import { fmtTime } from '@/lib/calendar'
import { StatusBadge, CategoryBadge, ImportanceStars } from '../projects/badges'
import { useWideScreen } from '@/lib/useWideScreen'
import {
  taskGroupOf,
  TASK_GROUP_LABEL,
  TASK_GROUP_ORDER,
  type TaskGroupKey,
} from '@/lib/taskGroups'
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
  place_name: string | null
  project_id: string | null
  projects: { title: string } | null
}

type SortKey = 'due' | 'importance'

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']
// 마감일(YYYY-MM-DD) → "5/30(금)". 잘못된 값이면 원문 반환.
function fmtDueShort(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  if (Number.isNaN(dt.getTime())) return d
  return `${dt.getMonth() + 1}/${dt.getDate()}(${WEEKDAY_KO[dt.getDay()]})`
}
// 마감일이 오늘 이전이면 연체.
function isOverdue(d: string): boolean {
  const now = new Date()
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  return d < today
}

// 요약 패널(읽기전용). 넓은 화면 우측. '편집' 버튼 → /tasks/[id]/edit.
function TaskSummary({ t }: { t: TaskListRow }) {
  const overdue = !!t.due_date && !t.done && isOverdue(t.due_date)
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex gap-3 py-2">
      <span className="w-16 shrink-0 text-xs font-semibold text-faint">{label}</span>
      <div className="min-w-0 flex-1 text-sm text-ink">{children}</div>
    </div>
  )
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h2
          className={`text-lg font-bold ${t.done ? 'text-faint line-through' : 'text-ink'}`}
        >
          {t.title}
        </h2>
        <Link
          href={`/tasks/${t.id}/edit`}
          className="shrink-0 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
        >
          편집
        </Link>
      </div>

      {t.description && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
          {t.description}
        </p>
      )}

      <div className="mt-4 divide-y divide-line border-t border-line">
        <Row label="상태">
          <StatusBadge value={t.status ?? 'upcoming'} />
        </Row>
        {t.importance > 0 && (
          <Row label="중요도">
            <ImportanceStars value={t.importance} />
          </Row>
        )}
        {t.due_date && (
          <Row label="마감">
            <span className={overdue ? 'text-danger' : ''}>
              {fmtDueShort(t.due_date)}
              {t.due_time ? ` ${fmtTime(t.due_time)}` : ''}
              {overdue ? ' · 연체' : ''}
            </span>
          </Row>
        )}
        {t.place_name && <Row label="장소">📍 {t.place_name}</Row>}
        {t.category && (
          <Row label="분류">
            <CategoryBadge value={t.category} />
          </Row>
        )}
        {t.projects?.title && <Row label="프로젝트">{t.projects.title}</Row>}
        <Row label="완료">{t.done ? '완료됨' : '미완료'}</Row>
      </div>
    </div>
  )
}

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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const wide = useWideScreen()

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

  // 넓은 화면: 선택이 비었거나 목록에서 사라지면 첫 항목 자동선택. 좁은 화면: 선택 해제.
  useEffect(() => {
    if (!wide) {
      setSelectedId(null)
      return
    }
    setSelectedId((cur) => {
      if (cur && filtered.some((t) => t.id === cur)) return cur
      return filtered[0]?.id ?? null
    })
  }, [wide, filtered])

  const selectedTask = useMemo(
    () => filtered.find((t) => t.id === selectedId) ?? null,
    [filtered, selectedId],
  )

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
      {/* 컨트롤 바: 필터 토글 / 정렬 토글 / 모두 초기화 (sticky) */}
      <div
        className="sticky top-[64px] z-20 -mx-5 mb-3 flex flex-wrap items-center gap-2 px-5 py-2"
        style={{ background: 'var(--paper)' }}
      >
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
        (() => {
          // 기본정렬(마감·오름차순)일 때만 기한 그룹 헤더 표시. 그 외엔 평면 리스트.
          const grouped = sortKey === 'due' && asc

          // 카드 내용(날짜·제목·설명·배지). wide=선택버튼 / narrow=Link 로 감쌈.
          function TaskBody({ t }: { t: TaskListRow }) {
            const overdue = !!t.due_date && !t.done && isOverdue(t.due_date)
            return (
              <>
                {/* 1행: 날짜(작게) — 연체면 빨강 */}
                {t.due_date && (
                  <div
                    className={`text-[11px] font-medium ${overdue ? 'text-danger' : 'text-faint'}`}
                  >
                    {fmtDueShort(t.due_date)}
                    {t.due_time ? ` ${fmtTime(t.due_time)}` : ''}
                    {overdue ? ' · 연체' : ''}
                  </div>
                )}

                {/* 2행: 제목(굵게) */}
                <div
                  className={`mt-0.5 text-sm font-semibold ${
                    t.done ? 'text-faint line-through' : 'text-ink'
                  }`}
                >
                  {t.title}
                </div>

                {/* 설명: 동적 높이(최대 3줄) */}
                {t.description && (
                  <div className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-muted">
                    {t.description}
                  </div>
                )}

                {/* 3행: Status | 중요도 — 모바일 세로모드 2열 */}
                <div className="mt-2 grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
                  <StatusBadge value={t.status ?? 'upcoming'} />
                  {t.importance > 0 && (
                    <div className="justify-self-end sm:justify-self-auto">
                      <ImportanceStars value={t.importance} />
                    </div>
                  )}
                </div>

                {/* 4행: 분류 · 장소 · 프로젝트 */}
                {(t.category || t.place_name || t.projects?.title) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <CategoryBadge value={t.category} />
                    {t.place_name && (
                      <span className="text-[11px] text-muted">📍 {t.place_name}</span>
                    )}
                    {t.projects?.title && (
                      <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">
                        {t.projects.title}
                      </span>
                    )}
                  </div>
                )}
              </>
            )
          }

          function renderTask(t: TaskListRow) {
            const isSel = wide && t.id === selectedId
            return (
              <li
                key={t.id}
                className={`flex items-start gap-3 rounded-2xl border bg-surface px-4 py-3 ${
                  isSel ? 'border-primary border-2' : 'border-line'
                }`}
              >
                <div className="pt-0.5">
                  <TaskCheck id={t.id} done={t.done} />
                </div>
                {wide ? (
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <TaskBody t={t} />
                  </button>
                ) : (
                  <Link href={`/tasks/${t.id}/edit`} className="min-w-0 flex-1">
                    <TaskBody t={t} />
                  </Link>
                )}
              </li>
            )
          }

          function renderList() {
            if (!grouped) {
              return <ul className="space-y-2">{filtered.map(renderTask)}</ul>
            }
            const buckets: Record<TaskGroupKey, TaskListRow[]> = {
              overdue: [],
              this_week: [],
              next_week: [],
              later: [],
              unset: [],
            }
            for (const t of filtered) buckets[taskGroupOf(t.due_date)].push(t)
            return (
              <div className="space-y-5">
                {TASK_GROUP_ORDER.filter((k) => buckets[k].length > 0).map((k) => (
                  <section key={k}>
                    <h2 className="mb-2 flex items-center gap-2 text-xs font-bold text-muted">
                      {TASK_GROUP_LABEL[k]}
                      <span className="rounded-full bg-surface-subtle px-1.5 text-[10px] font-semibold text-faint">
                        {buckets[k].length}
                      </span>
                    </h2>
                    <ul className="space-y-2">{buckets[k].map(renderTask)}</ul>
                  </section>
                ))}
              </div>
            )
          }

          // 좁은 화면: 기존처럼 목록만(탭=세부 직행).
          if (!wide) return renderList()

          // 넓은 화면: 좌 목록 / 우 요약(읽기전용, 첫 항목 자동선택).
          return (
            <div className="grid grid-cols-1 gap-5 min-[740px]:grid-cols-[1fr_1.1fr]">
              <div className="min-w-0">{renderList()}</div>
              <div className="min-w-0">
                <div
                  className="sticky top-[120px] rounded-2xl border border-line bg-surface p-5"
                  style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}
                >
                  {selectedTask ? (
                    <TaskSummary t={selectedTask} />
                  ) : (
                    <p className="py-10 text-center text-sm text-faint">
                      왼쪽에서 할 일을 선택하세요.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })()
      )}
    </>
  )
}
