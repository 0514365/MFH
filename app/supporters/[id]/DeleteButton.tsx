'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function del() {
    if (!confirm('이 후원자를 삭제할까요? 헌금이력·관계히스토리도 함께 삭제됩니다.')) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('supporters').delete().eq('id', id)
    if (error) {
      setBusy(false)
      alert('삭제 실패: ' + error.message)
      return
    }
    router.replace('/supporters')
    router.refresh()
  }

  return (
    <button
      onClick={del}
      disabled={busy}
      className="rounded-full border border-[#f0c4c4] bg-white px-5 py-2 text-[13px] font-medium text-danger transition hover:bg-accent-soft disabled:opacity-50"
    >
      {busy ? '삭제 중…' : '삭제'}
    </button>
  )
}
