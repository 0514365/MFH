'use client'

// MFH-PROJECT-STATUS-TOGGLE-V1
// 프로젝트 카드 우측 상단의 단건 완료 토글 (status 변경).
// 프로젝트엔 done 컬럼이 없음 → status='done' ↔ 'in_progress' 토글로 표현.
// TaskCheck 와 동일한 즉시 update 패턴.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function ProjectStatusToggle({
  id,
  status,
}: {
  id: string
  status: string
}) {
  const router = useRouter()
  const [checked, setChecked] = useState(status === 'done')
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (busy) return
    const next = !checked
    // 완료 ON → done. 완료 OFF → 진행중으로 되돌림(직전 status 미기록).
    const nextStatus = next ? 'done' : 'in_progress'
    setChecked(next)
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('projects')
      .update({ status: nextStatus })
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
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm font-extrabold ${
        checked
          ? 'border-accent bg-accent text-white'
          : 'border-[#e6c9cb] bg-surface text-transparent'
      }`}
    >
      ✓
    </button>
  )
}
