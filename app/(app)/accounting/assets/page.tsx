// MFH-ACCOUNTING-ASSETS-PAGE-V2 — 위플형 자산 탭(c단계): AssetsView(순자산·구성 띠·그룹 카드·신용카드 상환·환율). 마감 환율(fx_closings) 전달
// MFH-ACCOUNTING-ASSETS-PAGE-V1
import { getAccountBalances, getAcctOptions, getFxInfo } from '@/lib/accounting-db'
import { createClient } from '@/lib/supabase-server'
import { getClosings } from '@/lib/fx'
import AssetsView from './AssetsView'

export const dynamic = 'force-dynamic'

export default async function AccountingAssetsPage() {
  const sb = await createClient()
  const [balances, fx, closings, options] = await Promise.all([
    getAccountBalances().then((b) => b ?? []),
    getFxInfo(),
    getClosings(sb),
    getAcctOptions(),
  ])
  return (
    <AssetsView
      balances={balances}
      fx={fx}
      closings={closings.map((c) => ({ ym: c.ym, currency: c.currency, rate: c.rate }))}
      options={options}
    />
  )
}
