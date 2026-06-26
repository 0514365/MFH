// MFH-ACCOUNTING-PAGE-V4
// 회계 요약 대시보드(요약 탭) — 이번달 수입/지출/순액·계좌잔액(AccountingSummary) + 최근 거래 5건 + 빠른 이동.
// 셸(가드·헤더·4탭 네비)은 layout.tsx 담당. 입력은 /accounting/entry, 전체 내역은 /accounting/ledger.
import Link from 'next/link'
import { getAcctOptions, getRecentInout, getAccountBalances } from '@/lib/notion'
import AccountingSummary from './AccountingSummary'

export const dynamic = 'force-dynamic'

function fmtUsd(n: number | null): string {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

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

  const nameOf = new Map<string, string>()
  for (const i of [...options.items['수입'], ...options.items['지출']]) nameOf.set(i.id, i.name)
  const latest = [...recent].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 5)

  return (
    <>
      <AccountingSummary recent={recent} balances={balances} />

      {/* 빠른 이동 — 기록(주요 CTA·accent) / 내역 */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <Link
          href="/accounting/entry"
          className="flex h-11 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white transition active:scale-[0.98]"
        >
          + 새 기록
        </Link>
        <Link
          href="/accounting/ledger"
          className="flex h-11 items-center justify-center rounded-xl border border-line bg-surface text-sm font-medium text-ink transition hover:border-primary active:scale-[0.98]"
        >
          전체 내역
        </Link>
      </div>

      {/* 최근 거래 5건 */}
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
            Recent
          </span>
          <Link
            href="/accounting/ledger"
            className="text-[11px] font-medium text-muted hover:text-primary"
          >
            전체 내역 →
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="py-3 text-center text-xs text-faint">거래가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-line">
            {latest.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      r.gubun === '수입'
                        ? 'bg-emerald-50 text-emerald-700'
                        : r.gubun === '지출'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-surface-subtle text-faint'
                    }`}
                  >
                    {r.gubun ?? '—'}
                  </span>
                  <span className="truncate text-sm text-ink">
                    {r.itemId ? (nameOf.get(r.itemId) ?? '') : ''}
                    {r.name ? <span className="text-muted"> · {r.name}</span> : ''}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`font-display text-sm font-bold ${
                      r.gubun === '지출' ? 'text-red-700' : 'text-ink'
                    }`}
                  >
                    {fmtUsd(r.amountUsd)}
                  </span>
                  <span className="hidden text-[11px] text-faint sm:inline">{r.date ?? ''}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
