// MFH-ACCOUNTING-ENTRY-PAGE-V4 — 카드대금 상환 도우미(CardRepayButton)
// 회계 기록(기록 탭) — 승인대기 배너(카드 문자) + 카드대금 상환 + CSV 일괄입력 + 입력·수정 폼 + 최근 입력. 셸은 ../layout.tsx 담당.
import { getAcctOptions, getRecentInout, getAccountBalances } from '@/lib/accounting-db'
import { getInboxPendingCount } from '@/lib/card-inbox-db'
import AccountingForm from '../AccountingForm'
import CsvImport from '../CsvImport'
import InboxBanner from '../InboxBanner'
import CardRepayButton from '../CardRepayButton'

export const dynamic = 'force-dynamic'

export default async function AccountingEntryPage() {
  const [options, recent, pending, balances] = await Promise.all([
    getAcctOptions(),
    getRecentInout().then((r) => r ?? []),
    getInboxPendingCount(),
    getAccountBalances().then((b) => b ?? []),
  ])

  if (!options) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-faint">
        회계 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.
      </p>
    )
  }

  return (
    <>
      <InboxBanner count={pending} />
      <CardRepayButton balances={balances} options={options} />
      <CsvImport options={options} />
      <AccountingForm options={options} recent={recent} />
    </>
  )
}
