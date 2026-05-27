'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function del() {
    if (!window.confirm('이 할 일을 삭제할까요?')) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      setBusy(false)
      window.alert('삭제 실패: ' + error.message)
      return
    }
    router.replace('/tasks')
    router.refresh()
  }

  return (
    <button onClick={del} disabled={busy} className="text-xs text-danger underline disabled:opacity-50">
      {busy ? '삭제 중…' : '할 일 삭제'}
    </button>
  )
}
