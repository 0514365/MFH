'use client'
// MFH-JOURNAL-DELETE-BUTTON-V2 — 2027(4-1): 연한 빨강 면 + 빨강 글자(상세 하단 버튼 줄 높이 맞춤).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function DeleteButton({ id, paths }: { id: string; paths: string[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function del() {
    if (!window.confirm('이 일지를 삭제할까요?')) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('journal_entries').delete().eq('id', id)
    if (error) {
      setBusy(false)
      window.alert('삭제 실패: ' + error.message)
      return
    }
    if (paths.length) {
      try {
        await supabase.storage.from('journal-photos').remove(paths)
      } catch {
        // 사진 삭제 실패는 무시(일지는 이미 삭제됨)
      }
    }
    router.replace('/journal')
    router.refresh()
  }

  return (
    <button onClick={del} disabled={busy} className="rounded-2xl bg-b27-expense-soft px-6 py-3.5 text-[14px] font-medium text-b27-expense transition active:opacity-70 disabled:opacity-50">
      {busy ? '삭제 중…' : '삭제'}
    </button>
  )
}
