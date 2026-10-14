// MFH-QT-COMMENTARY-ACCORDION-V2
// 접이식 본문 설명(내용·맥락·문화). 묵상 위. DB 저장 텍스트라 토글만. Variant 시안 비주얼(원형 caret · 라벨 배지).
'use client'
import { useState } from 'react'

type Item = { heading?: string | null; body?: string | null }

export default function CommentaryAccordion({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false)
  const list = (Array.isArray(items) ? items : []).filter(
    (it) => !!(it?.heading ?? '').trim() || !!(it?.body ?? '').trim(),
  )
  if (list.length === 0) return null

  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-surface shadow-soft">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors active:bg-paper"
      >
        <span className="text-[16px] font-bold tracking-tight text-ink">본문 설명</span>
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
        <div className="flex flex-col gap-6 border-t border-line px-6 pb-7 pt-4">
          {list.map((it, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              {(it.heading ?? '').trim() && (
                <span className="self-start rounded-[6px] bg-accent-soft px-2.5 py-1 text-[12px] font-bold tracking-wide text-accent">
                  {(it.heading ?? '').trim()}
                </span>
              )}
              {(it.body ?? '').trim() && (
                <p className="whitespace-pre-wrap text-[16.5px] leading-[1.8] text-ink">{(it.body ?? '').trim()}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
