'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function DeleteButton({ id, photoPath }: { id: string; photoPath: string | null }) {
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
    if (photoPath) {
      try {
        await supabase.storage.from('journal-photos').remove([photoPath])
      } catch {
        // 사진 삭제 실패는 무시(일지는 이미 삭제됨)
      }
    }
    router.replace('/journal')
    router.refresh()
  }

  return (
    <button onClick={del} disabled={busy} className="text-xs text-danger underline disabled:opacity-50">
      {busy ? '삭제 중…' : '일지 삭제'}
    </button>
  )
}
