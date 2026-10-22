'use client'
// MFH-PROJECT-DELETE-BUTTON-2027 — 4-3: 연한 빨강 면 + 빨강 글자.

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
    <button onClick={del} disabled={busy} className="rounded-2xl bg-b27-expense-soft px-5 py-3.5 text-[14px] font-medium text-b27-expense transition active:opacity-70 disabled:opacity-50">
      {busy ? '삭제 중…' : '삭제'}
    </button>
  )
}
