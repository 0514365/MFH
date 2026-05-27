'use client'

// MFH-PROJECTS-LIST-V2
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { Project } from '@/lib/types'
import { STATUSES, type StatusValue } from '@/lib/constants'
import { chip, chipOn, statusChipCls, toggle } from '@/lib/statusChip'
import {
  applyProjectFilter,
  buildProjectQuery,
  parseProjectFilter,
  type ProjectFilter,
} from '@/lib/projectFilter'
import { StatusBadge, CategoryBadge, ImportanceStars, fmtDate } from './badges'
import { ProgressRing } from './Progress'
import { useWideScreen } from '@/lib/useWideScreen'

type Counts = Record<string, { total: number; done: number }>
type SortKey = 'due' | 'importance'

// 요약 패널(읽기전용). 넓은 화면 우측. '편집' → /projects/[id]/edit, '상세' → /projects/[id].
function ProjectSummary({
  p,
  counts,
  detailSuffix,
}: {
  p: Project
  counts: { total: number; done: number }
  detailSuffix: string
}) {
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex gap-3 py-2">
      <span className="w-16 shrink-0 text-xs font-semibold text-faint">{label}</span>
      <div className="min-w-0 flex-1 text-sm text-ink">{children}</div>
    </div>
  )
  const period =
    p.start_date || p.due_date
      ? `${p.start_date ? fmtDate(p.start_date) : '—'} ~ ${p.due_date ? fmtDate(p.due_date) : '—'}`
      : null
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">{p.title}</h2>
        <div className="flex shrink-0 gap-1.5">
          <Link
            href={`/projects/${p.id}${detailSuffix}`}
            className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary"
          >
            상세
          </Link>
          <Link
            href={`/projects/${p.id}/edit`}
            className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          >
            편집
          </Link>
        </div>
      </div>

      {p.description && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
          {p.description}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <ProgressRing done={counts.done} total={counts.total} />
        <span className="text-xs text-muted">
          할 일 {counts.done}/{counts.total} 완료
        </span>
      </div>

      <div className="mt-4 divide-y divide-line border-t border-line">
        <Row label="상태">
          <StatusBadge value={p.status} />
        </Row>
        {p.importance > 0 && (
          <Row label="중요도">
            <ImportanceStars value={p.importance} />
          </Row>
        )}
        {period && <Row label="기간">{period}</Row>}
        {p.category && (
          <Row label="분류">
            <CategoryBadge value={p.category} />
          </Row>
        )}
      </div>
    </div>
  )
}

export default function ProjectsList({
  projects,
  counts,
}: {
  projects: Project[]
  counts: Counts
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // URL 쿼리에서 초기 필터/정렬을 읽는다(새로고침·뒤로가기·상세 왕복에도 유지).
  const initial = useMemo(
    () => parseProjectFilter(searchParams),
    // 마운트 시 1회만. 이후 동기화는 아래 effect 가 담당.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [fStatus, setFStatus] = useState<StatusValue[]>(initial.fStatus)
  const [fImportance, setFImportance] = useState<number[]>(initial.fImportance)
  const [fCategory, setFCategory] = useState<string[]>(initial.fCategory)
  const [sortKey, setSortKey] = useState<SortKey>(initial.sortKey)
  const [asc, setAsc] = useState(initial.asc)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const wide = useWideScreen()

  // 필터/정렬이 바뀌면 URL 쿼리를 갱신(replace=히스토리 오염 방지).
  // 기본값이면 쿼리를 제거해 URL 을 깔끔히 유지 → '모두 초기화' 도 자연히 반영.
  useEffect(() => {
    const f: ProjectFilter = { fStatus, fImportance, fCategory, sortKey, asc }
    const qs = buildProjectQuery(f)
    const current = searchParams.toString()
    if (qs === current) return
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [fStatus, fImportance, fCategory, sortKey, asc, pathname, router, searchParams])

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

  const filtered = useMemo(
    () => applyProjectFilter(projects, { fStatus, fImportance, fCategory, sortKey, asc }),
    [projects, fStatus, fImportance, fCategory, sortKey, asc],
  )

  // 상세 링크에 붙일 현재 필터 쿼리(검색된 목록 기준 이전/다음 유지용).
  const detailQuery = useMemo(
    () => buildProjectQuery({ fStatus, fImportance, fCategory, sortKey, asc }),
    [fStatus, fImportance, fCategory, sortKey, asc],
  )
  const detailSuffix = detailQuery ? `?${detailQuery}` : ''

  // 넓은 화면: 첫 항목 자동선택(선택 유지/복구). 좁은 화면: 해제.
  useEffect(() => {
    if (!wide) {
      setSelectedId(null)
      return
    }
    setSelectedId((cur) => {
      if (cur && filtered.some((p) => p.id === cur)) return cur
      return filtered[0]?.id ?? null
    })
  }, [wide, filtered])

  const selectedProject = useMemo(
    () => filtered.find((p) => p.id === selectedId) ?? null,
    [filtered, selectedId],
  )

  const activeCount = fStatus.length + fImportance.length + fCategory.length
  const hasFilter = activeCount > 0
  const sortChanged = sortKey !== 'due' || !asc
  const canReset = hasFilter || sortChanged

  function resetAll() {
    setFStatus([])
    setFImportance([])
    setFCategory([])
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
        (() => {
          function ProjectBody({ p }: { p: Project }) {
            return (
              <>
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
              </>
            )
          }

          function renderItem(p: Project) {
            const c = counts[p.id] ?? { total: 0, done: 0 }
            const isSel = wide && p.id === selectedId
            return (
              <li key={p.id}>
                {wide ? (
                  <button
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border bg-surface p-4 text-left ${
                      isSel ? 'border-primary border-2' : 'border-line'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <ProjectBody p={p} />
                    </div>
                    <ProgressRing done={c.done} total={c.total} />
                  </button>
                ) : (
                  <Link
                    href={`/projects/${p.id}${detailSuffix}`}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-primary"
                  >
                    <div className="min-w-0 flex-1">
                      <ProjectBody p={p} />
                    </div>
                    <ProgressRing done={c.done} total={c.total} />
                  </Link>
                )}
              </li>
            )
          }

          const list = <ul className="space-y-3">{filtered.map(renderItem)}</ul>

          // 좁은 화면: 목록만(탭=상세 직행).
          if (!wide) return list

          // 넓은 화면: 좌 목록 / 우 요약(읽기전용, 첫 항목 자동선택).
          const selCounts = selectedProject
            ? counts[selectedProject.id] ?? { total: 0, done: 0 }
            : { total: 0, done: 0 }
          return (
            <div className="grid grid-cols-1 gap-5 min-[740px]:grid-cols-[1fr_1.1fr]">
              <div className="min-w-0">{list}</div>
              <div className="min-w-0">
                <div
                  className="sticky top-[120px] rounded-2xl border border-line bg-surface p-5"
                  style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}
                >
                  {selectedProject ? (
                    <ProjectSummary p={selectedProject} counts={selCounts} detailSuffix={detailSuffix} />
                  ) : (
                    <p className="py-10 text-center text-sm text-faint">
                      왼쪽에서 프로젝트를 선택하세요.
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
