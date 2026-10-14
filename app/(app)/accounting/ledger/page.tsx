// MFH-ACCOUNTING-LEDGER-PAGE-V2
// 회계 내역(내역 탭) — 전체 거래 + 검색·필터 강화(LedgerView→TransactionList). 셸은 ../layout.tsx 담당.
import { getAcctOptions, getRecentInout } from '@/lib/accounting-db'
import LedgerView from './LedgerView'

export const dynamic = 'force-dynamic'

export default async function AccountingLedgerPage() {
  const [options, recent] = await Promise.all([
    getAcctOptions(),
    getRecentInout().then((r) => r ?? []),
  ])

  if (!options) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-faint">
        회계 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.
      </p>
    )
  }

  return <LedgerView recent={recent} options={options} />
}
