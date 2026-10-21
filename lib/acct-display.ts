// MFH-ACCT-DISPLAY-V4 — 2027 Minimal Block: 항목 색 15색 사전 → brand2027 블록 8색 순번(itemPastels) · 대분류 고정 블록(pastelOf) · Pastel 에 n·halo 추가
// MFH-ACCT-DISPLAY-V3 — 파스텔 fill 을 위플 톤(흰 아이콘이 보이는 중간 채도)으로 조정 · 보조색 7종
// MFH-ACCT-DISPLAY-V2 — pastelAt(순번 파스텔: 대분류 → 중분류 도넛)
// MFH-ACCT-DISPLAY-V1
// 회계 화면 공용 표시 헬퍼(클라이언트 전용) — 위플형 달력(CalendarHome)·통계(ReportView)가 함께 쓴다.
// · 표시 통화: L(HNL) 기본 + USD 토글, 기기별 localStorage 공유(한쪽에서 바꾸면 다른 탭도 같은 값).
// · 환산: HNL 거래 = 원금, 그 외 = 금액(USD) × HNL 환율(공시 → 없으면 HNL 계좌 최근 거래 환율).
// · 카테고리 파스텔(위플 톤): bg(아이콘 배경) · fg(아이콘 글자·진한 텍스트) · fill(차트 조각·막대).
import { useEffect, useState } from 'react'
import type { AccountBalance, FxInfo, InoutRow } from './accounting-types'
import { BLOCK_COUNT, blockColor, brand2027 } from './palette'

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

// 2027 Minimal Block — 항목 색 = brand2027 블록 8색 순번(대분류 안 항목 정렬 순서). 15색 파스텔 사전 폐지.
// Pastel 필드 호환: bg·fill = 블록 색(면), fg = 남색(글자). n = 블록 번호(1~8, 0 = 중립), halo = 블록 위 흰 글자용 진한 톤 rgba.
export type Pastel = { bg: string; fg: string; fill: string; n: number; halo: string }
const mk = (n: number): Pastel => {
  const { bg, halo } = blockColor(n)
  return { bg, fg: brand2027.ink, fill: bg, n, halo }
}
const SERIES: Pastel[] = Array.from({ length: BLOCK_COUNT }, (_, i) => mk(i + 1))
export const PASTEL_NEUTRAL: Pastel = { bg: brand2027.card, fg: brand2027.muted, fill: '#E4E7EC', n: 0, halo: 'transparent' }

// 순번 블록 색 — 대분류 안 항목(중분류) 순서대로 1~8 순환.
export const pastelAt = (i: number): Pastel => SERIES[((i % BLOCK_COUNT) + BLOCK_COUNT) % BLOCK_COUNT]

// 항목별 고정색 — 대분류 안 항목 순서(sort_order)대로 순번 블록. 달력 블록 지도·내역 사각형·통계가 같은 색을 쓴다.
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

// 대분류 고정색 — "전체" 보기(통계)의 대분류 단위 블록·띠. 생활비 = 1 Lagoon · 사역비 = 5 Lavender. 사전에 없으면 이름 해시.
const CATEGORY_BLOCK: Record<string, number> = {
  생활비: 1,
  사역비: 5,
  생활: 7,
  사역: 2,
  차량: 1,
  '운영/행정': 3,
  후원: 8,
  헌금: 5,
  기타수입: 4,
}
export function pastelOf(category: string | null | undefined): Pastel {
  if (!category) return PASTEL_NEUTRAL
  const n = CATEGORY_BLOCK[category]
  if (n) return mk(n)
  let h = 0
  for (const ch of category) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return mk((h % BLOCK_COUNT) + 1)
}

// 수입·지출 추이(차트) — 블록 8 Periwinkle · 2 Salmon.
export const PASTEL_INCOME = brand2027.block8
export const PASTEL_EXPENSE = brand2027.block2
