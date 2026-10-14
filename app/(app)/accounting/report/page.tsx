// MFH-ACCOUNTING-REPORT-PAGE-V2
// 회계 분석(리포트) — 셸(가드·헤더·네비)은 ../layout.tsx 가 담당. 장부 read → ReportView 집계.
import { getAcctOptions, getRecentInout, getAccountBalances } from '@/lib/accounting-db'
import ReportView from './ReportView'

export const dynamic = 'force-dynamic'

export default async function AccountingReportPage() {
  const [options, recent, balances] = await Promise.all([
    getAcctOptions(),
    getRecentInout().then((r) => r ?? []),
    getAccountBalances().then((b) => b ?? []),
  ])

  if (!options) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-faint">
        회계 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.
      </p>
    )
  }

  return <ReportView recent={recent} options={options} balances={balances} />
}
