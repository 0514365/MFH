'use client'
// MFH-ACCOUNTING-ASSETS-VIEW-V5 — 실기 피드백(단조로움): 순자산 연회색 면 · 통화 그룹 = 띠 색의 연한 면(라벤더·블러시·라군) + 색 사각형·비중 · 카드 그룹 연한 빨강
// MFH-ACCOUNTING-ASSETS-VIEW-V4 — 2027 Minimal Block(c-4b): 순자산 큰 숫자(남색) + 자산·부채 한 줄 + 공용 CurToggle → 통화 구성 띠 한 줄(블록 색)
//   → 그룹은 작은 머리줄(이름 · 소계) + 이름/금액 행(아이콘·카드 테두리 없음, 보조 정보는 11px 회색 줄) → 신용카드 그룹(미상환 빨강, 상환 버튼)
//   → 하단 환율·마감·평가손익·＋ 계좌 글자. 평가 로직(show·summarize·cycle 줄)은 V3 그대로.
// MFH-ACCOUNTING-ASSETS-VIEW-V3 — 신용카드 상환일(N일 상환) · 청구 주기 카드 줄 「MM/DD 상환 … · MM/DD 예정 …」(patch117·118)
// MFH-ACCOUNTING-ASSETS-VIEW-V2 — 계좌 행에 「예정」(오늘 이후 날짜 거래, 잔액 미포함) 표시
// 금액 = 공시 환율 평가액(valueUsd, 없으면 장부가). L 표시 = 렘피라 계좌는 실보유 그대로, 그 외는 평가 USD × HNL 공시.
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountBalance, AcctOptions, FxInfo } from '@/lib/accounting-types'
import { hnlRateOf, useShowCur, type ShowCur } from '@/lib/acct-display'
import { brand2027 } from '@/lib/palette'
import { CurToggle } from '../AccountingTitle'
import AccountAddForm from '../AccountAddForm'
import CardRepayButton from '../CardRepayButton'
import { fmtLocal, shownUsd, summarize } from '../BalanceGroups'

type GroupKey = 'USD' | 'KRW' | 'HNL' | 'CARD'
// 통화 그룹 색 = 블록 토큰(달러 5 Lavender · 원화 7 Blush · 렘피라 1 Lagoon · 카드 2 Salmon)
// tint = 그룹 면(띠 색을 아주 연하게) — 달력·통계처럼 영역을 색 면으로 구분
const GROUPS: { key: GroupKey; label: string; color: string; tint: string }[] = [
  { key: 'USD', label: '달러', color: brand2027.block5, tint: '#F1EFFA' },
  { key: 'KRW', label: '원화', color: brand2027.block7, tint: '#FBEFF1' },
  { key: 'HNL', label: '렘피라', color: brand2027.block1, tint: '#EAF6F5' },
  { key: 'CARD', label: '신용카드', color: brand2027.block2, tint: '#FDECEA' },
]
const groupOf = (b: AccountBalance): GroupKey =>
  b.kind === '신용카드' ? 'CARD' : b.currency === 'KRW' ? 'KRW' : b.currency === 'HNL' ? 'HNL' : 'USD'
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
  const [cur] = useShowCur()
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

  // 계좌 행 — 이름(+카드 사용자·상환일) · 보조 줄(원통화 실보유 · 장부 차이 · 예정) · 청구 주기 줄 · 금액
  const renderRow = (b: AccountBalance) => {
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
    const cy = b.cycle
    const cyAmt = (a: { own: number; usd: number }) =>
      `${fmtLocal(a.own, b.currency)}${a.usd > 0.005 ? ` + $${a.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}`
    const cycleLine = cy
      ? [
          cy.billed.valueUsd > 0.005 ? `${cy.overdue ? '미상환 · ' : ''}${MD(cy.dueDate)} 상환 ${cyAmt(cy.billed)}` : `${MD(cy.dueDate)} 상환 완료`,
          cy.unbilled.valueUsd > 0.005 ? `${MD(cy.nextDueDate)} 예정 ${cyAmt(cy.unbilled)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null
    const subs = [localLine, Math.abs(usdDiff) >= 0.01 ? `장부 $${b.balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null, upLine].filter(Boolean)
    return (
      <li key={b.id} className="border-b border-b27-line">
        <button type="button" onClick={() => goAccount(b.id)} className="flex w-full items-center gap-3 py-3 text-left">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] text-b27-ink">
              {shortName(b)}
              {b.kind === '신용카드' && (b.info || b.dueDay) && (
                <span className="ml-1.5 text-[11px] text-b27-muted">{[b.info, b.dueDay ? `${b.dueDay}일 상환` : null].filter(Boolean).join(' · ')}</span>
              )}
            </span>
            {subs.length > 0 && <span className="block truncate font-num text-[11px] text-b27-muted">{subs.join(' · ')}</span>}
            {cycleLine && <span className={`block truncate font-num text-[11px] ${cy?.overdue ? 'font-medium text-b27-expense' : 'text-b27-muted'}`}>{cycleLine}</span>}
          </span>
          <span className={`shrink-0 font-num text-[15px] font-medium ${v < 0 ? 'text-b27-expense' : 'text-b27-ink'}`}>{fmt(v)}</span>
        </button>
      </li>
    )
  }

  if (balances.length === 0) return <p className="py-10 text-center text-[13px] text-b27-muted">계좌 정보 없음</p>

  return (
    <div className="space-y-6 font-sans text-b27-ink">
      {/* 순자산 — 연회색 면: 큰 숫자 · 자산/부채 한 줄 · L/$ · 통화 띠 */}
      <section className="rounded-2xl bg-b27-card px-4 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <span className="font-num text-[12px] text-b27-muted">순자산</span>
          {hnlRate && <CurToggle />}
        </div>
        <div className={`mt-1 font-num text-[36px] font-medium leading-none tracking-[-0.02em] ${net < 0 ? 'text-b27-expense' : 'text-b27-ink'}`}>{fmt(toShowUsd(net))}</div>
        <div className="mt-2 flex gap-4 font-num text-[12px] text-b27-muted">
          <span>
            자산 <b className="font-medium text-b27-income">{fmt(toShowUsd(assets))}</b>
          </span>
          <span>
            부채 <b className="font-medium text-b27-expense">{fmt(toShowUsd(debt))}</b>
          </span>
        </div>

        {/* 통화 구성 띠 — 한 줄 */}
        {barTotal > 0 && (
          <>
            <div className="mt-4 flex h-1.5 gap-[3px] overflow-hidden rounded-full">
              {assetGroups.map((g) => (g.usd > 0 ? <div key={g.key} style={{ width: `${(g.usd / barTotal) * 100}%`, background: g.color }} /> : null))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-num text-[11px] text-b27-muted">
              {assetGroups.map((g) => (
                <span key={g.key} className="flex items-center gap-1">
                  <i className="inline-block h-2 w-2 rounded-[2px]" style={{ background: g.color }} />
                  {g.label} {Math.round((Math.max(0, g.usd) / barTotal) * 100)}%
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 통화 그룹 — 띠 색의 연한 면 + 머리줄(색 사각형 · 이름 · 비중 · 소계) + 행 */}
      {assetGroups.map((g) => (
        <section key={g.key} className="rounded-2xl px-3 pb-1 pt-2.5" style={{ background: g.tint }}>
          <div className="flex items-baseline justify-between font-num text-[12px] text-b27-muted">
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2 w-2 rounded-[2px]" style={{ background: g.color }} aria-hidden="true" />
              {g.label}
              {barTotal > 0 && <span className="font-medium text-b27-ink">{Math.round((Math.max(0, g.usd) / barTotal) * 100)}%</span>}
            </span>
            <span>{fmt(toShowUsd(g.usd))}</span>
          </div>
          <ul className="[&>li:last-child]:border-b-0">{g.rows.map(renderRow)}</ul>
        </section>
      ))}

      {/* 신용카드 — 연한 빨강 면(달력 카드대금과 동일) · 미상환 합계 · 행 · 상환 버튼 */}
      {card && (
        <section className="rounded-2xl px-3 pb-3 pt-2.5" style={{ background: card.tint }}>
          <div className="flex items-baseline justify-between font-num text-[12px] text-b27-muted">
            <span>신용카드 · 미상환</span>
            <span className="text-b27-expense">{fmt(toShowUsd(card.usd))}</span>
          </div>
          <ul className="[&>li:last-child]:border-b-0">{card.rows.map(renderRow)}</ul>
          <div className="pt-2">
            <CardRepayButton balances={balances} options={options ?? undefined} actionsOnly />
          </div>
        </section>
      )}

      {/* 환율 · 마감 · 평가손익 · ＋ 계좌 */}
      <section className="space-y-1 px-1 font-num text-[11px] leading-relaxed text-b27-muted">
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
            <b className={`font-medium ${fxDiff >= 0 ? 'text-b27-income' : 'text-b27-expense'}`}>
              {fxDiff > 0 ? '+' : '−'}${Math.abs(fxDiff).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </b>{' '}
            — 미실현, 장부는 그대로
          </div>
        )}
        <div className="pt-2">
          {adding ? (
            <AccountAddForm onClose={() => setAdding(false)} />
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="rounded-full bg-b27-card px-3 py-1.5 text-[12px] text-b27-muted transition hover:text-b27-ink">
              ＋ 계좌
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
