'use client'

// MFH-JOURNAL-LIST-V1
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { JournalEntry } from '@/lib/types'
import { chip, chipOn, toggle } from '@/lib/statusChip'
import {
  applyJournalFilter,
  buildJournalQuery,
  parseJournalFilter,
  type JournalFilter,
} from '@/lib/journalFilter'
import { useWideScreen } from '@/lib/useWideScreen'

// 일지 카드 본문(날짜·배지·머리말·오늘). wide=선택버튼 / narrow=Link 로 감쌈.
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
        {e.prayer_candidate && (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary">
            기도후보
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

export default function JournalList({ entries }: { entries: JournalEntry[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // URL 쿼리에서 초기 필터/검색을 읽는다(새로고침·뒤로가기·상세 왕복에도 유지).
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

  // 필터/검색이 바뀌면 URL 쿼리 갱신(replace). 기본값이면 쿼리 제거 → '모두 초기화' 반영.
  useEffect(() => {
    const f: JournalFilter = { q, fCategory, prayerOnly, asc }
    const qs = buildJournalQuery(f)
    const current = searchParams.toString()
    if (qs === current) return
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [q, fCategory, prayerOnly, asc, pathname, router, searchParams])

  // 데이터에 실제로 존재하는 분류만 칩으로 노출
  const categoryOpts = useMemo(
    () =>
      Array.from(
        new Set(entries.map((e) => e.category).filter((c): c is string => !!c)),
      ).sort(),
    [entries],
  )

  const filtered = useMemo(
    () => applyJournalFilter(entries, { q, fCategory, prayerOnly, asc }),
    [entries, q, fCategory, prayerOnly, asc],
  )

  // 상세 링크에 붙일 현재 필터 쿼리(검색된 목록 기준 이전/다음 유지용).
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

  if (entries.length === 0) {
    return (
      <p className="mt-16 text-center text-sm leading-relaxed text-faint">
        아직 일지가 없습니다.
        <br />첫 일지를 기록해 보세요.
      </p>
    )
  }

  function renderItem(e: JournalEntry) {
    const isSel = wide && e.id === selectedId
    return (
      <li key={e.id}>
        {wide ? (
          <button
            type="button"
            onClick={() => setSelectedId(e.id)}
            className={`block w-full rounded-2xl border bg-surface p-4 text-left ${
              isSel ? 'border-primary border-2' : 'border-line'
            }`}
          >
            <EntryBody e={e} />
          </button>
        ) : (
          <Link
            href={`/journal/${e.id}${detailSuffix}`}
            className="block rounded-2xl border border-line bg-surface p-4 transition hover:border-primary"
          >
            <EntryBody e={e} />
          </Link>
        )}
      </li>
    )
  }

  // 컨트롤 바: 검색창 + 필터 토글 + 정렬(날짜) 토글 + 모두 초기화 (sticky)
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
            onChange={(e) => setQ(e.target.value)}
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
        {canReset && (
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

  // 좁은 화면: 컨트롤 + 목록만(탭=상세 직행).
  if (!wide)
    return (
      <>
        {controls}
        {list}
      </>
    )

  // 넓은 화면: 컨트롤 + 좌 목록 / 우 요약(첫 항목 자동선택).
  return (
    <>
      {controls}
      <div className="grid grid-cols-1 gap-5 min-[740px]:grid-cols-[1fr_1.1fr]">
        <div className="min-w-0">{list}</div>
        <div className="min-w-0">
          <div
            className="sticky top-[120px] rounded-2xl border border-line bg-surface p-5"
            style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}
          >
            {selectedEntry ? (
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
