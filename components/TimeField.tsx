'use client'

// MFH-TIME-FIELD-V1
// 마감 시간 입력 — DateField 와 동일 패턴(투명 native input + 보이는 div).
// native <input type="time"> 를 직접 노출하면 iOS 에서 너비 넘침·빈칸 높이 불일치가 생김 →
// native input 은 opacity-0 으로 덮고(탭하면 휠 picker), 보이는 div 가 값/placeholder 표시 담당.

type Props = {
  value: string // "HH:MM"
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}

function formatTime(v: string): string {
  if (!v) return ''
  const [hh, mm] = v.split(':')
  const h = Number(hh)
  if (Number.isNaN(h)) return v
  const ampm = h < 12 ? '오전' : '오후'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${ampm} ${h12}:${mm}`
}

export default function TimeField({ value, onChange, placeholder, disabled }: Props) {
  return (
    <div className={`relative w-full ${disabled ? 'opacity-50' : ''}`}>
      <div className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm">
        {value ? formatTime(value) : <span className="text-faint">{placeholder ?? '시간 선택'}</span>}
      </div>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={placeholder ?? '시간 선택'}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </div>
  )
}
