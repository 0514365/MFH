// MFH-ACCOUNTING-ENTRY-PAGE-V7 — 카드 미상환(CardRepayButton)은 md 이상만(모바일은 달력 카드대금 「상환」·「잔액 0」 버튼)
// MFH-ACCOUNTING-ENTRY-PAGE-V6 — 모바일(<md)은 QuickEntry(위플형 3단계, 전체 화면). ?edit= · ?full=1 은 기존 폼. 데스크탑은 기존 폼 그대로
// MFH-ACCOUNTING-ENTRY-PAGE-V5 — 공시 환율(getFxInfo) → 입력 폼 잠정 환산
// MFH-ACCOUNTING-ENTRY-PAGE-V4 — 카드대금 상환 도우미(CardRepayButton)
// 회계 기록(기록 탭) — 승인대기 배너(카드 문자) + 카드대금 상환 + CSV 일괄입력 + 입력·수정 폼 + 최근 입력. 셸은 ../layout.tsx 담당.
import { getAcctOptions, getRecentInout, getAccountBalances, getFxInfo } from '@/lib/accounting-db'
import { getInboxPendingCount } from '@/lib/card-inbox-db'
import { getRecurringDueCount } from '@/lib/recurring-db'
import AccountingForm from '../AccountingForm'
import CsvImport from '../CsvImport'
import CardRepayButton from '../CardRepayButton'
import InboxBanner from '../InboxBanner'
import QuickEntry from '../QuickEntry'

export const dynamic = 'force-dynamic'

export default async function AccountingEntryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const quick = !str(sp.edit) && str(sp.full) !== '1'
  const date = str(sp.date)
  const [options, recent, pending, balances, recurring, fx] = await Promise.all([
    getAcctOptions(),
    getRecentInout().then((r) => r ?? []),
    getInboxPendingCount(),
    getAccountBalances().then((b) => b ?? []),
    getRecurringDueCount(),
    getFxInfo(),
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
      {quick && <QuickEntry options={options} fx={fx} initialDate={date} />}
      <div className={quick ? 'max-md:hidden' : ''}>
        <InboxBanner count={pending} recurring={recurring} />
        <div className="max-md:hidden">
          <CardRepayButton balances={balances} options={options} />
        </div>
        <CsvImport options={options} />
        <AccountingForm options={options} recent={recent} fx={fx} />
      </div>
    </>
  )
}
