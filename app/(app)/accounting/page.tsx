// MFH-ACCOUNTING-PAGE-V10 — 2027 실기 피드백: 승인대기 건수(카드 문자·반복) 다시 조회 → 달력 제목 줄 아래 한 줄(탭 배지와 병행)
// MFH-ACCOUNTING-PAGE-V9 — 2027 Minimal Block: 승인대기 배너 제거(탭바 배지로) → 건수 조회 불필요
// MFH-ACCOUNTING-PAGE-V8 — 승인대기(카드 문자·반복) 건수 → 달력 아래 배너
// MFH-ACCOUNTING-PAGE-V7 — 회계 홈 = 달력(CalendarHome, 위플형). 잔액은 자산 탭(/accounting/assets)으로 이동.
// 셸(가드·헤더·4탭 + ＋ 네비)은 layout.tsx 담당. ?d=YYYY-MM-DD = 선택일(＋ 버튼·수정 후 복귀용).
import { getAcctOptions, getRecentInout, getAccountBalances, getFxInfo } from '@/lib/accounting-db'
import { getInboxPendingCount } from '@/lib/card-inbox-db'
import { getRecurringDueCount } from '@/lib/recurring-db'
import CalendarHome from './CalendarHome'

export const dynamic = 'force-dynamic'

export default async function AccountingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}
  const d = typeof sp.d === 'string' ? sp.d : undefined
  const [options, recent, balances, fx, cardPending, recPending] = await Promise.all([
    getAcctOptions(),
    getRecentInout().then((r) => r ?? []),
    getAccountBalances().then((b) => b ?? []),
    getFxInfo(),
    getInboxPendingCount(),
    getRecurringDueCount(),
  ])

  if (!options) {
    return (
      <p className="rounded-2xl bg-b27-card px-4 py-6 text-center text-sm text-b27-muted">
        회계 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.
      </p>
    )
  }

  return <CalendarHome recent={recent} options={options} balances={balances} fx={fx} initialDate={d} cardPending={cardPending} recPending={recPending} />
}
