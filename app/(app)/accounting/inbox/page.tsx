// MFH-CARD-INBOX-PAGE-V4 — 환율 기본값 = 공시 환율(getFxInfo, 없으면 마지막 승인값). 최종 환산은 DB 트리거(patch116)
// MFH-CARD-INBOX-PAGE-V3 — 카드 자동 승인(AutoApprovedSection: 최근 7일 + 상점 사전) — patch110 전이면 숨김
// MFH-CARD-INBOX-PAGE-V2 — 반복 기록 승인대기(RecurringDueSection) 상단 배치
// MFH-CARD-INBOX-PAGE-V1
// 승인대기(카드 문자) — 매일 22:00 수집된 Ficohsa 카드 거래를 항목·적요·계좌·환율 확인 후 승인/무시. 셸은 ../layout.tsx.
import { getAcctOptions, getFxInfo } from '@/lib/accounting-db'
import { getInboxPending, getLastSmsRate, getAutoApproved, listMerchantRules } from '@/lib/card-inbox-db'
import InboxView from './InboxView'
import RecurringDueSection from './RecurringDueSection'
import AutoApprovedSection from './AutoApprovedSection'
import { getRecurringDue, listRecurringRules } from '@/lib/recurring-db'

export const dynamic = 'force-dynamic'

export default async function AccountingInboxPage() {
  const [options, rows, lastRate, dues, rules, autoRows, merchantRules, fx] = await Promise.all([
    getAcctOptions(),
    getInboxPending(),
    getLastSmsRate(),
    getRecurringDue(),
    listRecurringRules(),
    getAutoApproved(7),
    listMerchantRules(),
    getFxInfo(),
  ])
  const hnl = fx.find((f) => f.currency === 'HNL')
  const krw = fx.find((f) => f.currency === 'KRW')

  if (!options || rows == null) {
    return (
      <p className="rounded-2xl bg-b27-card px-4 py-6 text-center text-sm text-b27-muted">
        승인대기 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.
      </p>
    )
  }

  return (
    <>
      <RecurringDueSection dues={dues ?? []} rules={rules ?? []} options={options} />
      {autoRows && merchantRules && <AutoApprovedSection rows={autoRows} rules={merchantRules} options={options} />}
      <InboxView rows={rows} options={options} defaultRate={hnl?.rate ?? lastRate} defaultRateKrw={krw?.rate ?? 1400} fxDate={hnl?.date ?? null} />
    </>
  )
}
