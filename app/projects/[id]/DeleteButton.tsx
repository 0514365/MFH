'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function del() {
    if (!confirm('이 프로젝트를 삭제할까요? 연결된 할 일은 남고 연결만 해제됩니다.')) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) {
      setBusy(false)
      alert('삭제 실패: ' + error.message)
      return
    }
    router.replace('/projects')
    router.refresh()
  }

  return (
    <button onClick={del} disabled={busy} className="text-xs text-danger underline disabled:opacity-50">
      {busy ? '삭제 중…' : '삭제'}
    </button>
  )
}
