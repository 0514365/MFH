import { priorityLabel, normalizeStatus, statusV2Label, type StatusValue } from '@/lib/constants'

const STATUS_CLS: Record<StatusValue, string> = {
  upcoming: 'bg-status-upcoming text-on-status-upcoming',
  in_progress: 'bg-status-progress text-on-status-progress',
  done: 'bg-status-done text-on-status-done',
}

export function StatusBadge({ value }: { value: string }) {
  const v = normalizeStatus(value)
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_CLS[v]}`}>
      {statusV2Label(value)}
    </span>
  )
}

export function PriorityBadge({ value }: { value: string }) {
  const cls =
    value === 'high'
      ? 'bg-accent-soft text-accent'
      : value === 'low'
        ? 'bg-surface-subtle text-faint'
        : 'bg-surface-subtle text-muted'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] ${cls}`}>{priorityLabel(value)}</span>
}

export function CategoryBadge({ value }: { value: string | null }) {
  if (!value) return null
  return <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">{value}</span>
}

export function ImportanceStars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  if (!value) return null
  return (
    <span className={`${size === 'md' ? 'text-xs' : 'text-[11px]'} text-yellow-400`}>
      {'★'.repeat(value)}
    </span>
  )
}

export function fmtDate(d: string | null): string {
  if (!d) return ''
  return d.split('-').join('. ')
}
