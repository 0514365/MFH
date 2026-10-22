// MFH-PROJECT-BADGES-V2 — 2027(4-2): 상태 예정 회색 · 진행 페리윙클 틴트 · 완료 민트 틴트 · 분류 = 분류 틴트 알약 · 별 = 살구 진한 노랑.
import { priorityLabel, normalizeStatus, statusV2Label, JOURNAL_CATEGORY_BLOCK, type StatusValue } from '@/lib/constants'
import { blockColor, blockTint, brand2027 } from '@/lib/palette'

const STATUS_CLS: Record<StatusValue, string> = {
  upcoming: 'bg-b27-card text-b27-muted',
  in_progress: 'bg-b27-tint-8 text-[#303C8D]',
  done: 'bg-b27-tint-4 text-[#226C5A]',
}

export function StatusBadge({ value }: { value: string }) {
  const v = normalizeStatus(value)
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${STATUS_CLS[v]}`}>
      {statusV2Label(value)}
    </span>
  )
}

export function PriorityBadge({ value }: { value: string }) {
  const cls =
    value === 'high'
      ? 'bg-b27-expense-soft text-b27-expense'
      : value === 'low'
        ? 'bg-b27-card text-b27-muted'
        : 'bg-b27-card text-b27-ink'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] ${cls}`}>{priorityLabel(value)}</span>
}

export function CategoryBadge({ value }: { value: string | null }) {
  if (!value) return null
  const n = JOURNAL_CATEGORY_BLOCK[value]
  const { tint, deep } = n ? blockTint(n) : { tint: brand2027.card, deep: brand2027.muted }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium" style={{ background: tint, color: deep }}>
      <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: n ? blockColor(n).bg : brand2027.line }} aria-hidden="true" />
      {value}
    </span>
  )
}

export function ImportanceStars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  if (!value) return null
  return (
    <span className={`${size === 'md' ? 'text-xs' : 'text-[11px]'} tracking-[1px] text-[#E3A33B]`} aria-label={`중요도 ${value}`}>
      {'★'.repeat(value)}
    </span>
  )
}

export function fmtDate(d: string | null): string {
  if (!d) return ''
  return d.split('-').join('. ')
}
