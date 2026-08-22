'use client'

// MFH-JOURNAL-LIST-V3
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { JournalEntry, Project, Task } from '@/lib/types'
import { canEditEntry, isMaster, PORTFOLIO_OWNER_ID, type MembersMap } from '@/lib/members'
import AuthorBadge from '@/components/AuthorBadge'
import MarkdownText, { stripMarkdown } from '@/components/MarkdownText'
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
import JournalFlagsToggle, { flagIcon, FLAG_COLOR } from './JournalFlagsToggle'
import PhotoCollage, { type CollagePhoto } from './PhotoCollage'
import {
  bulkUpdateJournals,
  bulkDeleteJournals,
  type JournalBulkPatch,
} from '@/lib/bulkUpdate'

// 비공개·비밀글 배지(patch102) — 라인 아이콘. 비밀글은 RLS 로 작성자·마스터에게만 행이 오므로 마스터 화면에서만 보인다.
function PrivacyBadges({ e }: { e: JournalEntry }) {
  if (!e.is_secret && !e.is_private) return null
  return (
    <>
      {e.is_secret && (
        <span
          className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide"
          style={{ color: FLAG_COLOR.secret, background: 'rgba(102,31,32,0.09)' }}
        >
          {flagIcon.eyeOff} 비밀글
        </span>
      )}
      {e.is_private && (
        <span
          className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide"
          style={{ color: FLAG_COLOR.private, background: 'rgba(176,138,74,0.13)' }}
        >
          {flagIcon.lock} 비공개
        </span>
      )}
    </>
  )
}

// 일지 카드 본문(날짜 + 카테고리 칩 + 제목 + 발췌). 사진·메타칩·기도후보는 renderItem 에서.
function EntryBody({ e }: { e: JournalEntry }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-sm font-bold tracking-tight text-muted">{e.entry_date}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <PrivacyBadges e={e} />
          {e.category && (
            <span className="shrink-0 rounded-lg bg-surface-subtle px-2.5 py-1 text-[11px] font-bold tracking-wide text-primary">
              {e.category}
            </span>
          )}
        </span>
      </div>
      <h2 className="mt-3 text-[19px] font-bold leading-[1.3] text-ink">{e.headline || '(제목 없음)'}</h2>
      {e.today && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{stripMarkdown(e.today)}</p>}
    </>
  )
}

// 카드 하단 메타 칩(연계 프로젝트·할일·장소·작성자). 아이콘 + 라벨. iconColor 면 아이콘만 종류색(③ 절제 스타일).
function MetaChip({ icon, label, iconColor }: { icon: React.ReactNode; label: string; iconColor?: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-medium text-muted">
      <span className={`shrink-0 ${iconColor ? '' : 'text-faint'}`} style={iconColor ? { color: iconColor } : undefined}>{icon}</span>
      <span className="max-w-[140px] truncate">{label}</span>
    </span>
  )
}

const metaIcon = {
  project: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
  ),
  task: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
  ),
  place: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
  ),
  user: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  ),
}

// 메타칩 아이콘색(③ 절제 스타일) — 브랜드 어스톤 + 작성자만 청/로즈로 구별. 동적 클래스 회피 위해 hex 직접.
const META_ICON_COLOR = {
  project: '#B05744',
  task: '#B08A4A',
  place: '#9A9A98',
  authorMaster: '#5E82A6',
  authorOther: '#C56A7E',
} as const

// 요약 패널(읽기전용). 넓은 화면 우측. '상세' → /journal/[id], '편집' → /journal/[id]/edit.
function EntrySummary({
  e,
  detailSuffix,
  authorName,
  canEdit,
}: {
  e: JournalEntry
  detailSuffix: string
  authorName?: string
  canEdit: boolean
}) {
  const Section = ({ label, text }: { label: string; text: string | null }) =>
    text ? (
      <div className="py-2">
        <div className="mb-1 text-xs font-semibold text-faint">{label}</div>
        <MarkdownText text={text} className="text-sm leading-relaxed text-ink" />
      </div>
    ) : null
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted">{e.entry_date}</span>
            <AuthorBadge name={authorName} />
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
            <PrivacyBadges e={e} />
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
          {canEdit && (
            <Link
              href={`/journal/${e.id}/edit`}
              className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            >
              편집
            </Link>
          )}
        </div>
      </div>

      <div className="mt-3 divide-y divide-line border-t border-line">
        <Section label="🌿 오늘의 기록" text={e.today} />
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
  membersMap = {},
  currentUserId,
  photoMap = {},
}: {
  entries: JournalEntry[]
  // 일괄변경의 '연계 프로젝트/할일' chip 옵션. page.tsx 가 함께 select 해서 주입.
  projects?: Pick<Project, 'id' | 'title'>[]
  tasks?: Pick<Task, 'id' | 'title' | 'done'>[]
  membersMap?: MembersMap
  currentUserId?: string
  // 카드 사진 미리보기 — page.tsx 가 서명 URL 로 변환해 주입(일지 id → 사진 배열).
  photoMap?: Record<string, CollagePhoto[]>
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
  const [fAuthor, setFAuthor] = useState<string[]>(initial.fAuthor)
  const [prayerOnly, setPrayerOnly] = useState(initial.prayerOnly)
  const [dateFrom, setDateFrom] = useState(initial.dateFrom)
  const [dateTo, setDateTo] = useState(initial.dateTo)
  const [asc, setAsc] = useState(initial.asc)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const wide = useWideScreen()

  // 다중선택 모드 (모듈 무관 hook). selectMode 진입시 카드 탭=토글.
  const sel = useSelectionMode()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const f: JournalFilter = { q, fCategory, fAuthor, prayerOnly, dateFrom, dateTo, asc }
    const qs = buildJournalQuery(f)
    const current = searchParams.toString()
    if (qs === current) return
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [q, fCategory, fAuthor, prayerOnly, dateFrom, dateTo, asc, pathname, router, searchParams])

  const categoryOpts = useMemo(
    () =>
      Array.from(
        new Set(entries.map((e) => e.category).filter((c): c is string => !!c)),
      ).sort(),
    [entries],
  )

  // 카드 메타 칩용 id → 제목 매핑.
  const projMap = useMemo(
    () => Object.fromEntries((projects ?? []).map((p) => [p.id, p.title])),
    [projects],
  )
  const taskMap = useMemo(
    () => Object.fromEntries((tasks ?? []).map((t) => [t.id, t.title])),
    [tasks],
  )

  // 작성자 옵션: 멤버 전원(고정 2명). 데이터에 글이 없는 작성자도 칩으로 노출 —
  // 멤버 공유 앱이라 작성자=멤버. 마스터(김우진) 먼저.
  const authorOpts = useMemo(
    () =>
      Object.entries(membersMap)
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) =>
          a.id === PORTFOLIO_OWNER_ID ? -1 : b.id === PORTFOLIO_OWNER_ID ? 1 : a.name.localeCompare(b.name),
        ),
    [membersMap],
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
    () => applyJournalFilter(entries, { q, fCategory, fAuthor, prayerOnly, dateFrom, dateTo, asc }),
    [entries, q, fCategory, fAuthor, prayerOnly, dateFrom, dateTo, asc],
  )

  const detailQuery = useMemo(
    () => buildJournalQuery({ q, fCategory, fAuthor, prayerOnly, dateFrom, dateTo, asc }),
    [q, fCategory, fAuthor, prayerOnly, dateFrom, dateTo, asc],
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

  const activeCount =
    (q ? 1 : 0) +
    fCategory.length +
    fAuthor.length +
    (prayerOnly ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0)
  const hasFilter = activeCount > 0
  const canReset = hasFilter || asc

  function resetAll() {
    setQ('')
    setFCategory([])
    setFAuthor([])
    setPrayerOnly(false)
    setDateFrom('')
    setDateTo('')
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
    const photos = photoMap[e.id] ?? []
    const projTitle = e.project_id ? (projMap[e.project_id] ?? null) : null
    const taskTitle = e.task_id ? (taskMap[e.task_id] ?? null) : null
    const authorName = membersMap[e.user_id]
    const emphasized = (inSelectMode && checked) || isSel

    return (
      <li
        key={e.id}
        className={`relative flex flex-col rounded-[24px] border bg-surface p-5 shadow-[0_4px_18px_-6px_rgba(34,34,34,0.16)] ${
          emphasized ? 'border-primary border-2' : 'border-line'
        }`}
      >
        {/* selectMode 체크박스 — 좌상단 겹침(본문은 pl-8 로 자리 확보). */}
        {inSelectMode && (
          <div className="absolute left-2.5 top-2.5 z-10">
            <SelectionCheckbox checked={checked} />
          </div>
        )}

        {/* 본문(날짜·카테고리·제목·발췌) = 클릭 영역. selectMode=토글 / 넓은화면=요약선택 / 좁은화면=상세 Link. */}
        {inSelectMode ? (
          <button type="button" onClick={() => sel.toggleId(e.id)} className="block w-full pl-8 text-left">
            <EntryBody e={e} />
          </button>
        ) : wide ? (
          <button type="button" onClick={() => setSelectedId(e.id)} className="block w-full text-left">
            <EntryBody e={e} />
          </button>
        ) : (
          <Link href={`/journal/${e.id}${detailSuffix}`} className="block">
            <EntryBody e={e} />
          </Link>
        )}

        {/* 사진 콜라주(있을 때) — 라이트박스 포함, 본문 클릭 영역과 분리. */}
        {photos.length > 0 && (
          <div className="mt-3.5">
            <PhotoCollage photos={photos} />
          </div>
        )}

        {/* 하단: 메타 칩(연계 프로젝트·할일·장소·작성자) + 기도후보 토글. */}
        <div className="mt-3.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-2">
            {authorName && (
              <MetaChip
                icon={metaIcon.user}
                label={authorName}
                iconColor={e.user_id === PORTFOLIO_OWNER_ID ? META_ICON_COLOR.authorMaster : META_ICON_COLOR.authorOther}
              />
            )}
            {e.place_name && <MetaChip icon={metaIcon.place} label={e.place_name} iconColor={META_ICON_COLOR.place} />}
            {projTitle && <MetaChip icon={metaIcon.project} label={projTitle} iconColor={META_ICON_COLOR.project} />}
            {taskTitle && <MetaChip icon={metaIcon.task} label={taskTitle} iconColor={META_ICON_COLOR.task} />}
          </div>
          <JournalFlagsToggle
            id={e.id}
            flags={{
              prayer_candidate: e.prayer_candidate,
              is_private: e.is_private,
              is_secret: e.is_secret,
            }}
            canEdit={canEditEntry(e.user_id, currentUserId)}
            showSecret={isMaster(currentUserId)}
          />
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
            filterOpen || fCategory.length > 0 || fAuthor.length > 0 || prayerOnly || dateFrom || dateTo
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
          {/* MFH-JOURNAL-DATE-FILTER */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold text-faint">날짜</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(ev) => setDateFrom(ev.target.value)}
              className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink focus:border-primary focus:outline-none"
              aria-label="시작 날짜"
            />
            <span className="text-[11px] text-faint">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(ev) => setDateTo(ev.target.value)}
              className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink focus:border-primary focus:outline-none"
              aria-label="종료 날짜"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                }}
                className="rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-muted transition hover:border-primary"
              >
                지우기
              </button>
            )}
          </div>
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
          {authorOpts.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-faint">작성자</span>
              {authorOpts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setFAuthor((arr) => toggle(arr, a.id))}
                  className={`${chip} ${fAuthor.includes(a.id) ? chipOn : ''}`}
                >
                  {a.name}
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
              <EntrySummary
                e={selectedEntry}
                detailSuffix={detailSuffix}
                authorName={membersMap[selectedEntry.user_id]}
                canEdit={canEditEntry(selectedEntry.user_id, currentUserId)}
              />
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
