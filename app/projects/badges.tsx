import { priorityLabel, statusLabel } from '@/lib/constants'

export function StatusBadge({ value }: { value: string }) {
  const cls =
    value === 'active'
      ? 'bg-primary-soft text-primary'
      : value === 'done'
        ? 'bg-surface-subtle text-faint'
        : 'bg-surface-subtle text-muted'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] ${cls}`}>{statusLabel(value)}</span>
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

export function ImportanceStars({ value }: { value: number }) {
  if (!value) return null
  return <span className="text-[11px] text-yellow-400">{'★'.repeat(value)}</span>
}

export function fmtDate(d: string | null): string {
  if (!d) return ''
  return d.split('-').join('. ')
}
