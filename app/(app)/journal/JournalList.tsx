'use client'

// MFH-JOURNAL-LIST-V5 — 실기 피드백: 모바일 = 흰 카드(M1: 분류 틴트 알약 · 날짜 · 제목 17/600 · 발췌 2줄 · 사진 콜라주 · 메타 칩 · 켜진 플래그만) /
//   넓은 화면 = 2줄 행 + 사진 1장 유지 · 플래그 배지 전체 이름(켜진 것만) · 월 머리줄 = 월 · 건수 + 분류 비중 띠.
// MFH-JOURNAL-LIST-V4 — 2027(4-1, 목록 A): 2줄 행(분류 색 사각형 · 제목+플래그 배지 / MM/DD·장소·분류) + 오른쪽 사진 썸네일 · 월 머리줄 ·
//   필터 = 연회색 면(흰 검색 알약 · 흰 칩 · 선택 남색) · 넓은 화면 요약 = 2027 섹션(기도제목 일지 틴트). 행별 플래그 토글은 상세로.
// MFH-JOURNAL-LIST-V3
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { JournalEntry, Project, Task } from '@/lib/types'
import { canEditEntry, PORTFOLIO_OWNER_ID, type MembersMap } from '@/lib/members'
import { JOURNAL_CATEGORY_BLOCK } from '@/lib/constants'
import { blockColor, blockTint, brand2027 } from '@/lib/palette'
import AuthorBadge from '@/components/AuthorBadge'
import MarkdownText, { stripMarkdown } from '@/components/MarkdownText'
import { chip, chipOn, toggle } from '@/lib/statusChip'
import {
  JOURNAL_CATEGORY_NONE,
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
import { FLAG_COLOR, FLAG_SOFT } from './JournalFlagsToggle'
import PhotoCollage, { type CollagePhoto } from './PhotoCollage'
import {
  bulkUpdateJournals,
  bulkDeleteJournals,
  type JournalBulkPatch,
} from '@/lib/bulkUpdate'

// 기도후보·비공개·비밀글 배지 — 켜진 것만, 플래그 틴트 면 + 진한 톤 글자. size md = 모바일 카드(✓ 포함), sm = 행 제목 옆.
// 비밀글은 RLS 로 작성자·마스터에게만 행이 온다.
function PrivacyBadges({ e, size = 'sm' }: { e: JournalEntry; size?: 'sm' | 'md' }) {
  if (!e.is_secret && !e.is_private && !e.prayer_candidate) return null
  const cls =
    size === 'md'
      ? 'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11.5px] font-medium leading-tight'
      : 'inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[10.5px] font-medium leading-tight'
  const Badge = ({ kind, label }: { kind: keyof typeof FLAG_COLOR; label: string }) => (
    <span className={cls} style={{ color: FLAG_COLOR[kind], background: FLAG_SOFT[kind] }}>
      {size === 'md' && '✓ '}
      {label}
    </span>
  )
  return (
    <>
      {e.prayer_candidate && <Badge kind="prayer" label="기도후보" />}
      {e.is_private && <Badge kind="private" label="비공개" />}
      {e.is_secret && <Badge kind="secret" label="비밀글" />}
    </>
  )
}

const DOW = ['일', '월', '화', '수', '목', '금', '토']
// 'YYYY-MM-DD' → '10/20 (월)'
function mdDow(d: string | null): string {
  if (!d) return ''
  const [y, m, day] = d.split('-').map(Number)
  if (!y || !m || !day) return d
  return `${m}/${day} (${DOW[new Date(Date.UTC(y, m - 1, day)).getUTCDay()]})`
}

// 분류 틴트 알약 — 분류 색 면 + 진한 톤 글자 + 8px 색 사각형. 분류 없으면 그리지 않는다.
function CategoryPill({ category }: { category: string | null }) {
  if (!category) return null
  const n = JOURNAL_CATEGORY_BLOCK[category]
  const { tint, deep } = n ? blockTint(n) : { tint: brand2027.card, deep: brand2027.muted }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: tint, color: deep }}>
      <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: n ? blockColor(n).bg : brand2027.line }} aria-hidden="true" />
      {category}
    </span>
  )
}

// 모바일 카드 본문(분류 · 날짜 / 제목 / 발췌). 콜라주·메타·플래그는 renderItem 에서.
function EntryCardBody({ e }: { e: JournalEntry }) {
  return (
    <span className="flex flex-col gap-2">
      <span className="flex items-center justify-between gap-2">
        <CategoryPill category={e.category} />
        <span className="ml-auto shrink-0 font-num text-[12px] text-b27-muted">{mdDow(e.entry_date)}</span>
      </span>
      <span className="text-[17px] font-semibold leading-snug text-b27-ink">{e.headline || '(제목 없음)'}</span>
      {e.today && (
        <span className="line-clamp-2 text-[13.5px] leading-relaxed text-[#4A5072]">{stripMarkdown(e.today)}</span>
      )}
    </span>
  )
}

// 분류 색 사각형(9px) — 분류 없으면 연회색.
function CategorySquare({ category }: { category: string | null }) {
  const n = category ? JOURNAL_CATEGORY_BLOCK[category] : undefined
  return (
    <span
      className="mt-[7px] inline-block h-[9px] w-[9px] shrink-0 rounded-[3px]"
      style={{ background: n ? blockColor(n).bg : brand2027.line }}
      aria-hidden="true"
    />
  )
}

// 2줄 행 본문 — 제목(+플래그 배지) / MM/DD · 장소 · 분류 · 작성자(다른 사람 글만).
function EntryRow({ e, authorName }: { e: JournalEntry; authorName?: string }) {
  const md = e.entry_date ? `${Number(e.entry_date.slice(5, 7))}/${Number(e.entry_date.slice(8, 10))}` : ''
  const sub = [md, e.place_name, e.category, authorName].filter(Boolean).join(' · ')
  return (
    <span className="flex min-w-0 flex-1 gap-3">
      <CategorySquare category={e.category} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-[15px] font-medium leading-snug text-b27-ink">{e.headline || '(제목 없음)'}</span>
          <PrivacyBadges e={e} />
        </span>
        <span className="mt-0.5 block truncate font-num text-[12px] text-b27-muted">{sub}</span>
      </span>
    </span>
  )
}

// 행 오른쪽 사진 썸네일(52px) + 장수.
function RowThumb({ photos }: { photos: CollagePhoto[] }) {
  if (photos.length === 0) return null
  const p = photos[0]
  return (
    <span className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[10px] bg-b27-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.thumb_url || p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
      {photos.length > 1 && (
        <span className="absolute bottom-[3px] right-[3px] rounded-md bg-[rgba(43,49,96,0.55)] px-1 font-num text-[10px] font-semibold text-white">
          {photos.length}
        </span>
      )}
    </span>
  )
}

// 월 머리줄 — 월(Manrope 15/600) · 건수 + 그달 분류 비중 띠(분류 색 막대, 건수 비례). 분류 없음은 연회색.
function MonthHead({ label, items }: { label: string; items: JournalEntry[] }) {
  const counts = new Map<string, number>()
  for (const e of items) counts.set(e.category ?? '', (counts.get(e.category ?? '') ?? 0) + 1)
  const parts = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  return (
    <div className="flex flex-col gap-1.5 px-1 pb-2 pt-2.5">
      <div className="flex items-baseline justify-between">
        <span className="font-num text-[15px] font-semibold text-b27-ink">{label}</span>
        <span className="font-num text-[12px] tabular-nums text-b27-muted">{items.length}건</span>
      </div>
      <div className="flex h-1.5 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={parts.map(([c, n]) => `${c || '분류 없음'} ${n}`).join(', ')}>
        {parts.map(([c, n]) => {
          const b = c ? JOURNAL_CATEGORY_BLOCK[c] : undefined
          return <span key={c || '_'} style={{ flex: n, background: b ? blockColor(b).bg : brand2027.line }} />
        })}
      </div>
    </div>
  )
}

// 요약 패널(읽기전용). 넓은 화면 우측. '상세' → /journal/[id], '편집' → /journal/[id]/edit.
function EntrySummary({
  e,
  detailSuffix,
  authorName,
  canEdit,
  photos,
}: {
  e: JournalEntry
  detailSuffix: string
  authorName?: string
  canEdit: boolean
  photos: CollagePhoto[]
}) {
  const Section = ({ label, text, tint }: { label: string; text: string | null; tint?: boolean }) =>
    text ? (
      <div className={tint ? 'rounded-2xl bg-b27-tint-2 px-4 py-3' : 'py-1'}>
        <div className="mb-1 font-num text-[12px] font-medium text-b27-muted">{label}</div>
        <MarkdownText text={text} className="text-sm leading-relaxed text-b27-ink" />
      </div>
    ) : null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CategoryPill category={e.category} />
            <span className="font-num text-[12px] text-b27-muted">{mdDow(e.entry_date)}</span>
          </div>
          <h2 className="mt-1 text-lg font-semibold leading-snug text-b27-ink">{e.headline || '(제목 없음)'}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <AuthorBadge name={authorName} />
            {e.place_name && <span className="rounded-full bg-b27-card px-2 py-0.5 text-[11px] text-b27-muted">{e.place_name}</span>}
            <PrivacyBadges e={e} />
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Link
            href={`/journal/${e.id}${detailSuffix}`}
            className="rounded-full bg-b27-card px-3.5 py-2 text-xs font-medium text-b27-ink transition active:opacity-70"
          >
            상세
          </Link>
          {canEdit && (
            <Link
              href={`/journal/${e.id}/edit`}
              className="rounded-full bg-b27-ink px-4 py-2 text-xs font-medium text-white transition active:opacity-80"
            >
              편집
            </Link>
          )}
        </div>
      </div>

      {photos.length > 0 && <PhotoCollage photos={photos} />}

      <Section label="오늘의 기록" text={e.today} />
      <Section label="감사·응답" text={e.thanks} />
      <Section label="묵상·깨달음" text={e.meditation} />
      <Section label="기도제목" text={e.prayer} tint />
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

  // 사역 분류가 비어 있는 일지가 하나라도 있으면 '분류 없음' 칩 노출.
  const hasUncategorized = useMemo(() => entries.some((e) => !e.category), [entries])

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
      <p className="mt-16 text-center text-sm leading-relaxed text-b27-muted">
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
    // 작성자는 다른 사람 글일 때만 표시(본인 글은 생략).
    const authorName = e.user_id !== currentUserId ? membersMap[e.user_id] : undefined
    const emphasized = (inSelectMode && checked) || isSel

    // ── 모바일: 흰 카드(M1) ──
    if (!wide) {
      const projTitle = e.project_id ? (projMap[e.project_id] ?? null) : null
      const taskTitle = e.task_id ? (taskMap[e.task_id] ?? null) : null
      const hasFlags = e.prayer_candidate || e.is_private || e.is_secret
      const hasMeta = !!(e.place_name || projTitle || taskTitle || authorName)
      const metaCls = 'flex max-w-[180px] items-center gap-1.5 rounded-full bg-b27-card px-2.5 py-1 text-[11.5px] text-b27-ink'
      return (
        <li
          key={e.id}
          className={`relative flex flex-col gap-2.5 rounded-[20px] bg-b27-paper p-4 ${
            emphasized ? 'ring-2 ring-b27-ink' : 'ring-1 ring-b27-line'
          }`}
        >
          {inSelectMode ? (
            <button type="button" onClick={() => sel.toggleId(e.id)} className="flex w-full gap-3 text-left">
              <span className="mt-1 shrink-0">
                <SelectionCheckbox checked={checked} />
              </span>
              <EntryCardBody e={e} />
            </button>
          ) : (
            <Link href={`/journal/${e.id}${detailSuffix}`} className="block active:opacity-80">
              <EntryCardBody e={e} />
            </Link>
          )}
          {/* 사진 콜라주 — 라이트박스 포함, 본문 링크와 분리 */}
          {photos.length > 0 && <PhotoCollage photos={photos} />}
          {hasMeta && (
            <div className="flex flex-wrap gap-1.5">
              {e.place_name && (
                <span className={metaCls}>
                  <span className="truncate">{e.place_name}</span>
                </span>
              )}
              {projTitle && (
                <span className={metaCls}>
                  <span className="inline-block h-2 w-2 shrink-0 rounded-[2px]" style={{ background: blockColor(6).bg }} aria-hidden="true" />
                  <span className="truncate">{projTitle}</span>
                </span>
              )}
              {taskTitle && (
                <span className={metaCls}>
                  <span className="inline-block h-2 w-2 shrink-0 rounded-[2px]" style={{ background: blockColor(3).bg }} aria-hidden="true" />
                  <span className="truncate">{taskTitle}</span>
                </span>
              )}
              {authorName && (
                <span className={metaCls}>
                  <span className="truncate">{authorName}</span>
                </span>
              )}
            </div>
          )}
          {hasFlags && (
            <div className="flex flex-wrap gap-1.5">
              <PrivacyBadges e={e} size="md" />
            </div>
          )}
        </li>
      )
    }

    // ── 넓은 화면: 2줄 행 + 사진 1장 ──
    const inner = (
      <>
        {inSelectMode && (
          <span className="mt-0.5 shrink-0">
            <SelectionCheckbox checked={checked} />
          </span>
        )}
        <EntryRow e={e} authorName={authorName} />
        <RowThumb photos={photos} />
      </>
    )
    const rowCls = `flex w-full items-start gap-3 rounded-xl px-2 py-[11px] text-left transition active:opacity-70 ${
      emphasized ? 'bg-b27-card' : ''
    }`

    // selectMode=토글 / 넓은화면=요약선택.
    return (
      <li key={e.id} className="border-b border-b27-line last:border-b-0">
        {inSelectMode ? (
          <button type="button" onClick={() => sel.toggleId(e.id)} className={rowCls}>
            {inner}
          </button>
        ) : (
          <button type="button" onClick={() => setSelectedId(e.id)} className={rowCls}>
            {inner}
          </button>
        )}
      </li>
    )
  }

  // 월 머리줄 — 정렬 순서대로 같은 달끼리 묶는다(YYYY-MM). 다른 해면 연도까지.
  const thisYear = new Date().getFullYear()
  function monthLabel(ym: string) {
    const [y, m] = ym.split('-').map(Number)
    return y === thisYear ? `${m}월` : `${y}년 ${m}월`
  }

  // 컨트롤 바: 연회색 필터 면 — 흰 검색 알약 + 필터·날짜·선택(·전체선택/초기화) 흰 알약 (sticky, 헤더 52px 아래).
  const pillBtn = 'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition active:opacity-70'
  const pillOff = 'bg-b27-paper text-b27-muted'
  const pillOn = 'bg-b27-ink text-white'
  const filterActive = filterOpen || fCategory.length > 0 || fAuthor.length > 0 || prayerOnly || !!dateFrom || !!dateTo
  const controls = (
    <div className="sticky top-[52px] z-20 -mx-5 mb-2 bg-b27-paper px-5 pb-2 pt-1">
      <div className="space-y-2.5 rounded-2xl bg-b27-card p-2.5">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-b27-muted"
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            placeholder="제목·본문·기도제목·장소 검색"
            className="w-full rounded-full bg-b27-paper py-2 pl-9 pr-3 text-sm text-b27-ink placeholder:text-b27-muted focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setFilterOpen((v) => !v)} className={`${pillBtn} ${filterActive ? pillOn : pillOff}`} aria-expanded={filterOpen}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            필터{activeCount > (q ? 1 : 0) ? ` ${activeCount - (q ? 1 : 0)}` : ''}
          </button>
          <button type="button" onClick={() => setAsc((v) => !v)} className={`${pillBtn} ${pillOff}`}>
            날짜 {asc ? '↑' : '↓'}
          </button>
          <button type="button" onClick={sel.toggleMode} className={`${pillBtn} ${sel.selectMode ? pillOn : pillOff}`} aria-pressed={sel.selectMode}>
            {sel.selectMode ? '선택 종료' : '선택'}
          </button>
          {sel.selectMode && (
            <button type="button" onClick={toggleAll} className={`${pillBtn} ${pillOff}`}>
              {allSelected ? '전체 해제' : '전체 선택'}
            </button>
          )}
          {canReset && !sel.selectMode && (
            <button type="button" onClick={resetAll} className={`${pillBtn} ml-auto bg-transparent text-b27-muted`}>
              초기화
            </button>
          )}
        </div>

        {filterOpen && (
          <div className="space-y-2.5 border-t-2 border-b27-paper pt-2.5">
            {/* MFH-JOURNAL-DATE-FILTER */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 w-10 font-num text-[11px] font-medium text-b27-muted">날짜</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(ev) => setDateFrom(ev.target.value)}
                className="rounded-full bg-b27-paper px-3 py-1 text-xs text-b27-ink focus:outline-none"
                aria-label="시작 날짜"
              />
              <span className="text-[11px] text-b27-muted">~</span>
              <input
                type="date"
                value={dateTo}
                onChange={(ev) => setDateTo(ev.target.value)}
                className="rounded-full bg-b27-paper px-3 py-1 text-xs text-b27-ink focus:outline-none"
                aria-label="종료 날짜"
              />
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom('')
                    setDateTo('')
                  }}
                  className="px-2 py-1 text-[11px] text-b27-muted"
                >
                  지우기
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 w-10 font-num text-[11px] font-medium text-b27-muted">기도</span>
              <button type="button" onClick={() => setPrayerOnly((v) => !v)} className={`${chip} ${prayerOnly ? chipOn : ''}`}>
                기도후보만
              </button>
            </div>
            {authorOpts.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 w-10 font-num text-[11px] font-medium text-b27-muted">작성자</span>
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
            {(categoryOpts.length > 0 || hasUncategorized) && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 w-10 font-num text-[11px] font-medium text-b27-muted">분류</span>
                {categoryOpts.map((c) => {
                  const n = JOURNAL_CATEGORY_BLOCK[c]
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFCategory((a) => toggle(a, c))}
                      className={`${chip} ${fCategory.includes(c) ? chipOn : ''}`}
                    >
                      <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: n ? blockColor(n).bg : brand2027.line }} aria-hidden="true" />
                      {c}
                    </button>
                  )
                })}
                {hasUncategorized && (
                  <button
                    type="button"
                    onClick={() => setFCategory((a) => toggle(a, JOURNAL_CATEGORY_NONE))}
                    className={`${chip} ${fCategory.includes(JOURNAL_CATEGORY_NONE) ? chipOn : ''}`}
                  >
                    분류 없음
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  if (filtered.length === 0) {
    return (
      <>
        {controls}
        <p className="mt-16 text-center text-sm leading-relaxed text-b27-muted">
          조건에 맞는 일지가 없습니다.
        </p>
      </>
    )
  }

  // 월 단위로 묶어 머리줄(그달 건수) + 행 목록.
  const groups: { ym: string; items: JournalEntry[] }[] = []
  for (const e of filtered) {
    const ym = (e.entry_date ?? '').slice(0, 7)
    const last = groups[groups.length - 1]
    if (last && last.ym === ym) last.items.push(e)
    else groups.push({ ym, items: [e] })
  }
  const list = (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <section key={g.ym}>
          <MonthHead label={g.ym ? monthLabel(g.ym) : '날짜 없음'} items={g.items} />
          <ul className={wide ? '' : 'flex flex-col gap-2.5'}>{g.items.map(renderItem)}</ul>
        </section>
      ))}
    </div>
  )

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
      <div className={`grid grid-cols-1 gap-5 @xl:grid-cols-[1fr_1.1fr] ${bottomPad}`}>
        <div className="min-w-0">{list}</div>
        <div className="min-w-0">
          <div
            className="sticky top-[150px] rounded-2xl bg-b27-paper p-1"
            style={{ maxHeight: 'calc(100vh - 170px)', overflowY: 'auto' }}
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
                <p className="py-10 text-center text-sm text-b27-muted">
                  왼쪽에서 일지를 선택하세요.
                  <br />
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="mt-3 rounded-full bg-b27-card px-3.5 py-1.5 text-xs font-medium text-b27-ink transition active:opacity-70"
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
                photos={photoMap[selectedEntry.id] ?? []}
              />
            ) : (
              <p className="py-10 text-center text-sm text-b27-muted">왼쪽에서 일지를 선택하세요.</p>
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
      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition active:opacity-70 disabled:opacity-50 ${
        on ? 'bg-b27-ink text-white' : 'bg-b27-card text-b27-ink'
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
        className="rounded-full bg-b27-expense-soft px-3 py-1.5 text-[11px] font-medium text-b27-expense transition active:opacity-70 disabled:opacity-50"
      >
        삭제
      </button>

      {/* 펼침 패널: 액션 row 위에 떠 있는 작은 시트 (이 div 기준 absolute) */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2">
          <div
            className="max-h-72 overflow-y-auto rounded-2xl bg-b27-paper p-3 shadow-[0_8px_28px_-8px_rgba(43,49,96,0.25)]"
          >
            {open === 'prayer' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-num text-[11px] font-medium text-b27-muted">기도후보 변경</span>
                <Btn onClick={() => applyAndClose(onPrayerCandidate, true)}>ON</Btn>
                <Btn onClick={() => applyAndClose(onPrayerCandidate, false)}>OFF</Btn>
              </div>
            )}
            {open === 'cat' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-num text-[11px] font-medium text-b27-muted">사역분류 변경</span>
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
                <span className="mr-1 font-num text-[11px] font-medium text-b27-muted">
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
                <span className="mr-1 font-num text-[11px] font-medium text-b27-muted">
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
