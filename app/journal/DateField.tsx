'use client'

// MFH-DATE-FIELD-V2
// 날짜 입력.
// - 모바일: native input 을 opacity-0 으로 덮고 보이는 div 가 값/placeholder 표시.
// - 데스크탑(fine pointer): macOS Safari 등은 date input 에 팝업 피커가 없어
//   showPicker() 가 실패한다 → native input 을 그대로 노출해 클릭·키보드 입력이 항상 동작.

import { useEffect, useState } from 'react'

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

const box = 'w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm'

export default function DateField({ value, onChange, placeholder }: Props) {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    setDesktop(window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  }, [])

  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker?.()
    } catch {}
  }

  if (desktop) {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        aria-label={placeholder ?? '날짜 선택'}
        className={`${box} cursor-pointer`}
      />
    )
  }

  return (
    <div className="relative w-full">
      <div className={box}>
        {value ? formatYmd(value) : <span className="text-faint">{placeholder ?? '날짜 선택'}</span>}
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        aria-label={placeholder ?? '날짜 선택'}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  )
}
