'use client'

// MFH-BIBLE-CHAPTER-CHECK-V1
// 「읽기표 체크 후 다음장」 버튼(장 단위) + 이 장의 최근 읽은 날·총 읽은 횟수.
//   · 클릭: bible_chapter_reads 에 1행 추가(patch108) → 이 장으로 하루치가 모두 채워지면 reading_plan_days.done ON(lib/bible/checkin 규칙)
//     → 다음 장(없으면 다음 일차 첫 장, 그것도 없으면 /bible)으로 이동.
//   · 같은 장을 다시 체크해도 행이 쌓여 "총 N회" 가 늘어난다(재독 기록).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { relativeKo, setDayDone, type CheckTarget } from '@/lib/bible/checkin'

type Props = {
  chapSeq: number
  planId: string
  day: CheckTarget & { done: boolean }
  dayComplete: boolean // 이 장을 체크하면 하루치가 모두 채워지는가
  nextHref: string | null
  lastReadAt: string | null
  readCount: number
}

export default function ChapterCheck({ chapSeq, planId, day, dayComplete, nextHref, lastReadAt, readCount }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function check() {
    if (busy) return
    setBusy(true)
    setMsg(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }
    const { error } = await supabase
      .from('bible_chapter_reads')
      .insert({ user_id: user.id, chap_seq: chapSeq, plan_id: planId, plan_day_id: day.id })
    if (error) {
      setBusy(false)
      setMsg('기록 저장 실패: ' + error.message)
      return
    }
    if (dayComplete && !day.done) {
      const r = await setDayDone(supabase, day, true)
      if (r.error) {
        setBusy(false)
        setMsg('일차 읽음 표시 실패: ' + r.error)
        return
      }
    }
    if (nextHref) {
      router.push(nextHref)
      router.refresh()
    } else {
      setBusy(false)
      router.refresh()
    }
  }

  return (
    <div className="mt-5 text-center">
      <button
        type="button"
        onClick={check}
        disabled={busy}
        className="inline-flex items-center justify-center rounded-full border-2 border-primary bg-surface px-7 py-3 text-[15px] font-bold text-primary transition hover:bg-primary hover:text-on-primary disabled:opacity-60"
      >
        {busy ? '기록 중…' : nextHref ? '읽기표 체크 후 다음장' : '읽기표 체크'}
      </button>
      <p className="mt-2.5 text-[12px] text-muted">
        {readCount > 0 && lastReadAt
          ? `${relativeKo(lastReadAt)}에 읽은 기록이 있음 (총 ${readCount}회)`
          : '아직 읽은 기록이 없습니다'}
      </p>
      {msg && <p className="mt-1 text-[12px] text-danger">{msg}</p>}
    </div>
  )
}
