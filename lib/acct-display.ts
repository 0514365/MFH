// MFH-ACCT-DISPLAY-V3 — 파스텔 fill 을 위플 톤(흰 아이콘이 보이는 중간 채도)으로 조정 · 보조색 7종
// MFH-ACCT-DISPLAY-V2 — pastelAt(순번 파스텔: 대분류 → 중분류 도넛)
// MFH-ACCT-DISPLAY-V1
// 회계 화면 공용 표시 헬퍼(클라이언트 전용) — 위플형 달력(CalendarHome)·통계(ReportView)가 함께 쓴다.
// · 표시 통화: L(HNL) 기본 + USD 토글, 기기별 localStorage 공유(한쪽에서 바꾸면 다른 탭도 같은 값).
// · 환산: HNL 거래 = 원금, 그 외 = 금액(USD) × HNL 환율(공시 → 없으면 HNL 계좌 최근 거래 환율).
// · 카테고리 파스텔(위플 톤): bg(아이콘 배경) · fg(아이콘 글자·진한 텍스트) · fill(차트 조각·막대).
import { useEffect, useState } from 'react'
import type { AccountBalance, FxInfo, InoutRow } from './accounting-types'

export type ShowCur = 'HNL' | 'USD'
const CUR_KEY = 'mfh-acct-show-cur'
const CUR_EVENT = 'mfh-acct-show-cur'

export function useShowCur(): [ShowCur, (c: ShowCur) => void] {
  const [cur, setCur] = useState<ShowCur>('HNL')
  useEffect(() => {
    try {
      const v = localStorage.getItem(CUR_KEY)
      if (v === 'HNL' || v === 'USD') setCur(v)
    } catch {}
    const on = (e: Event) => setCur((e as CustomEvent<ShowCur>).detail)
    window.addEventListener(CUR_EVENT, on)
    return () => window.removeEventListener(CUR_EVENT, on)
  }, [])
  const set = (c: ShowCur) => {
    setCur(c)
    try {
      localStorage.setItem(CUR_KEY, c)
    } catch {}
    window.dispatchEvent(new CustomEvent(CUR_EVENT, { detail: c }))
  }
  return [cur, set]
}

export function hnlRateOf(fx: FxInfo[] | undefined, balances: AccountBalance[]): number | null {
  return fx?.find((f) => f.currency === 'HNL')?.rate ?? balances.find((b) => b.currency === 'HNL' && b.rate)?.rate ?? null
}

// 표시 통화 금액. rate 없으면 USD.
export function toShow(r: InoutRow, cur: ShowCur, hnlRate: number | null): number {
  if (cur === 'USD' || !hnlRate) return r.amountUsd ?? 0
  if (r.currency === 'HNL' && r.principal != null) return r.principal
  return (r.amountUsd ?? 0) * hnlRate
}

export function fmtShow(n: number, cur: ShowCur): string {
  const a = Math.abs(n)
  const body =
    cur === 'HNL'
      ? `L ${Math.round(a).toLocaleString('en-US')}`
      : `$${a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return n < 0 ? `−${body}` : body
}

// 축약(달력 칸·차트 축) — 소수점 없음, 1만 이상 k.
export function fmtCompact(n: number): string {
  const a = Math.abs(n)
  const body =
    a >= 100000 ? `${Math.round(a / 1000)}k` : a >= 10000 ? `${(a / 1000).toFixed(1)}k` : Math.round(a).toLocaleString('en-US')
  return n < 0 ? `−${body}` : body
}

export type Pastel = { bg: string; fg: string; fill: string }
const PASTEL: Record<string, Pastel> = {
  후원: { bg: '#E3EEFB', fg: '#3B6FB6', fill: '#7FA6DE' },
  헌금: { bg: '#E8E4F8', fg: '#6A55B8', fill: '#9C8AD8' },
  기타수입: { bg: '#E2F3EC', fg: '#2F8A63', fill: '#6FBF98' },
  사역비: { bg: '#FBE7E4', fg: '#B65446', fill: '#E5847A' },
  사역: { bg: '#FDEBDD', fg: '#B8692E', fill: '#E9A06C' },
  생활비: { bg: '#FFF3D6', fg: '#A27A12', fill: '#E2BE55' },
  생활: { bg: '#FCE6EF', fg: '#B24C77', fill: '#DE8AAE' },
  차량: { bg: '#E0F1F5', fg: '#2C7F92', fill: '#6CB4C4' },
  '운영/행정': { bg: '#ECEBE8', fg: '#6B6A66', fill: '#A9A7A1' },
}
// 사전에 없는 카테고리 — 이름 해시로 보조 파스텔 순환.
const EXTRA: Pastel[] = [
  { bg: '#EAF4E1', fg: '#5B8A2E', fill: '#96C26D' },
  { bg: '#F4E9F7', fg: '#8A4FA0', fill: '#B88FCB' },
  { bg: '#FFF0E6', fg: '#B0623A', fill: '#E9A57E' },
  { bg: '#E3F1F2', fg: '#2F7A80', fill: '#6FAAB0' },
  { bg: '#EFE8F0', fg: '#6E4F75', fill: '#9B80A0' },
  { bg: '#E3F5E7', fg: '#2E8546', fill: '#7DCB8F' },
  { bg: '#FBE4E4', fg: '#B23B3B', fill: '#E8706F' },
]
export const PASTEL_NEUTRAL: Pastel = { bg: '#EEEDEA', fg: '#80807F', fill: '#D3D1CC' }

// 순번 파스텔 — 대분류 안 항목(중분류) 도넛처럼 이름과 무관하게 순위별로 서로 다른 색이 필요할 때.
const SERIES: Pastel[] = [...Object.values(PASTEL), ...EXTRA]
export const pastelAt = (i: number): Pastel => SERIES[((i % SERIES.length) + SERIES.length) % SERIES.length]

// 항목별 고정색 — 대분류 안 항목 순서(sort_order)대로 순번 파스텔. 달력 내역·통계 중분류 도넛이 같은 색을 쓴다.
export function itemPastels(items: { id: string; category?: string | null }[]): Map<string, Pastel> {
  const idx = new Map<string, number>()
  const out = new Map<string, Pastel>()
  for (const it of items) {
    const c = it.category || '기타'
    const i = idx.get(c) ?? 0
    out.set(it.id, pastelAt(i))
    idx.set(c, i + 1)
  }
  return out
}

export function pastelOf(category: string | null | undefined): Pastel {
  if (!category) return PASTEL_NEUTRAL
  const p = PASTEL[category]
  if (p) return p
  let h = 0
  for (const ch of category) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return EXTRA[h % EXTRA.length]
}

// 수입·지출 추이(차트) 파스텔.
export const PASTEL_INCOME = '#8FB8EE'
export const PASTEL_EXPENSE = '#F2A39A'
