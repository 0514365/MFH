// MFH-QT-COMMENTARY-ACCORDION-V1
// 접이식 본문 설명(내용·맥락·역사·문화). 묵상 위에 위치. DB 저장 텍스트라 토글만(실시간 로드 없음).
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
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left"
      >
        <span className="text-sm font-bold text-primary">본문 설명</span>
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-primary transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-line px-5 py-4">
          {list.map((it, i) => (
            <div key={i} className={i > 0 ? 'mt-3.5' : ''}>
              {(it.heading ?? '').trim() && (
                <p className="text-sm font-bold text-primary">{(it.heading ?? '').trim()}</p>
              )}
              {(it.body ?? '').trim() && (
                <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{(it.body ?? '').trim()}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
