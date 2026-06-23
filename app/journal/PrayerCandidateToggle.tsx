'use client'

// MFH-PRAYER-CANDIDATE-TOGGLE-V1
// 일지 카드 우측 상단의 단건 기도후보 토글. TaskCheck 와 유사한 즉시 update 패턴.
// 체크 상태일 때 십자가(채움·마룬), 미체크 연한 십자가. accent(붉은) 색.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function PrayerCandidateToggle({
  id,
  candidate,
}: {
  id: string
  candidate: boolean
}) {
  const router = useRouter()
  const [checked, setChecked] = useState(candidate)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (busy) return
    const next = !checked
    setChecked(next)
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('journal_entries')
      .update({ prayer_candidate: next })
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
      aria-label="기도후보 토글"
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
        checked
          ? 'border-accent bg-accent text-white'
          : 'border-line bg-surface text-transparent'
      }`}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M10 2.5h4v6h6v4h-6v9h-4v-9H4v-4h6z" />
      </svg>
    </button>
  )
}
