// MFH-ACCOUNTING-PAGE-V5
// 회계 요약 대시보드(요약 탭) — 이번달 수입/지출/순액·계좌잔액(AccountingSummary) + 빠른 이동 + Today(거래일 오늘).
// 셸(가드·헤더·4탭 네비)은 layout.tsx 담당. 입력은 /accounting/entry, 전체 내역은 /accounting/ledger.
import Link from 'next/link'
import { getAcctOptions, getRecentInout, getAccountBalances } from '@/lib/notion'
import AccountingSummary from './AccountingSummary'
import TodayList from './TodayList'

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

      {/* 빠른 이동 — 새 기록(주요 CTA·accent) + 거래내역·분석 */}
      <div className="mb-5 space-y-3">
        <Link
          href="/accounting/entry"
          className="flex h-11 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white transition active:scale-[0.98]"
        >
          + 새 기록
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/accounting/ledger"
            className="flex h-11 items-center justify-center rounded-xl border border-line bg-surface text-sm font-medium text-ink transition hover:border-primary active:scale-[0.98]"
          >
            거래내역
          </Link>
          <Link
            href="/accounting/report"
            className="flex h-11 items-center justify-center rounded-xl border border-line bg-surface text-sm font-medium text-ink transition hover:border-primary active:scale-[0.98]"
          >
            분석
          </Link>
        </div>
      </div>

      {/* 오늘(거래일) 거래 — 클라이언트 로컬 기준 */}
      <TodayList recent={recent} items={options.items} />
    </>
  )
}
