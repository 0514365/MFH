'use client'

// MFH-BIBLE-DAY-CHECK-V2
// 읽음 체크 버튼(즉시 update 패턴, TaskCheck 와 동일 UX). size: lg=오늘 카드/홈, sm=일정 목록.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { setDayDone, type ReadMethod } from '@/lib/bible/checkin'

export default function DayCheck({
  id,
  done,
  chars,
  method = null,
  size = 'sm',
  onChanged,
}: {
  id: string
  done: boolean
  chars: number
  method?: ReadMethod | null // 저장된 통독 방법 — 예상 소요 분 계산에 사용
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
    const { error } = await setDayDone(createClient(), id, next, chars, method)
    setBusy(false)
    if (error) {
      setChecked(!next)
      alert('변경 실패: ' + error)
      return
    }
    onChanged?.(next)
    router.refresh()
  }

  const dim = size === 'lg' ? 'h-11 w-11 rounded-2xl text-xl' : 'h-6 w-6 rounded-md text-sm'
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={checked ? '읽음 취소' : '읽음 체크'}
      aria-pressed={checked}
      className={`flex shrink-0 items-center justify-center border font-extrabold transition-colors ${dim} ${
        checked ? 'border-accent bg-accent text-white' : 'border-[#e6c9cb] bg-transparent text-transparent hover:border-accent'
      }`}
    >
      ✓
    </button>
  )
}
