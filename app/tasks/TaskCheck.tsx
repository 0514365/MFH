'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

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
    const { error } = await supabase
      .from('tasks')
      .update({ done: next, completed_at: next ? new Date().toISOString() : null })
      .eq('id', id)
    setBusy(false)
    if (error) {
      setChecked(!next)
      alert('변경 실패: ' + error.message)
      return
    }
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label="완료 토글"
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
        checked ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-transparent'
      }`}
    >
      ✓
    </button>
  )
}
