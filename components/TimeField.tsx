'use client'

// MFH-TIME-FIELD-V3 — 2027 공용 부품(4-0): 남색 글자 · 연회색 면 · b27 선 · 굵기 600 이하 · 위험 = 지출 빨강.
// MFH-TIME-FIELD-V2
// 마감 시간 입력.
// - 모바일: native input 을 opacity-0 으로 덮고 보이는 div 가 값/placeholder 표시
//   (native 노출 시 iOS 에서 너비 넘침·빈칸 높이 불일치가 생기는 문제 회피).
// - 데스크탑(fine pointer): macOS Safari 등은 time input 에 팝업 피커가 없어
//   showPicker() 가 실패한다 → native input 을 그대로 노출해 클릭·키보드 입력이 항상 동작.

import { useEffect, useState } from 'react'

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

const box = 'w-full rounded-xl border border-b27-line bg-b27-paper px-4 py-3 text-sm'

export default function TimeField({ value, onChange, placeholder, disabled }: Props) {
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
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        disabled={disabled}
        aria-label={placeholder ?? '시간 선택'}
        className={`${box} cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
      />
    )
  }

  return (
    <div className={`relative w-full ${disabled ? 'opacity-50' : ''}`}>
      <div className={box}>
        {value ? formatTime(value) : <span className="text-b27-muted">{placeholder ?? '시간 선택'}</span>}
      </div>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        disabled={disabled}
        aria-label={placeholder ?? '시간 선택'}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </div>
  )
}
