// MFH-ACCOUNTING-ASSETS-PAGE-V1
// 회계 자산 탭 — 계좌 잔액(통화·카드 그룹 · 공시 환율 평가 · 자산/부채/순자산 · + 계좌). 기존 요약 탭의 잔액 카드를 그대로 이동(리디자인은 c단계).
import { getAccountBalances, getFxInfo } from '@/lib/accounting-db'
import AccountingSummary from '../AccountingSummary'

export const dynamic = 'force-dynamic'

export default async function AccountingAssetsPage() {
  const [balances, fx] = await Promise.all([getAccountBalances().then((b) => b ?? []), getFxInfo()])
  return <AccountingSummary balances={balances} fx={fx} />
}
