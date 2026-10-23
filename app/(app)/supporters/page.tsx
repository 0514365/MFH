// MFH-SUPPORTERS-SUMMARY-V2 — 2027(4-7): theme-2027 · 남색 글자 · 연회색/살구 면 · 강조 = 진한 살구 · 굵기 600 이하.
// MFH-SUPPORTERS-SUMMARY-V1
// 후원자 현황(현황 탭) — 통계 4카드 + 이번 달 생일 + 통합발송. 셸은 ./layout.tsx 담당.
// 목록은 /supporters/list, AI 분석은 /supporters/insights 로 분리.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Supporter } from '@/lib/types'
import { formatUsd } from '@/lib/supporters'
import { canManageFinance } from '@/lib/members'
import { getSupporterDonationTotals } from '@/lib/accounting-db'
import BulkMailButton from './BulkMailButton'

export const dynamic = 'force-dynamic'

export default async function SupportersSummaryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!canManageFinance(user.id)) redirect('/')

  const { data } = await supabase
    .from('supporters')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })
  const supporters = (data ?? []) as Supporter[]

  // 후원자별 헌금 USD 합계 — 장부(acct_inout) 집계.
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })
  const ymStr = today.slice(0, 7)
  const totals = await getSupporterDonationTotals()
  const yearUsd = totals?.yearUsd ?? 0
  const monthUsd = totals?.monthUsd ?? 0
  const activeCount = supporters.filter((s) => s.is_active).length
  const recurringCount = supporters.filter((s) => s.is_active && s.is_recurring).length

  // 통합 발송 대상 — 활성 + 이메일 보유 후원자 주소.
  const mailRecipients = supporters
    .filter((s) => s.is_active && s.email && s.email.trim())
    .map((s) => (s.email as string).trim())

  // 이번 달 생일(활성 후원자, birth_date 의 월이 이번 달). 일(day) 오름차순.
  const thisMonth = ymStr.slice(5, 7)
  const birthdays = supporters
    .filter((s) => s.is_active && s.birth_date && s.birth_date.slice(5, 7) === thisMonth)
    .map((s) => ({ name: s.name, date: s.birth_date as string }))
    .sort((a, b) => a.date.slice(8, 10).localeCompare(b.date.slice(8, 10)))

  return (
    <>
      {supporters.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-1.5 @2xl:grid-cols-4">
          <div className="rounded-2xl bg-b27-tint-3 p-3.5" style={{ color: 'var(--b27-deep-3)' }}>
            <div className="text-[12px] font-medium">후원자</div>
            <div className="mt-1 font-num text-[24px] font-semibold leading-tight">
              {activeCount}
              <span className="ml-0.5 text-[13px] font-medium">명</span>
            </div>
          </div>
          <div className="rounded-2xl bg-b27-tint-3 p-3.5" style={{ color: 'var(--b27-deep-3)' }}>
            <div className="text-[12px] font-medium">정기후원</div>
            <div className="mt-1 font-num text-[24px] font-semibold leading-tight">
              {recurringCount}
              <span className="ml-0.5 text-[13px] font-medium">명</span>
            </div>
          </div>
          <div className="rounded-2xl bg-b27-card p-3.5">
            <div className="text-[12px] font-medium text-b27-muted">올해 누계</div>
            <div className="mt-1 font-num text-[20px] font-semibold leading-tight text-b27-ink">{formatUsd(yearUsd)}</div>
          </div>
          <div className="rounded-2xl bg-b27-card p-3.5">
            <div className="text-[12px] font-medium text-b27-muted">이번 달</div>
            <div className="mt-1 font-num text-[20px] font-semibold leading-tight text-b27-ink">{formatUsd(monthUsd)}</div>
          </div>
        </div>
      )}

      {birthdays.length > 0 && (
        <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-b27-tint-7 px-4 py-3">
          <span className="shrink-0 text-[#A91E30]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="8" width="18" height="4" rx="1" />
              <path d="M12 8v13" />
              <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
              <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8" />
              <path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
            </svg>
          </span>
          <div className="text-sm text-b27-ink">
            <span className="font-medium text-[#A91E30]">이번 달 생일</span>
            <span className="text-b27-muted">
              {' · '}
              {birthdays.map((b) => `${b.name}(${Number(b.date.slice(8, 10))}일)`).join(', ')}
            </span>
          </div>
        </div>
      )}

      {supporters.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-b27-muted">
          아직 후원자가 없습니다.
          <br />
          아래 등록 탭에서 첫 후원자를 추가해 보세요.
        </p>
      ) : (
        <BulkMailButton emails={mailRecipients} />
      )}
    </>
  )
}
