// MFH-ACCOUNTING-PAGE-V2
// 회계 입력 페이지 — 입력·수정·삭제 폼 + 최근 거래(AccountingForm 통합). 마스터 전용. 노션(SoT) read/write.
// 데스크탑(md+): 넓은 폭. 모바일: 세로.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isMaster } from '@/lib/members'
import { getAcctOptions, getRecentInout, getAccountBalances } from '@/lib/notion'
import BackButton from '@/components/BackButton'
import AccountingForm from './AccountingForm'
import AccountingSummary from './AccountingSummary'
import '../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

export default async function AccountingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isMaster(user.id)) redirect('/')

  const [options, recent, balances] = await Promise.all([
    getAcctOptions(),
    getRecentInout().then((r) => r ?? []),
    getAccountBalances().then((b) => b ?? []),
  ])

  return (
    <main className="app-theme mx-auto max-w-md px-4 pb-12 pt-2 md:max-w-5xl md:px-6">
      <header
        className="sticky top-0 z-30 -mx-4 mb-4 border-b border-line px-4 py-3 md:-mx-6 md:px-6"
        style={{ background: 'var(--paper)' }}
      >
        <div className="flex items-center gap-2">
          <div className="shrink-0">
            <BackButton href="/" label="홈" variant="icon-accent" />
          </div>
          <h1 className="flex-1 text-center text-[18px] font-bold tracking-tight text-ink md:text-left">
            회계 입력
          </h1>
          <span className="w-10 shrink-0 md:hidden" aria-hidden="true" />
        </div>
      </header>

      {options ? (
        <>
          <AccountingSummary recent={recent} balances={balances} />
          <AccountingForm options={options} recent={recent} />
        </>
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-faint">
          노션 회계 연동이 필요합니다 (NOTION_TOKEN 미설정).
        </p>
      )}
    </main>
  )
}
