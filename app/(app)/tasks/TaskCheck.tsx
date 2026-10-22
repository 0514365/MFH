'use client'
// MFH-TASK-CHECK-V2 — 2027(4-2): 원형 체크(26 · 상세 lg 32) · 완료 = 진한 민트 채움 + 흰 ✓ / 미완료 = 회색 테두리.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { requestBadgeRefresh } from '@/lib/badge'

export default function TaskCheck({ id, done, size = 'md' }: { id: string; done: boolean; size?: 'md' | 'lg' }) {
  const router = useRouter()
  const [checked, setChecked] = useState(done)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (busy) return
    const next = !checked
    setChecked(next)
    setBusy(true)
    const supabase = createClient()
    // 완료 체크 ↔ Status 연동: 완료 ON → done, 완료 OFF → in_progress 로 되돌림.
    const { error } = await supabase
      .from('tasks')
      .update({
        done: next,
        status: next ? 'done' : 'in_progress',
        completed_at: next ? new Date().toISOString() : null,
      })
      .eq('id', id)
    setBusy(false)
    if (error) {
      setChecked(!next)
      alert('변경 실패: ' + error.message)
      return
    }
    requestBadgeRefresh()
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={checked ? '완료 취소' : '완료로 표시'}
      aria-pressed={checked}
      className={`flex shrink-0 items-center justify-center rounded-full border-2 font-semibold transition-colors active:scale-95 ${
        size === 'lg' ? 'h-8 w-8 text-base' : 'h-[26px] w-[26px] text-sm'
      } ${checked ? 'border-[#226C5A] bg-[#226C5A] text-white' : 'border-[#C9CDD8] bg-b27-paper text-transparent'}`}
    >
      ✓
    </button>
  )
}
