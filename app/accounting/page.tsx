// MFH-ACCOUNTING-PAGE-V3
// 회계 요약 진입(현재는 입력·내역 통합 유지) — 셸(가드·헤더·네비)은 layout.tsx 가 담당.
// TODO(단계 b): 요약 대시보드로 재구성. 입력 폼은 단계 c(/accounting/entry)로 이동.
import { getAcctOptions, getRecentInout, getAccountBalances } from '@/lib/notion'
import AccountingForm from './AccountingForm'
import AccountingSummary from './AccountingSummary'
import CsvImport from './CsvImport'

export const dynamic = 'force-dynamic'

export default async function AccountingPage() {
  const [options, recent, balances] = await Promise.all([
    getAcctOptions(),
    getRecentInout().then((r) => r ?? []),
    getAccountBalances().then((b) => b ?? []),
  ])

  if (!options) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-faint">
        노션 회계 연동이 필요합니다 (NOTION_TOKEN 미설정).
      </p>
    )
  }

  return (
    <>
      <AccountingSummary recent={recent} balances={balances} />
      <CsvImport options={options} />
      <AccountingForm options={options} recent={recent} />
    </>
  )
}
