'use client'
// MFH-BALANCE-GROUPS-V2 — 카드 행에 사용자 표기(info)
// MFH-BALANCE-GROUPS-V1
// 계좌 잔액 그룹 목록 — 통화별(USD·KRW·HNL) + 신용카드(부채) 그룹, 그룹 소계(현지통화 ≈ + USD), 접기/펼치기.
// 금액 색: 양수 청색 · 음수 적색 · 0 기본. 요약 카드(AccountingSummary)·분석 탭(ReportView) 공용.
import { useMemo, useState } from 'react'
import type { AccountBalance } from '@/lib/accounting-types'

export function fmtUsd(n: number): string {
  const s = `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return n < 0 ? `−${s}` : s
}
export function fmtLocal(n: number, cur: string | null): string {
  const a = Math.abs(n)
  const body =
    cur === 'KRW'
      ? `${Math.round(a).toLocaleString('ko-KR')}원`
      : cur === 'HNL'
        ? `L ${a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `$${a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return n < 0 ? `−${body}` : body
}
export const amtColor = (n: number) => (n > 0 ? 'text-blue-700' : n < 0 ? 'text-red-700' : 'text-ink')

type GroupKey = 'USD' | 'KRW' | 'HNL' | 'CARD'
const GROUPS: { key: GroupKey; label: string; sub: string }[] = [
  { key: 'USD', label: '달러', sub: 'USD' },
  { key: 'KRW', label: '원화', sub: 'KRW' },
  { key: 'HNL', label: '렘피라', sub: 'HNL' },
  { key: 'CARD', label: '신용카드', sub: '부채' },
]
const groupOf = (b: AccountBalance): GroupKey =>
  b.kind === '신용카드' ? 'CARD' : b.currency === 'KRW' ? 'KRW' : b.currency === 'HNL' ? 'HNL' : 'USD'
// 목록 표시명: "Ficohsa 신용카드 4956" → "Ficohsa 4956"
const shortName = (b: AccountBalance) => (b.kind === '신용카드' ? b.name.replace(' 신용카드 ', ' ') : b.name)

// 자산(비카드 합) · 부채(카드 합, 음수) · 순자산
export function summarize(balances: AccountBalance[]) {
  let assets = 0
  let debt = 0
  for (const b of balances) {
    if (groupOf(b) === 'CARD') debt += b.balanceUsd
    else assets += b.balanceUsd
  }
  return { assets, debt, net: assets + debt }
}

export default function BalanceGroups({ balances }: { balances: AccountBalance[] }) {
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const groups = useMemo(
    () =>
      GROUPS.map((g) => {
        const rows = balances.filter((b) => groupOf(b) === g.key)
        const usd = rows.reduce((s, b) => s + b.balanceUsd, 0)
        // 소계 현지통화: 그룹 통화가 하나(KRW·HNL·카드=HNL)이고 전부 환율이 있을 때만
        const cur = g.key === 'CARD' ? 'HNL' : g.key
        const sameCur = rows.length > 0 && rows.every((b) => b.currency === cur && b.balanceLocal != null)
        const local = sameCur ? rows.reduce((s, b) => s + (b.balanceLocal ?? 0), 0) : null
        return { ...g, rows, usd, local, cur }
      }).filter((g) => g.rows.length > 0),
    [balances],
  )

  if (balances.length === 0) return <p className="py-2 text-center text-xs text-faint">계좌 정보 없음</p>

  return (
    <div className="space-y-2">
      {groups.map((g) => {
        const open = !closed[g.key]
        return (
          <div key={g.key}>
            <button
              type="button"
              onClick={() => setClosed((c) => ({ ...c, [g.key]: !c[g.key] }))}
              className="flex w-full items-center justify-between rounded-lg bg-surface-subtle px-2 py-1.5 text-left"
            >
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-muted">
                <span className={`inline-block text-[9px] transition ${open ? 'rotate-90' : ''}`}>▶</span>
                {g.label}
                <span className="text-[10px] font-medium text-faint">{g.sub}</span>
              </span>
              <span className="flex items-baseline gap-2">
                {g.local != null && g.cur !== 'USD' && (
                  <span className={`text-[11px] ${amtColor(g.local)}`}>≈ {fmtLocal(g.local, g.cur)}</span>
                )}
                <span className={`font-display text-[13px] font-bold ${amtColor(g.usd)}`}>{fmtUsd(g.usd)}</span>
              </span>
            </button>
            {open && (
              <ul className="mt-1 space-y-1 pl-2 pr-1">
                {g.rows.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-ink">
                      {shortName(b)}
                      {b.cardLast4 && b.kind !== '신용카드' && (
                        <span className="ml-1.5 text-[10px] text-faint">{b.cardLast4}</span>
                      )}
                      {b.kind === '신용카드' && b.info && (
                        <span className="ml-1.5 text-[10px] text-faint">{b.info}</span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      {b.currency !== 'USD' && b.balanceLocal != null && (
                        <span className={`text-[11px] ${amtColor(b.balanceLocal)}`}>
                          {fmtLocal(b.balanceLocal, b.currency)}
                        </span>
                      )}
                      <span className={`font-display font-bold ${amtColor(b.balanceUsd)}`}>{fmtUsd(b.balanceUsd)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
