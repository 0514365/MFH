'use client'

// MFH-BIBLE-PLANS-LIST-V1
// 통독 계획 카드 목록 — 상태(활성/대기/완독)·진행률·조건 요약. 활성 전환(다른 활성 해제 후 지정)·삭제(확인).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { longDate, READ_ORDER_LABEL, SPLIT_MODE_LABEL, WEEKDAY_KR, type PlanProgress } from '@/lib/bible/plan'
import type { ReadingPlan } from '@/lib/types'

export type PlanCard = { plan: ReadingPlan; progress: PlanProgress }

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function planCondition(p: ReadingPlan): string {
  const ex = WEEKDAY_ORDER.filter((d) => p.exclude_weekdays.includes(d)).map((d) => WEEKDAY_KR[d])
  const parts = [
    `${longDate(p.start_date)} ~ ${longDate(p.end_date)}`,
    ex.length ? `${ex.join('·')} 제외` : '제외 없음',
    READ_ORDER_LABEL[p.read_order],
    SPLIT_MODE_LABEL[p.split_mode],
  ]
  return parts.join(' · ')
}

export default function PlansList({ initial }: { initial: PlanCard[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function activate(id: string) {
    if (busy) return
    setBusy(id)
    setMsg(null)
    const supabase = createClient()
    const now = new Date().toISOString()
    // partial unique(user_id where is_active) → 먼저 전부 해제, 그다음 지정.
    const { error: e1 } = await supabase.from('reading_plans').update({ is_active: false, updated_at: now }).eq('is_active', true)
    const { error: e2 } = e1 ? { error: e1 } : await supabase.from('reading_plans').update({ is_active: true, updated_at: now }).eq('id', id)
    setBusy(null)
    if (e2) {
      setMsg('활성 전환 실패: ' + e2.message)
      return
    }
    router.refresh()
  }

  async function remove(card: PlanCard) {
    if (busy) return
    const ok = window.confirm(
      `「${card.plan.title}」 계획과 일정·읽음 기록 ${card.progress.totalDays}일치를 삭제합니다.\n(기도제목으로 저장한 일지는 남습니다.)\n삭제할까요?`,
    )
    if (!ok) return
    setBusy(card.plan.id)
    setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from('reading_plans').delete().eq('id', card.plan.id)
    setBusy(null)
    if (error) {
      setMsg('삭제 실패: ' + error.message)
      return
    }
    router.refresh()
  }

  if (initial.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 text-center">
        <p className="text-base font-semibold text-primary">아직 통독 계획이 없습니다</p>
        <p className="mt-2 text-sm text-muted">「+ 새 계획」으로 첫 계획을 세워 보세요.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {msg && <p className="text-sm text-danger">{msg}</p>}
      {initial.map((card) => {
        const { plan, progress } = card
        const completed = progress.completed || !!plan.completed_at
        const status = completed
          ? { label: '완독', cls: 'bg-status-done text-on-status-done' }
          : plan.is_active
            ? { label: '활성', cls: 'bg-status-progress text-on-status-progress' }
            : { label: '대기', cls: 'bg-surface-subtle text-muted' }
        const isBusy = busy === plan.id
        return (
          <section
            key={plan.id}
            className={`rounded-3xl border bg-surface p-4 ${plan.is_active ? 'border-accent' : 'border-line'} ${completed && !plan.is_active ? 'opacity-70' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="truncate text-[15px] font-bold text-ink">{plan.title}</h2>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>{status.label}</span>
            </div>
            <p className="mt-1 text-[12px] text-muted">{planCondition(plan)}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-subtle">
              <div className="h-full rounded-full bg-accent" style={{ width: `${progress.pct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px] text-muted">
              <span>
                {progress.doneDays}/{progress.totalDays}일 · {progress.doneChapters.toLocaleString()}장 읽음 · {progress.pct}%
              </span>
              <div className="flex items-center gap-3">
                {!plan.is_active && !completed && (
                  <button
                    type="button"
                    onClick={() => activate(plan.id)}
                    disabled={isBusy}
                    className="rounded-full border border-line px-3 py-1 text-[11px] font-semibold text-primary transition hover:border-primary disabled:opacity-50"
                  >
                    {isBusy ? '전환 중…' : '활성으로 전환'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(card)}
                  disabled={isBusy}
                  className="text-[11px] text-faint underline-offset-2 hover:text-danger hover:underline disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
