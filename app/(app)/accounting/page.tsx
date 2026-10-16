// MFH-ACCOUNTING-PAGE-V7 — 회계 홈 = 달력(CalendarHome, 위플형). 잔액은 자산 탭(/accounting/assets)으로 이동.
// 셸(가드·헤더·4탭 + ＋ 네비)은 layout.tsx 담당. ?d=YYYY-MM-DD = 선택일(＋ 버튼·수정 후 복귀용).
import { getAcctOptions, getRecentInout, getAccountBalances, getFxInfo } from '@/lib/accounting-db'
import CalendarHome from './CalendarHome'

export const dynamic = 'force-dynamic'

export default async function AccountingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}
  const d = typeof sp.d === 'string' ? sp.d : undefined
  const [options, recent, balances, fx] = await Promise.all([
    getAcctOptions(),
    getRecentInout().then((r) => r ?? []),
    getAccountBalances().then((b) => b ?? []),
    getFxInfo(),
  ])

  if (!options) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-faint">
        회계 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.
      </p>
    )
  }

  return <CalendarHome recent={recent} options={options} balances={balances} fx={fx} initialDate={d} />
}
