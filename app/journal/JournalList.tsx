'use client'

// MFH-JOURNAL-LIST-V2
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { JournalEntry, Project, Task } from '@/lib/types'
import { chip, chipOn, toggle } from '@/lib/statusChip'
import {
  applyJournalFilter,
  buildJournalQuery,
  parseJournalFilter,
  type JournalFilter,
} from '@/lib/journalFilter'
import { useWideScreen } from '@/lib/useWideScreen'
import { useSelectionMode } from '@/lib/useSelectionMode'
import SelectionCheckbox from '@/components/SelectionCheckbox'
import SelectionBar from '@/components/SelectionBar'
import JournalBulkPanel from './JournalBulkPanel'
import PrayerCandidateToggle from './PrayerCandidateToggle'
import {
  bulkUpdateJournals,
  bulkDeleteJournals,
  type JournalBulkPatch,
} from '@/lib/bulkUpdate'

// 일지 카드 본문(날짜·배지·머리말·오늘).
function EntryBody({ e }: { e: JournalEntry }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted">{e.entry_date}</span>
        {e.place_name && (
          <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">
            📍 {e.place_name}
          </span>
        )}
        {e.category && (
          <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">
            {e.category}
          </span>
        )}
      </div>
      <div className="mt-1 font-bold text-ink">{e.headline || '(제목 없음)'}</div>
      {e.today && <div className="mt-1 line-clamp-2 text-sm text-muted">{e.today}</div>}
    </>
  )
}

// 요약 패널(읽기전용). 넓은 화면 우측. '상세' → /journal/[id], '편집' → /journal/[id]/edit.
function EntrySummary({ e, detailSuffix }: { e: JournalEntry; detailSuffix: string }) {
  const Section = ({ label, text }: { label: string; text: string | null }) =>
    text ? (
      <div className="py-2">
        <div className="mb-1 text-xs font-semibold text-faint">{label}</div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{text}</p>
      </div>
    ) : null
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted">{e.entry_date}</span>
            {e.place_name && (
              <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">
                📍 {e.place_name}
              </span>
            )}
            {e.category && (
              <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">
                {e.category}
              </span>
            )}
            {e.prayer_candidate && (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary">
                기도후보
              </span>
            )}
          </div>
          <h2 className="mt-1.5 text-lg font-bold text-ink">{e.headline || '(제목 없음)'}</h2>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Link
            href={`/journal/${e.id}${detailSuffix}`}
            className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary"
          >
            상세
          </Link>
          <Link
            href={`/journal/${e.id}/edit`}
            className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          >
            편집
          </Link>
        </div>
      </div>

      <div className="mt-3 divide-y divide-line border-t border-line">
        <Section label="🌿 오늘 있었던 일" text={e.today} />
        <Section label="🙏 감사·응답" text={e.thanks} />
        <Section label="💭 묵상·깨달음" text={e.meditation} />
        <Section label="📌 기도제목" text={e.prayer} />
      </div>
    </div>
  )
}

export default function JournalList({
  entries,
  projects,
  tasks,
}: {
  entries: JournalEntry[]
  // 일괄변경의 '연계 프로젝트/할일' chip 옵션. page.tsx 가 함께 select 해서 주입.
  projects?: Pick<Project, 'id' | 'title'>[]
  tasks?: Pick<Task, 'id' | 'title' | 'done'>[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initial = useMemo(
    () => parseJournalFilter(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [q, setQ] = useState(initial.q)
  const [fCategory, setFCategory] = useState<string[]>(initial.fCategory)
  const [prayerOnly, setPrayerOnly] = useState(initial.prayerOnly)
  const [asc, setAsc] = useState(initial.asc)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const wide = useWideScreen()

  // 다중선택 모드 (모듈 무관 hook). selectMode 진입시 카드 탭=토글.
  const sel = useSelectionMode()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const f: JournalFilter = { q, fCategory, prayerOnly, asc }
    const qs = buildJournalQuery(f)
    const current = searchParams.toString()
    if (qs === current) return
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [q, fCategory, prayerOnly, asc, pathname, router, searchParams])

  const categoryOpts = useMemo(
    () =>
      Array.from(
        new Set(entries.map((e) => e.category).filter((c): c is string => !!c)),
      ).sort(),
    [entries],
  )

  // 일괄변경용: 연계 프로젝트 (모두) / 연계 할일 (미완료만, 노이즈 축소). 알파벳 정렬.
  const projectOpts = useMemo(
    () =>
      (projects ?? [])
        .map((p) => ({ id: p.id, title: p.title }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [projects],
  )
  const taskOpts = useMemo(
    () =>
      (tasks ?? [])
        .filter((t) => !t.done)
        .map((t) => ({ id: t.id, title: t.title }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [tasks],
  )

  const filtered = useMemo(
    () => applyJournalFilter(entries, { q, fCategory, prayerOnly, asc }),
    [entries, q, fCategory, prayerOnly, asc],
  )

  const detailQuery = useMemo(
    () => buildJournalQuery({ q, fCategory, prayerOnly, asc }),
    [q, fCategory, prayerOnly, asc],
  )
  const detailSuffix = detailQuery ? `?${detailQuery}` : ''

  useEffect(() => {
    if (!wide) {
      setSelectedId(null)
      return
    }
    setSelectedId((cur) => {
      if (cur && filtered.some((e) => e.id === cur)) return cur
      return filtered[0]?.id ?? null
    })
  }, [wide, filtered])

  const selectedEntry = useMemo(
    () => filtered.find((e) => e.id === selectedId) ?? null,
    [filtered, selectedId],
  )

  const activeCount = (q ? 1 : 0) + fCategory.length + (prayerOnly ? 1 : 0)
  const hasFilter = activeCount > 0
  const canReset = hasFilter || asc

  function resetAll() {
    setQ('')
    setFCategory([])
    setPrayerOnly(false)
    setAsc(false)
  }

  // ───── 일괄변경 액션 ─────
  const filteredIds = useMemo(() => filtered.map((e) => e.id), [filtered])
  const allSelected =
    sel.count > 0 && filteredIds.length > 0 && filteredIds.every((id) => sel.selected.has(id))

  async function runBulk(patch: JournalBulkPatch) {
    if (busy || sel.count === 0) return
    setBusy(true)
    try {
      const ids = Array.from(sel.selected)
      const res = await bulkUpdateJournals(ids, patch)
      if (!res.ok) {
        alert(`변경 실패: ${res.error ?? '알 수 없는 오류'}`)
        setBusy(false)
        return
      }
      sel.exit()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function runDelete() {
    if (busy || sel.count === 0) return
    if (!confirm(`${sel.count}개 일지를 정말 삭제할까요? 이 작업은 되돌릴 수 없습니다.`))
      return
    setBusy(true)
    try {
      const ids = Array.from(sel.selected)
      const res = await bulkDeleteJournals(ids)
      if (!res.ok) {
        alert(`삭제 실패: ${res.error ?? '알 수 없는 오류'}`)
        setBusy(false)
        return
      }
      sel.exit()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  function toggleAll() {
    if (allSelected) sel.clear()
    else sel.selectAll(filteredIds)
  }

  if (entries.length === 0) {
    return (
      <p className="mt-16 text-center text-sm leading-relaxed text-faint">
        아직 일지가 없습니다.
        <br />첫 일지를 기록해 보세요.
      </p>
    )
  }

  function renderItem(e: JournalEntry) {
    const isSel = wide && e.id === selectedId && !sel.selectMode
    const checked = sel.isSelected(e.id)
    const inSelectMode = sel.selectMode

    return (
      <li
        key={e.id}
        className={`relative flex items-start gap-3 rounded-2xl border bg-surface px-4 py-3 ${
          inSelectMode && checked
            ? 'border-primary border-2'
            : isSel
              ? 'border-primary border-2'
              : 'border-line'
        }`}
      >
        {/* 좌측: selectMode 일 때만 선택 체크박스(평소엔 자리 없음). */}
        {inSelectMode && (
          <div className="pt-0.5">
            <SelectionCheckbox checked={checked} />
          </div>
        )}

        {/* 본문 영역: selectMode 면 button(토글), 넓은화면 button(요약선택), 좁은화면 Link(상세).
            우측 기도후보 영역 자리 확보를 위해 pr-20. */}
        {inSelectMode ? (
          <button
            type="button"
            onClick={() => sel.toggleId(e.id)}
            className="min-w-0 flex-1 pr-20 text-left"
          >
            <EntryBody e={e} />
          </button>
        ) : wide ? (
          <button
            type="button"
            onClick={() => setSelectedId(e.id)}
            className="min-w-0 flex-1 pr-20 text-left"
          >
            <EntryBody e={e} />
          </button>
        ) : (
          <Link
            href={`/journal/${e.id}${detailSuffix}`}
            className="min-w-0 flex-1 pr-20"
          >
            <EntryBody e={e} />
          </Link>
        )}

        {/* 우측 상단: "기도후보" 라벨 + 토글 (단건 즉시 update, button 중첩 회피 위해 li 직속 absolute) */}
        <div className="absolute right-4 top-3 flex shrink-0 items-center gap-1.5">
          <span className="text-[11px] font-semibold text-faint">기도후보</span>
          <PrayerCandidateToggle id={e.id} candidate={e.prayer_candidate} />
        </div>
      </li>
    )
  }

  // 컨트롤 바: 검색창 + 필터 토글 + 정렬(날짜) 토글 + 선택 토글 (+ 전체선택/초기화) (sticky)
  const controls = (
    <div
      className="sticky top-[64px] z-20 -mx-5 mb-3 space-y-2 px-5 py-2"
      style={{ background: 'var(--paper)' }}
    >
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            placeholder="일지 검색 (머리말·본문·기도제목·장소)"
            className="w-full rounded-xl border border-line bg-surface py-1.5 pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            filterOpen || fCategory.length > 0 || prayerOnly
              ? 'border-primary text-primary'
              : 'border-line text-muted hover:border-primary'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          필터
        </button>
        <button
          type="button"
          onClick={() => setAsc((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-primary"
        >
          날짜 {asc ? '↑' : '↓'}
        </button>
        <button
          type="button"
          onClick={sel.toggleMode}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            sel.selectMode
              ? 'border-primary bg-primary text-white'
              : 'border-line text-muted hover:border-primary'
          }`}
          aria-pressed={sel.selectMode}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          {sel.selectMode ? '선택 종료' : '선택'}
        </button>
        {sel.selectMode && (
          <button
            type="button"
            onClick={toggleAll}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-primary"
          >
            {allSelected ? '전체 해제' : '전체 선택'}
          </button>
        )}
        {canReset && !sel.selectMode && (
          <button
            type="button"
            onClick={resetAll}
            className="flex shrink-0 items-center gap-1 rounded-xl border border-accent px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent-soft"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            초기화
          </button>
        )}
      </div>

      {filterOpen && (
        <div className="space-y-2 rounded-xl border border-line bg-surface-subtle p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold text-faint">기도</span>
            <button
              type="button"
              onClick={() => setPrayerOnly((v) => !v)}
              className={`${chip} ${prayerOnly ? chipOn : ''}`}
            >
              기도후보만
            </button>
          </div>
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
    </div>
  )

  if (filtered.length === 0) {
    return (
      <>
        {controls}
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          조건에 맞는 일지가 없습니다.
        </p>
      </>
    )
  }

  const list = <ul className="space-y-3">{filtered.map(renderItem)}</ul>

  // sticky bar 가림 방지용 하단 여백(selectMode 일 때만)
  const bottomPad = sel.selectMode && sel.count > 0 ? 'pb-32' : ''

  // 좁은 화면: 컨트롤 + 목록.
  if (!wide)
    return (
      <>
        {controls}
        <div className={bottomPad}>{list}</div>
        {sel.selectMode && sel.count > 0 && (
          <SelectionBar
            count={sel.count}
            onCancel={sel.exit}
            onSelectAll={toggleAll}
            allSelected={allSelected}
          >
            <JournalBulkActionsRow
              busy={busy}
              categoryOpts={categoryOpts}
              projectOpts={projectOpts}
              taskOpts={taskOpts}
              onCategory={(c) => runBulk({ category: c })}
              onPrayerCandidate={(v) => runBulk({ prayer_candidate: v })}
              onProject={(id) => runBulk({ project_id: id })}
              onTask={(id) => runBulk({ task_id: id })}
              onDelete={runDelete}
            />
          </SelectionBar>
        )}
      </>
    )

  // 넓은 화면: 컨트롤 + 좌 목록 / 우(평소=요약 / selectMode=일괄변경 패널).
  return (
    <>
      {controls}
      <div className={`grid grid-cols-1 gap-5 min-[740px]:grid-cols-[1fr_1.1fr] ${bottomPad}`}>
        <div className="min-w-0">{list}</div>
        <div className="min-w-0">
          <div
            className="sticky top-[120px] rounded-2xl border border-line bg-surface p-5"
            style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}
          >
            {sel.selectMode ? (
              sel.count > 0 ? (
                <JournalBulkPanel
                  count={sel.count}
                  busy={busy}
                  categoryOpts={categoryOpts}
                  projectOpts={projectOpts}
                  taskOpts={taskOpts}
                  onCategory={(c) => runBulk({ category: c })}
                  onPrayerCandidate={(v) => runBulk({ prayer_candidate: v })}
                  onProject={(id) => runBulk({ project_id: id })}
                  onTask={(id) => runBulk({ task_id: id })}
                  onDelete={runDelete}
                />
              ) : (
                <p className="py-10 text-center text-sm text-faint">
                  왼쪽에서 일지를 선택하세요.
                  <br />
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-primary"
                  >
                    보이는 항목 전체 선택
                  </button>
                </p>
              )
            ) : selectedEntry ? (
              <EntrySummary e={selectedEntry} detailSuffix={detailSuffix} />
            ) : (
              <p className="py-10 text-center text-sm text-faint">왼쪽에서 일지를 선택하세요.</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// 좁은화면 SelectionBar 내부 액션 chip row. JournalBulkPanel 과 동일 액션을 컴팩트하게.
function JournalBulkActionsRow({
  busy,
  categoryOpts,
  projectOpts,
  taskOpts,
  onCategory,
  onPrayerCandidate,
  onProject,
  onTask,
  onDelete,
}: {
  busy: boolean
  categoryOpts: string[]
  projectOpts: { id: string; title: string }[]
  taskOpts: { id: string; title: string }[]
  onCategory: (c: string | null) => void
  onPrayerCandidate: (v: boolean) => void
  onProject: (id: string | null) => void
  onTask: (id: string | null) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState<null | 'cat' | 'prayer' | 'proj' | 'task'>(null)
  const Btn = ({
    children,
    on,
    onClick,
  }: {
    children: React.ReactNode
    on?: boolean
    onClick: () => void
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${
        on
          ? 'border-primary bg-primary text-white'
          : 'border-line text-muted hover:border-primary'
      }`}
    >
      {children}
    </button>
  )

  function tap(kind: 'cat' | 'prayer' | 'proj' | 'task') {
    setOpen((cur) => (cur === kind ? null : kind))
  }

  function applyAndClose<T>(fn: (v: T) => void, v: T) {
    setOpen(null)
    fn(v)
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      <Btn on={open === 'prayer'} onClick={() => tap('prayer')}>
        기도후보
      </Btn>
      {categoryOpts.length > 0 && (
        <Btn on={open === 'cat'} onClick={() => tap('cat')}>
          분류
        </Btn>
      )}
      {projectOpts.length > 0 && (
        <Btn on={open === 'proj'} onClick={() => tap('proj')}>
          프로젝트
        </Btn>
      )}
      {taskOpts.length > 0 && (
        <Btn on={open === 'task'} onClick={() => tap('task')}>
          할일
        </Btn>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="rounded-lg border border-accent px-2.5 py-1.5 text-[11px] font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-50"
      >
        삭제
      </button>

      {/* 펼침 패널: 액션 row 위에 떠 있는 작은 시트 (이 div 기준 absolute) */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2">
          <div
            className="max-h-72 overflow-y-auto rounded-xl border border-line p-3 shadow-lg"
            style={{ background: 'var(--paper)' }}
          >
            {open === 'prayer' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-faint">기도후보 변경</span>
                <Btn onClick={() => applyAndClose(onPrayerCandidate, true)}>ON</Btn>
                <Btn onClick={() => applyAndClose(onPrayerCandidate, false)}>OFF</Btn>
              </div>
            )}
            {open === 'cat' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-faint">사역분류 변경</span>
                {categoryOpts.map((c) => (
                  <Btn key={c} onClick={() => applyAndClose(onCategory, c)}>
                    {c}
                  </Btn>
                ))}
                <Btn onClick={() => applyAndClose(onCategory, null)}>분류 제거</Btn>
              </div>
            )}
            {open === 'proj' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-faint">
                  연계 프로젝트 (기존 덮어씀)
                </span>
                {projectOpts.map((p) => (
                  <Btn key={p.id} onClick={() => applyAndClose(onProject, p.id)}>
                    {p.title}
                  </Btn>
                ))}
                <Btn onClick={() => applyAndClose(onProject, null)}>연결 없음</Btn>
              </div>
            )}
            {open === 'task' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-faint">
                  연계 할일 (기존 덮어씀 · 미완료만)
                </span>
                {taskOpts.map((t) => (
                  <Btn key={t.id} onClick={() => applyAndClose(onTask, t.id)}>
                    {t.title}
                  </Btn>
                ))}
                <Btn onClick={() => applyAndClose(onTask, null)}>연결 없음</Btn>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
