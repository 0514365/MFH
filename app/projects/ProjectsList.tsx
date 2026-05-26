'use client'

// MFH-PROJECTS-LIST-V1
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Project } from '@/lib/types'
import { STATUSES, normalizeStatus, type StatusValue } from '@/lib/constants'
import { StatusBadge, CategoryBadge, ImportanceStars, fmtDate } from './badges'
import { ProgressRing } from './Progress'

type Counts = Record<string, { total: number; done: number }>
type SortKey = 'due' | 'importance'

const chip =
  'rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted transition hover:border-primary'
const chipOn = 'border-primary bg-primary-soft text-primary outline outline-1 outline-primary'

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

export default function ProjectsList({
  projects,
  counts,
}: {
  projects: Project[]
  counts: Counts
}) {
  const [fStatus, setFStatus] = useState<StatusValue[]>([])
  const [fImportance, setFImportance] = useState<number[]>([])
  const [fCategory, setFCategory] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('due')
  const [asc, setAsc] = useState(true)
  const [sortOpen, setSortOpen] = useState(false)

  // 데이터에 실제로 존재하는 값만 칩으로 노출
  const importanceOpts = useMemo(
    () =>
      Array.from(new Set(projects.map((p) => p.importance).filter((n): n is number => !!n))).sort(
        (a, b) => b - a,
      ),
    [projects],
  )
  const categoryOpts = useMemo(
    () =>
      Array.from(
        new Set(projects.map((p) => p.category).filter((c): c is string => !!c)),
      ).sort(),
    [projects],
  )

  const filtered = useMemo(() => {
    let list = projects.filter((p) => {
      if (fStatus.length && !fStatus.includes(normalizeStatus(p.status))) return false
      if (fImportance.length && !fImportance.includes(p.importance)) return false
      if (fCategory.length && !(p.category && fCategory.includes(p.category))) return false
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
        return av < bv ? -1 * dir : av > bv ? 1 * dir : 0
      }
      // importance
      return ((a.importance ?? 0) - (b.importance ?? 0)) * dir
    })
    return list
  }, [projects, fStatus, fImportance, fCategory, sortKey, asc])

  const hasFilter = fStatus.length > 0 || fImportance.length > 0 || fCategory.length > 0

  function reset() {
    setFStatus([])
    setFImportance([])
    setFCategory([])
  }

  return (
    <>
      {/* 필터 칩바 */}
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold text-faint">상태</span>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setFStatus((a) => toggle(a, s.value))}
              className={`${chip} ${fStatus.includes(s.value) ? chipOn : ''}`}
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
      </div>

      {/* 정렬(접이식) + 초기화 */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted transition hover:text-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          정렬: {sortKey === 'due' ? '마감기한' : '중요도'} {asc ? '↑' : '↓'}
        </button>
        {hasFilter && (
          <button type="button" onClick={reset} className="text-xs text-faint underline">
            필터 초기화
          </button>
        )}
      </div>

      {sortOpen && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface-subtle p-2">
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
          <button
            type="button"
            onClick={() => setAsc((v) => !v)}
            className={`${chip} ml-auto`}
          >
            {asc ? '오름차순 ↑' : '내림차순 ↓'}
          </button>
        </div>
      )}

      {/* 리스트 */}
      {projects.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          아직 프로젝트가 없습니다.
          <br />첫 프로젝트를 만들어 보세요.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          조건에 맞는 프로젝트가 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => {
            const c = counts[p.id] ?? { total: 0, done: 0 }
            return (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-primary"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={p.status} />
                      <CategoryBadge value={p.category} />
                      <ImportanceStars value={p.importance} />
                      {p.due_date && (
                        <span className="text-[11px] text-muted">~ {fmtDate(p.due_date)}</span>
                      )}
                    </div>
                    <div className="mt-1.5 font-bold text-ink">{p.title}</div>
                    {p.description && (
                      <div className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</div>
                    )}
                  </div>
                  <ProgressRing done={c.done} total={c.total} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
