// MFH-ACCOUNTING-ENTRY-PAGE-V2
// 회계 기록(기록 탭) — CSV 일괄입력 + 입력·수정 폼 + 거래 목록(편집). 셸은 ../layout.tsx 담당.
// TODO(단계 d): 목록을 '오늘 입력분'으로 좁히고, 전체 내역은 /accounting/ledger 에서 수정 → 여기로 이동(?edit=id).
import { getAcctOptions, getRecentInout } from '@/lib/accounting-db'
import AccountingForm from '../AccountingForm'
import CsvImport from '../CsvImport'

export const dynamic = 'force-dynamic'

export default async function AccountingEntryPage() {
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

  return (
    <>
      <CsvImport options={options} />
      <AccountingForm options={options} recent={recent} />
    </>
  )
}
