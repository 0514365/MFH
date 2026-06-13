'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { requestBadgeRefresh } from '@/lib/badge'

export default function TaskCheck({ id, done }: { id: string; done: boolean }) {
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
      aria-label="완료 토글"
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
        checked ? 'border-[#0F6E56] bg-[#0F6E56] text-white' : 'border-faint bg-transparent text-transparent hover:border-primary'
      }`}
    >
      ✓
    </button>
  )
}
