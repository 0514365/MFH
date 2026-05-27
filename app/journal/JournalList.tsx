'use client'

// MFH-JOURNAL-LIST-V1
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { JournalEntry } from '@/lib/types'
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
function EntrySummary({ e }: { e: JournalEntry }) {
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
            href={`/journal/${e.id}`}
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const wide = useWideScreen()

  useEffect(() => {
    if (!wide) {
      setSelectedId(null)
      return
    }
    setSelectedId((cur) => {
      if (cur && entries.some((e) => e.id === cur)) return cur
      return entries[0]?.id ?? null
    })
  }, [wide, entries])

  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  )

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
            href={`/journal/${e.id}`}
            className="block rounded-2xl border border-line bg-surface p-4 transition hover:border-primary"
          >
            <EntryBody e={e} />
          </Link>
        )}
      </li>
    )
  }

  const list = <ul className="space-y-3">{entries.map(renderItem)}</ul>

  // 좁은 화면: 목록만(탭=상세 직행).
  if (!wide) return list

  // 넓은 화면: 좌 목록 / 우 요약(첫 항목 자동선택).
  return (
    <div className="grid grid-cols-1 gap-5 min-[740px]:grid-cols-[1fr_1.1fr]">
      <div className="min-w-0">{list}</div>
      <div className="min-w-0">
        <div
          className="sticky top-[120px] rounded-2xl border border-line bg-surface p-5"
          style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}
        >
          {selectedEntry ? (
            <EntrySummary e={selectedEntry} />
          ) : (
            <p className="py-10 text-center text-sm text-faint">왼쪽에서 일지를 선택하세요.</p>
          )}
        </div>
      </div>
    </div>
  )
}
