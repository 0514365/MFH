// MFH-ACCOUNTING-REPORT-PAGE-V3 — 공시 환율(getFxInfo) 전달
// MFH-ACCOUNTING-REPORT-PAGE-V2
// 회계 분석(리포트) — 셸(가드·헤더·네비)은 ../layout.tsx 가 담당. 장부 read → ReportView 집계.
import { getAcctOptions, getRecentInout, getAccountBalances, getFxInfo } from '@/lib/accounting-db'
import ReportView from './ReportView'

export const dynamic = 'force-dynamic'

export default async function AccountingReportPage() {
  const [options, recent, balances, fx] = await Promise.all([
    getAcctOptions(),
    getRecentInout().then((r) => r ?? []),
    getAccountBalances().then((b) => b ?? []),
    getFxInfo(),
  ])

  if (!options) {
    return (
      <p className="rounded-2xl bg-b27-card px-4 py-6 text-center text-sm text-b27-muted">
        회계 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.
      </p>
    )
  }

  return <ReportView recent={recent} options={options} balances={balances} fx={fx} />
}
