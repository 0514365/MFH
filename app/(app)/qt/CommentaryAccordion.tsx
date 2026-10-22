// MFH-QT-COMMENTARY-ACCORDION-V3 — 2027(4-5): theme-2027 · 남색 글자 · 연회색/블러시 면 · 강조 = 진한 블러시 · 굵기 600 이하 · 영문 대문자 머리글 해제.
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
    <div className="overflow-hidden rounded-2xl bg-b27-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition active:opacity-70"
      >
        <span className="text-[14.5px] font-medium text-b27-ink">본문 설명</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-b27-paper">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`text-b27-muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-6 border-t-2 border-b27-paper bg-b27-paper px-4 pb-5 pt-4">
          {list.map((it, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              {(it.heading ?? '').trim() && (
                <span className="self-start rounded-[6px] bg-b27-tint-7 px-2.5 py-1 text-[12px] font-semibold tracking-wide text-[#A91E30]">
                  {(it.heading ?? '').trim()}
                </span>
              )}
              {(it.body ?? '').trim() && (
                <p className="whitespace-pre-wrap text-[15.5px] leading-[1.8] text-b27-ink">{(it.body ?? '').trim()}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
