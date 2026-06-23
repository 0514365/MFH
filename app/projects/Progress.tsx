type Props = {
  done: number
  total: number
  size?: number
}

export function ProgressRing({ done, total, size = 46 }: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct / 100)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          style={{ stroke: 'var(--accent-soft)' }}
        />
        {total > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ stroke: 'var(--accent)' }}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-accent">
        {total > 0 ? `${pct}%` : '–'}
      </span>
    </div>
  )
}
