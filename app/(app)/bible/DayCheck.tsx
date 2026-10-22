'use client'
// MFH-BIBLE-DAY-CHECK-V4 — 2027(4-5): theme-2027 · 남색 글자 · 연회색/블러시 면 · 강조 = 진한 블러시 · 굵기 600 이하 · 영문 대문자 머리글 해제.

// MFH-BIBLE-DAY-CHECK-V3
// 읽음 체크 버튼(즉시 update 패턴, TaskCheck 와 동일 UX). size: lg=오늘 카드/홈, sm=일정 목록.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { setDayDone, type CheckTarget } from '@/lib/bible/checkin'

export default function DayCheck({
  target,
  done,
  size = 'sm',
  onChanged,
}: {
  target: CheckTarget // id·chars + 기존 기록(있으면 보존)
  done: boolean
  size?: 'sm' | 'lg'
  onChanged?: (done: boolean) => void
}) {
  const router = useRouter()
  const [checked, setChecked] = useState(done)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (busy) return
    const next = !checked
    setChecked(next)
    setBusy(true)
    const { error } = await setDayDone(createClient(), target, next)
    setBusy(false)
    if (error) {
      setChecked(!next)
      alert('변경 실패: ' + error)
      return
    }
    onChanged?.(next)
    router.refresh()
  }

  const dim = size === 'lg' ? 'h-11 w-11 text-lg' : 'h-[26px] w-[26px] text-sm'
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={checked ? '읽음 취소' : '읽음 체크'}
      aria-pressed={checked}
      className={`flex shrink-0 items-center justify-center rounded-full border-2 font-semibold transition-colors active:scale-95 ${dim} ${
        checked ? 'border-[#226C5A] bg-[#226C5A] text-white' : 'border-[#C9CDD8] bg-b27-paper text-transparent'
      }`}
    >
      ✓
    </button>
  )
}
