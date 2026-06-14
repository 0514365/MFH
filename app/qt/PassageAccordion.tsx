// MFH-QT-PASSAGE-ACCORDION-V2
// 접이식 본문(개역개정). 펼칠 때 /api/qt/passage 로 실시간 로드(저장 안 함). Variant 시안 비주얼(원형 caret · 절 번호 컬럼).
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
    <div className="overflow-hidden rounded-[24px] border border-line bg-surface shadow-soft">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors active:bg-paper"
      >
        <span className="flex items-center gap-2 text-[16px] font-bold tracking-tight text-ink">
          본문 읽기
          {refLabel && (
            <>
              <span className="text-[14px] font-normal text-faint">·</span>
              <span className="font-semibold text-primary">{refLabel}</span>
            </>
          )}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-surface-subtle bg-paper">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`text-muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="border-t border-line px-6 pb-7 pt-3">
          {loading && <p className="text-sm text-muted">본문을 불러오는 중…</p>}
          {err && <p className="text-sm text-muted">본문을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
          {verses && verses.length > 0 && (
            <div className="flex flex-col gap-5">
              {verses.map((v, i) => {
                const newChapter = i === 0 || v.chapter !== verses[i - 1].chapter
                const num = newChapter && v.chapter != null ? `${v.chapter}:${v.verse}` : `${v.verse}`
                return (
                  <div key={i} className="flex items-start gap-3.5">
                    <span className="mt-[3px] w-[30px] shrink-0 text-[13px] font-bold text-primary">{num}</span>
                    <p className="text-[16.5px] leading-[1.8] text-ink">{v.text}</p>
                  </div>
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
