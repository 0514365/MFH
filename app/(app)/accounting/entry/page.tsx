// MFH-ACCOUNTING-ENTRY-PAGE-V3
// 회계 기록(기록 탭) — 승인대기 배너(카드 문자) + CSV 일괄입력 + 입력·수정 폼 + 최근 입력. 셸은 ../layout.tsx 담당.
import { getAcctOptions, getRecentInout } from '@/lib/accounting-db'
import { getInboxPendingCount } from '@/lib/card-inbox-db'
import AccountingForm from '../AccountingForm'
import CsvImport from '../CsvImport'
import InboxBanner from '../InboxBanner'

export const dynamic = 'force-dynamic'

export default async function AccountingEntryPage() {
  const [options, recent, pending] = await Promise.all([
    getAcctOptions(),
    getRecentInout().then((r) => r ?? []),
    getInboxPendingCount(),
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
      <CsvImport options={options} />
      <AccountingForm options={options} recent={recent} />
    </>
  )
}
