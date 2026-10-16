'use client'
// MFH-ACCOUNTING-ASSETS-VIEW-V2 — 계좌 행에 「예정」(오늘 이후 날짜 거래, 잔액 미포함) 표시
// MFH-ACCOUNTING-ASSETS-VIEW-V1
// 위플형 자산 탭(c단계) — 순자산 큰 숫자(자산·부채) · L/$ 토글(통계·달력과 공유) · 자산 구성 띠(달러·원화·렘피라)
//   → 그룹 카드(계좌 행: 색 원 + 흰 아이콘 · 평가액 · 원통화 실보유 · 장부 차이, 탭 = 그 계좌 내역)
//   → 신용카드 카드(미상환 + 상환 입력·잔액 0 맞춤) → 하단 적용 공시·마감 환율 · 평가손익 · + 계좌.
// 금액 = 공시 환율 평가액(valueUsd, 없으면 장부가). L 표시 = 렘피라 계좌는 실보유 그대로, 그 외는 평가 USD × HNL 공시.
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, CreditCard, Landmark, PiggyBank, type LucideIcon } from 'lucide-react'
import type { AccountBalance, AcctOptions, FxInfo } from '@/lib/accounting-types'
import { hnlRateOf, useShowCur, type ShowCur } from '@/lib/acct-display'
import AccountAddForm from '../AccountAddForm'
import CardRepayButton from '../CardRepayButton'
import { fmtLocal, shownUsd, summarize } from '../BalanceGroups'

type GroupKey = 'USD' | 'KRW' | 'HNL' | 'CARD'
const GROUPS: { key: GroupKey; label: string; color: string }[] = [
  { key: 'USD', label: '달러', color: '#7FA6DE' },
  { key: 'KRW', label: '원화', color: '#9C8AD8' },
  { key: 'HNL', label: '렘피라', color: '#6FBF98' },
  { key: 'CARD', label: '신용카드', color: '#E5847A' },
]
const groupOf = (b: AccountBalance): GroupKey =>
  b.kind === '신용카드' ? 'CARD' : b.currency === 'KRW' ? 'KRW' : b.currency === 'HNL' ? 'HNL' : 'USD'

function iconOf(b: AccountBalance): LucideIcon {
  if (b.kind === '신용카드') return CreditCard
  if (b.name.includes('현금')) return Banknote
  if (b.name.includes('예치') || b.name.includes('청약') || b.name.includes('임시')) return PiggyBank
  return Landmark
}
const shortName = (b: AccountBalance) => (b.kind === '신용카드' ? b.name.replace(' 신용카드 ', ' ') : b.name)

const MD = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`
const SRC: Record<string, string> = { bch: 'BCH', koreaexim: '수출입은행', manual: '수동' }

export type ClosingInfo = { ym: string; currency: string; rate: number }

export default function AssetsView({
  balances,
  fx,
  closings,
  options,
}: {
  balances: AccountBalance[]
  fx: FxInfo[]
  closings: ClosingInfo[]
  options: AcctOptions | null
}) {
  const router = useRouter()
  const [cur, setCur] = useShowCur()
  const hnlRate = useMemo(() => hnlRateOf(fx, balances), [fx, balances])
  const showCur: ShowCur = hnlRate ? cur : 'USD'
  const [adding, setAdding] = useState(false)

  // 표시 금액 — L: 렘피라 단일 통화 계좌는 실보유 그대로, 그 외 평가 USD × HNL 공시.
  const show = (b: AccountBalance): number => {
    if (showCur === 'USD' || !hnlRate) return shownUsd(b)
    const onlyHnl = b.holdings.length > 0 && b.holdings.every((h) => h.currency === 'HNL')
    return onlyHnl && b.balanceLocal != null ? b.balanceLocal : shownUsd(b) * hnlRate
  }
  const fmt = (n: number) => {
    const a = Math.abs(n)
    const body =
      showCur === 'HNL'
        ? `L ${Math.round(a).toLocaleString('en-US')}`
        : `$${a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    return n < 0 ? `−${body}` : body
  }
  const toShowUsd = (usd: number) => (showCur === 'HNL' && hnlRate ? usd * hnlRate : usd)

  const { assets, debt, net, fxDiff } = summarize(balances)
  const groups = useMemo(
    () =>
      GROUPS.map((g) => {
        const rows = balances.filter((b) => groupOf(b) === g.key)
        return { ...g, rows, usd: rows.reduce((s, b) => s + shownUsd(b), 0) }
      }).filter((g) => g.rows.length > 0),
    [balances],
  )
  const assetGroups = groups.filter((g) => g.key !== 'CARD')
  const barTotal = assetGroups.reduce((s, g) => s + Math.max(0, g.usd), 0)
  const card = groups.find((g) => g.key === 'CARD')

  const lastClose = useMemo(() => {
    const yms = [...new Set(closings.map((c) => c.ym))].sort()
    const ym = yms[yms.length - 1]
    return ym ? { ym, list: closings.filter((c) => c.ym === ym) } : null
  }, [closings])

  const goAccount = (id: string) => router.push(`/accounting/ledger?account=${id}`)

  const renderRow = (b: AccountBalance, color: string) => {
    const Icon = iconOf(b)
    const v = show(b)
    const usdDiff = b.valueUsd != null ? b.valueUsd - b.balanceUsd : 0
    const localLine =
      b.currency && b.currency !== 'USD' && b.balanceLocal != null && !(showCur === 'HNL' && b.currency === 'HNL')
        ? fmtLocal(b.balanceLocal, b.currency)
        : null
    const up = b.upcoming && Math.abs(b.upcoming.amount) > 0.005 ? b.upcoming : null
    const upLine = up
      ? `예정 ${up.amount > 0 ? '+' : ''}${b.currency && b.currency !== 'USD' ? fmtLocal(up.amount, b.currency) : `${up.amount < 0 ? '−' : ''}$${Math.abs(up.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} (${MD(up.first)}${up.count > 1 ? ` 외 ${up.count - 1}건` : ''})`
      : null
    const subs = [localLine, Math.abs(usdDiff) >= 0.01 ? `장부 $${b.balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null, upLine].filter(Boolean)
    return (
      <li key={b.id}>
        <button type="button" onClick={() => goAccount(b.id)} className="flex w-full items-center gap-3 py-2.5 text-left">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: color }} aria-hidden="true">
            <Icon size={18} strokeWidth={2.3} color="#fff" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">
              {shortName(b)}
              {b.kind === '신용카드' && b.info && <span className="ml-1.5 text-[11px] text-faint">{b.info}</span>}
            </span>
            {subs.length > 0 && <span className="block truncate text-[11px] text-faint">{subs.join(' · ')}</span>}
          </span>
          <span className={`shrink-0 font-display text-[15px] font-bold ${v < 0 ? 'text-red-700' : 'text-ink'}`}>
            {fmt(v)} <span className="text-[12px] font-normal text-faint">›</span>
          </span>
        </button>
      </li>
    )
  }

  if (balances.length === 0) return <p className="py-10 text-center text-sm text-faint">계좌 정보 없음</p>

  return (
    <div className="space-y-4">
      {/* 순자산 */}
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted">순자산</span>
          {hnlRate && (
            <div className="flex rounded-full bg-surface-subtle p-0.5 text-[12px] font-semibold">
              {(['HNL', 'USD'] as ShowCur[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCur(c)}
                  className={`rounded-full px-2.5 py-1 transition ${showCur === c ? 'bg-surface text-primary shadow-soft' : 'text-muted'}`}
                >
                  {c === 'HNL' ? 'L' : '$'}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={`mt-0.5 font-display text-[28px] font-bold ${net < 0 ? 'text-red-700' : 'text-ink'}`}>{fmt(toShowUsd(net))}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface-subtle px-3 py-2">
            <div className="text-[11px] text-faint">자산</div>
            <div className="font-display text-[15px] font-bold text-blue-700">{fmt(toShowUsd(assets))}</div>
          </div>
          <div className="rounded-xl bg-surface-subtle px-3 py-2">
            <div className="text-[11px] text-faint">부채</div>
            <div className="font-display text-[15px] font-bold text-red-700">{fmt(toShowUsd(debt))}</div>
          </div>
        </div>

        {/* 자산 구성 띠 */}
        {barTotal > 0 && (
          <>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-subtle">
              {assetGroups.map((g) => (g.usd > 0 ? <div key={g.key} style={{ width: `${(g.usd / barTotal) * 100}%`, background: g.color }} /> : null))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {assetGroups.map((g) => (
                <span key={g.key} className="flex items-center gap-1 text-[11px] text-muted">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: g.color }} />
                  {g.label} {barTotal > 0 ? Math.round((Math.max(0, g.usd) / barTotal) * 100) : 0}%
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 그룹 카드 */}
      {assetGroups.map((g) => (
        <section key={g.key} className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-bold text-ink">{g.label}</span>
            <span className="font-display text-[13px] font-bold text-muted">{fmt(toShowUsd(g.usd))}</span>
          </div>
          <ul className="mt-1 divide-y divide-line">
            {g.rows.map((b) => renderRow(b, g.color))}
          </ul>
        </section>
      ))}

      {/* 신용카드 */}
      {card && (
        <section className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-bold text-ink">신용카드 · 미상환</span>
            <span className="font-display text-[13px] font-bold text-red-700">{fmt(toShowUsd(card.usd))}</span>
          </div>
          <ul className="mt-1 divide-y divide-line">
            {card.rows.map((b) => renderRow(b, card.color))}
          </ul>
          <div className="mt-2 border-t border-line pt-3">
            <CardRepayButton balances={balances} options={options ?? undefined} actionsOnly />
          </div>
        </section>
      )}

      {/* 환율 · 평가손익 · + 계좌 */}
      <section className="space-y-1 px-1 text-[11px] leading-relaxed text-faint">
        {fx.length > 0 && (
          <div>
            공시 환율{' '}
            {fx
              .map((f) => `${f.currency} ${f.currency === 'KRW' ? f.rate.toLocaleString('en-US', { maximumFractionDigits: 2 }) : f.rate.toFixed(4)} (${MD(f.date)} ${SRC[f.source] ?? f.source})`)
              .join(' · ')}{' '}
            — 이번 달 잠정
          </div>
        )}
        {lastClose && (
          <div>
            {Number(lastClose.ym.slice(5))}월 마감 환율{' '}
            {lastClose.list.map((c) => `${c.currency} ${c.currency === 'KRW' ? c.rate.toLocaleString('en-US') : c.rate.toFixed(4)}`).join(' · ')}
          </div>
        )}
        {Math.abs(fxDiff) >= 0.01 && (
          <div>
            평가손익(장부 대비){' '}
            <b className={fxDiff >= 0 ? 'text-blue-700' : 'text-red-700'}>
              {fxDiff > 0 ? '+' : '−'}${Math.abs(fxDiff).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </b>{' '}
            — 미실현, 장부는 그대로
          </div>
        )}
        <div className="pt-2">
          {adding ? (
            <AccountAddForm onClose={() => setAdding(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="rounded-full border border-line px-3 py-1 text-[12px] font-medium text-muted transition hover:border-primary hover:text-primary"
            >
              + 계좌
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
