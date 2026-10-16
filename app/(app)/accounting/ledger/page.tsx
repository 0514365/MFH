// MFH-ACCOUNTING-LEDGER-PAGE-V4 — ?account 계좌 필터(자산 탭 딥링크)
// MFH-ACCOUNTING-LEDGER-PAGE-V3 — ?gubun·cat·item·from·to·q 쿼리 → 필터 선적용(분석 탭 딥링크)
// MFH-ACCOUNTING-LEDGER-PAGE-V2
// 회계 내역(내역 탭) — 전체 거래 + 검색·필터 강화(LedgerView→TransactionList). 셸은 ../layout.tsx 담당.
import { getAcctOptions, getRecentInout } from '@/lib/accounting-db'
import LedgerView from './LedgerView'

export const dynamic = 'force-dynamic'

export default async function AccountingLedgerPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}
  const one = (k: string) => {
    const v = sp[k]
    return typeof v === 'string' && v ? v : undefined
  }
  const initialFilter = { gubun: one('gubun'), cat: one('cat'), item: one('item'), from: one('from'), to: one('to'), q: one('q'), account: one('account') }
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

  return <LedgerView recent={recent} options={options} initialFilter={initialFilter} />
}
