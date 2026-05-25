'use client'

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

function formatYmd(v: string): string {
  if (!v) return ''
  const [y, m, d] = v.split('-')
  if (!y || !m || !d) return v
  return `${y}. ${m}. ${d}`
}

export default function DateField({ value, onChange, placeholder }: Props) {
  return (
    <div className="relative w-full">
      <div className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm">
        {value ? formatYmd(value) : <span className="text-faint">{placeholder ?? '날짜 선택'}</span>}
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder ?? '날짜 선택'}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  )
}
