// MFH-ACCOUNTING-PAGE-V1
// 회계 입력 페이지 — 첫 화면 = 입력 폼 + 최근 거래. 마스터 전용. 노션(SoT) read/write.
// 데스크탑(md+): 넓은 폭 + 스프레드시트형 폼 + 테이블. 모바일: 세로 폼 + 카드.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isMaster } from '@/lib/members'
import { getAcctOptions, getRecentInout } from '@/lib/notion'
import BackButton from '@/components/BackButton'
import AccountingForm from './AccountingForm'
import '../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

function fmtUsd(n: number | null): string {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function AccountingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isMaster(user.id)) redirect('/')

  const options = await getAcctOptions()
  const recent = (await getRecentInout(15)) ?? []

  // 항목·계좌 id → 이름(최근 거래 표시용).
  const nameOf = new Map<string, string>()
  if (options) {
    for (const i of [...options.items['수입'], ...options.items['지출']]) nameOf.set(i.id, i.name)
    for (const a of options.accounts) nameOf.set(a.id, a.name)
  }

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
        <section className="rounded-2xl border border-line bg-surface p-4 md:p-5">
          <div className="mb-3 font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
            New entry
          </div>
          <AccountingForm options={options} />
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-faint">
          노션 회계 연동이 필요합니다 (NOTION_TOKEN 미설정).
        </p>
      )}

      <section className="mt-6">
        <h2 className="mb-2 px-1 text-[13px] font-bold text-muted">최근 거래</h2>
        {recent.length === 0 ? (
          <p className="py-4 text-center text-xs text-faint">거래가 없습니다.</p>
        ) : (
          <>
            {/* 데스크탑 — 테이블 */}
            <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-subtle text-left text-[11px] text-faint">
                    <th className="px-3 py-2 font-medium">구분</th>
                    <th className="px-3 py-2 font-medium">날짜</th>
                    <th className="px-3 py-2 font-medium">항목</th>
                    <th className="px-3 py-2 font-medium">이름</th>
                    <th className="px-3 py-2 text-right font-medium">환산 (USD)</th>
                    <th className="px-3 py-2 font-medium">계좌</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r, idx) => (
                    <tr key={idx} className="border-b border-line last:border-0">
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.gubun === '수입' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                        >
                          {r.gubun ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted">{r.date ?? '—'}</td>
                      <td className="px-3 py-2 text-ink">{r.itemId ? (nameOf.get(r.itemId) ?? '—') : '—'}</td>
                      <td className="px-3 py-2 text-ink">{r.name ?? '—'}</td>
                      <td className="px-3 py-2 text-right font-display font-bold text-ink">{fmtUsd(r.amountUsd)}</td>
                      <td className="px-3 py-2 text-muted">{r.accountId ? (nameOf.get(r.accountId) ?? '—') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 모바일 — 카드 */}
            <ul className="space-y-2 md:hidden">
              {recent.map((r, idx) => (
                <li key={idx} className="rounded-xl border border-line bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.gubun === '수입' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                    >
                      {r.gubun ?? '—'}
                    </span>
                    <span className="font-display text-[14px] font-bold text-ink">{fmtUsd(r.amountUsd)}</span>
                  </div>
                  <div className="mt-1 text-sm text-ink">
                    {r.itemId ? (nameOf.get(r.itemId) ?? '') : ''}
                    {r.name ? ` · ${r.name}` : ''}
                  </div>
                  <div className="mt-0.5 text-xs text-faint">
                    {r.date ?? ''}
                    {r.accountId ? ` · ${nameOf.get(r.accountId) ?? ''}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  )
}
