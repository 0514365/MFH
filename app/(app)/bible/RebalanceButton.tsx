'use client'

// MFH-BIBLE-REBALANCE-V1
// 「남은 기간 재분배」 — 밀린 분량이 있을 때 /bible 「밀린 분량」 제목 옆 버튼.
// 열면 이 계획에서 읽은 장(bible_chapter_reads)을 불러와 두 안을 미리보기:
//   · 목표일 유지(하루 분량 증가) · 목표일 늦춤(미완료 일수 그대로)
// 확인 → rpc rebalance_reading_plan(patch113) 한 번으로 저장 → 새로고침. 완료 일차·기록은 그대로.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { longDate, planScope, rebalanceSchedule, shortDate, type RebalanceMode, type RebalanceResult } from '@/lib/bible/plan'
import type { ReadingPlan, ReadingPlanDay } from '@/lib/types'

type Props = { plan: ReadingPlan; days: ReadingPlanDay[]; today: string }

const OPTIONS: { mode: RebalanceMode; title: string; desc: string }[] = [
  { mode: 'keep_end', title: '목표일 유지', desc: '완료 목표일은 그대로, 하루 분량을 늘립니다' },
  { mode: 'extend', title: '목표일 늦춤', desc: '하루 분량은 비슷하게, 밀린 만큼 목표일을 늦춥니다' },
]

export default function RebalanceButton({ plan, days, today }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [pick, setPick] = useState<RebalanceMode>('keep_end')
  const [results, setResults] = useState<Record<RebalanceMode, RebalanceResult> | null>(null)

  async function onOpen() {
    setOpen(true)
    setErr('')
    setResults(null)
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('bible_chapter_reads').select('chap_seq').eq('plan_id', plan.id)
    setLoading(false)
    if (error) return setErr('읽음 기록 조회 실패: ' + error.message)
    const input = {
      order: plan.read_order,
      scope: planScope(plan),
      mode: plan.split_mode,
      excludeWeekdays: plan.exclude_weekdays,
      endDate: plan.end_date,
      today,
      days,
      readChapSeqs: (data ?? []).map((r: { chap_seq: number }) => r.chap_seq),
    }
    const next = { keep_end: rebalanceSchedule(input, 'keep_end'), extend: rebalanceSchedule(input, 'extend') }
    setResults(next)
    setPick(next.keep_end.ok ? 'keep_end' : 'extend')
  }

  async function onSave() {
    const r = results?.[pick]
    if (saving || !r?.ok) return
    setSaving(true)
    setErr('')
    const supabase = createClient()
    const { error } = await supabase.rpc('rebalance_reading_plan', {
      p_plan_id: plan.id,
      p_end_date: r.endDate,
      p_days: r.days.map((d) => ({
        read_date: d.readDate,
        start_seq: d.startSeq,
        end_seq: d.endSeq,
        chapters: d.chapters,
        chars: d.chars,
        range_label: d.label,
      })),
    })
    setSaving(false)
    if (error) return setErr('재분배 실패: ' + error.message)
    setOpen(false)
    router.refresh()
  }

  const sel = results?.[pick]

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-muted transition hover:border-primary hover:text-primary"
      >
        남은 기간 재분배
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 @md:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="남은 기간 재분배">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-ink">남은 기간 재분배</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-primary">
                닫기
              </button>
            </div>
            <p className="mb-3 text-[12px] leading-relaxed text-muted">
              읽지 않은 분량을 {sel?.ok ? shortDate(sel.startDate) : '오늘'}부터 다시 나눕니다. 읽은 일차의 기록·은혜는 그대로 남습니다.
            </p>

            {loading && <p className="py-6 text-center text-[12px] text-faint">계산 중…</p>}

            {results && (
              <div className="flex flex-col gap-2">
                {OPTIONS.map((o) => {
                  const r = results[o.mode]
                  const active = pick === o.mode
                  return (
                    <button
                      key={o.mode}
                      type="button"
                      disabled={!r.ok}
                      onClick={() => setPick(o.mode)}
                      className={`rounded-xl border px-3.5 py-3 text-left transition ${
                        active ? 'border-primary bg-surface-subtle' : 'border-line'
                      } ${r.ok ? '' : 'opacity-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold text-ink">{o.title}</span>
                        {r.ok && <span className="text-[11px] text-faint">{r.days.length}일</span>}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted">{o.desc}</div>
                      {r.ok ? (
                        <div className="mt-2 text-[12px] text-ink">
                          하루 평균 <b>{r.avgChapters}장</b> · 약 {r.avgMinutes}분
                          <br />
                          완독 예정 <b>{longDate(r.lastDate)}</b>
                          {r.lastDate !== plan.end_date && <span className="text-faint"> (기존 {longDate(plan.end_date)})</span>}
                        </div>
                      ) : (
                        <div className="mt-2 text-[12px] text-accent">{r.error}</div>
                      )}
                    </button>
                  )
                })}
                {sel?.ok && (
                  <p className="text-[11px] text-faint">
                    남은 {sel.remainingChapters.toLocaleString()}장
                    {sel.skippedRead > 0 && ` (밀린 일차 중 이미 읽은 ${sel.skippedRead}장 제외)`} · 첫날 {sel.days[0].label}
                  </p>
                )}
              </div>
            )}

            {err && <p className="mt-3 text-[12px] text-accent">{err}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg border border-line px-4 text-xs text-muted">
                취소
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={!sel?.ok || saving}
                className="h-10 rounded-lg bg-primary px-4 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {saving ? '저장 중…' : '재분배'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
