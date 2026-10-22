'use client'
// MFH-PROJECT-STATUS-TOGGLE-2027 — 4-3: 원형 완료 체크(할 일 TaskCheck 와 같은 모양 · 완료 = 진한 민트).

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
      aria-label={checked ? '완료 취소' : '완료로 표시'}
      aria-pressed={checked}
      className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors active:scale-95 ${
        checked ? 'border-[#226C5A] bg-[#226C5A] text-white' : 'border-[#C9CDD8] bg-b27-paper text-transparent'
      }`}
    >
      ✓
    </button>
  )
}
