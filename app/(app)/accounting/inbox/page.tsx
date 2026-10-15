// MFH-CARD-INBOX-PAGE-V2 — 반복 기록 승인대기(RecurringDueSection) 상단 배치
// MFH-CARD-INBOX-PAGE-V1
// 승인대기(카드 문자) — 매일 22:00 수집된 Ficohsa 카드 거래를 항목·적요·계좌·환율 확인 후 승인/무시. 셸은 ../layout.tsx.
import { getAcctOptions } from '@/lib/accounting-db'
import { getInboxPending, getLastSmsRate } from '@/lib/card-inbox-db'
import InboxView from './InboxView'
import RecurringDueSection from './RecurringDueSection'
import { getRecurringDue, listRecurringRules } from '@/lib/recurring-db'

export const dynamic = 'force-dynamic'

export default async function AccountingInboxPage() {
  const [options, rows, rate, dues, rules] = await Promise.all([getAcctOptions(), getInboxPending(), getLastSmsRate(), getRecurringDue(), listRecurringRules()])

  if (!options || rows == null) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-faint">
        승인대기 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.
      </p>
    )
  }

  return (
    <>
      <RecurringDueSection dues={dues ?? []} rules={rules ?? []} options={options} />
      <InboxView rows={rows} options={options} defaultRate={rate} />
    </>
  )
}
