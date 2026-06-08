// MFH-RECURRENCE-BADGE-V1
// 반복 시리즈 표시 칩(목록·상세·편집 공용). 반복 아이콘 + 주기(매일/매주/매월).
import { recurrenceLabel } from '@/lib/recurrence'

export default function RecurrenceBadge({
  freq,
  className,
}: {
  freq: string | null | undefined
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary ${className ?? ''}`}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </svg>
      {recurrenceLabel(freq)}
    </span>
  )
}
