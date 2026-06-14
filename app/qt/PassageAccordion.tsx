// MFH-QT-PASSAGE-ACCORDION-V1
// 접이식 본문(개역개정). 펼칠 때 /api/qt/passage 로 실시간 로드(저장 안 함). 제목 영역과 핵심절 사이에 위치.
'use client'
import { useState } from 'react'

type Verse = { chapter: number | null; verse: number | null; text: string }

export default function PassageAccordion({ date, refLabel }: { date: string; refLabel: string }) {
  const [open, setOpen] = useState(false)
  const [verses, setVerses] = useState<Verse[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(false)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && !verses && !loading) {
      setLoading(true)
      setErr(false)
      try {
        const r = await fetch(`/api/qt/passage?date=${date}`)
        if (!r.ok) throw new Error()
        const d = await r.json()
        setVerses(Array.isArray(d.verses) ? (d.verses as Verse[]) : [])
      } catch {
        setErr(true)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left"
      >
        <span className="text-sm font-bold text-primary">
          본문 읽기{refLabel ? <span className="font-medium text-muted"> · {refLabel}</span> : null}
        </span>
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-primary transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-line px-5 py-4">
          {loading && <p className="text-sm text-muted">본문을 불러오는 중…</p>}
          {err && <p className="text-sm text-muted">본문을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
          {verses && verses.length > 0 && (
            <div className="space-y-1.5">
              {verses.map((v, i) => {
                const newChapter = i === 0 || v.chapter !== verses[i - 1].chapter
                const num = newChapter && v.chapter != null ? `${v.chapter}:${v.verse}` : `${v.verse}`
                return (
                  <p key={i} className="text-[15px] leading-relaxed text-ink">
                    <span className="mr-1.5 text-xs font-bold text-primary">{num}</span>
                    {v.text}
                  </p>
                )
              })}
            </div>
          )}
          {verses && verses.length === 0 && !loading && !err && (
            <p className="text-sm text-muted">본문이 없습니다.</p>
          )}
        </div>
      )}
    </div>
  )
}
