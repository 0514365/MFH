'use client'
// MFH-ACCOUNTING-CALENDAR-V9 — 카드대금 = 항상 전체 미상환(확정 청구 + 이용 중) 합계, 청구 주기는 괄호 안 「MM/DD 상환 … · MM/DD 예정 …」
// MFH-ACCOUNTING-CALENDAR-V8 — 청구 주기 카드(삼성 7092): 확정 청구(상환일·미상환 표시)만 합계에, 이용 중은 「다음 MM/DD …」로 덧붙임
// MFH-ACCOUNTING-CALENDAR-V7 — 카드 라벨에 상환일(15일, patch117)
// MFH-ACCOUNTING-CALENDAR-V6 — 카드대금: 카드 통화별(L·원) 원금 + $결제분(원화 카드 삼성 7092 대응), 섞이면 합계는 환산액
// MFH-ACCOUNTING-CALENDAR-V5 — 월 이동을 헤더 중앙으로(HeaderPortal, 라벨 탭 = 오늘) · 오늘·L/$ 는 요약 카드 위 · 달력 칸·날짜 크게
// MFH-ACCOUNTING-CALENDAR-V4 — 요약: 지출 현금·카드 구분 제거 → 「카드대금 상환할 금액」(카드별 미상환, 탭 = 자산 탭)
// MFH-ACCOUNTING-CALENDAR-V3 — 내역 아이콘 = 위플형 CatIcon(항목 고정색 원 + 흰 선 아이콘)
// MFH-ACCOUNTING-CALENDAR-V2 — 표시 통화·환산·파스텔을 lib/acct-display 로 분리(통계 탭과 공유)
// MFH-ACCOUNTING-CALENDAR-V1
// 회계 홈(달력 탭) — 위플 가계부형. ‹ 월 › 이동 → 그달 수입/지출/수입−지출(지출 = 현금·카드 분리) → 월 달력(칸마다 그날 수입·지출 합)
// → 선택일 내역(카테고리 파스텔 원형 아이콘 · 항목 · 금액 · 카드 표시). 행 탭 = /accounting/entry?edit=<id>.
// 표시 통화 = L 기본 + USD 토글(기기별 localStorage). HNL 거래는 원금, 그 외는 금액(USD) × 공시 HNL 환율.
// 선택일은 URL ?d=YYYY-MM-DD 로 유지(＋ 버튼이 읽어 기록 폼 날짜 프리필, 수정 후 뒤로 오면 같은 날).
// 집계는 수입·지출만(이체·조정 제외 — 목록엔 흐리게 표시). 날짜 기준은 브라우저 로컬(서버 UTC 어긋남 방지 위해 마운트 후 렌더).
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AccountBalance, AcctOptions, FxInfo, InoutRow } from '@/lib/accounting-types'
import { PASTEL_NEUTRAL, fmtCompact, fmtShow, hnlRateOf, itemPastels, toShow, useShowCur, type ShowCur } from '@/lib/acct-display'
import { CatIcon } from '@/lib/acct-icons'
import { HeaderMonthNav, HeaderPortal } from './AccountingTitle'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const isYmd = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
const fmtFull = fmtShow
const fmtCell = fmtCompact
const mdOf = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`

export default function CalendarHome({
  recent,
  options,
  balances,
  fx,
  initialDate,
}: {
  recent: InoutRow[]
  options: AcctOptions
  balances: AccountBalance[]
  fx: FxInfo[]
  initialDate?: string
}) {
  const router = useRouter()
  const [today, setToday] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [cur, toggleCur] = useShowCur()
  const hnlRate = useMemo(() => hnlRateOf(fx, balances), [fx, balances])
  const showCur: ShowCur = hnlRate ? cur : 'USD'

  useEffect(() => {
    const t = ymd(new Date())
    setToday(t)
    setSelected(isYmd(initialDate) ? initialDate : t)
  }, [initialDate])

  // 선택일 → URL ?d= (히스토리 쌓지 않음)
  useEffect(() => {
    if (!selected) return
    const url = new URL(window.location.href)
    url.searchParams.set('d', selected)
    window.history.replaceState(window.history.state, '', url.toString())
  }, [selected])

  const amt = (r: InoutRow): number => toShow(r, showCur, hnlRate)

  const itemOf = useMemo(() => {
    const m = new Map<string, { name: string; category: string | null }>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) m.set(i.id, { name: i.name, category: i.category ?? null })
    return m
  }, [options])
  const itemColor = useMemo(() => itemPastels([...options.items['수입'], ...options.items['지출']]), [options])
  const cardIds = useMemo(() => new Set(balances.filter((b) => b.kind === '신용카드').map((b) => b.id)), [balances])

  const ym = selected?.slice(0, 7) ?? ''
  const [year, month] = ym ? ym.split('-').map(Number) : [0, 0]

  // 그달 집계 + 일별 합
  const { income, expense, byDay } = useMemo(() => {
    let income = 0
    let expense = 0
    const byDay = new Map<string, { inc: number; exp: number }>()
    for (const r of recent) {
      const d = r.date ?? ''
      if (d.slice(0, 7) !== ym) continue
      if (r.gubun !== '수입' && r.gubun !== '지출') continue
      const a = amt(r)
      const day = byDay.get(d) ?? { inc: 0, exp: 0 }
      if (r.gubun === '수입') {
        income += a
        day.inc += a
      } else {
        expense += a
        day.exp += a
      }
      byDay.set(d, day)
    }
    return { income, expense, byDay }
    // amt 는 showCur·hnlRate 에 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent, ym, showCur, hnlRate])

  // 카드대금 상환할 금액(현재 미상환) — 카드별 카드 통화 원금(L·원) + USD 결제분. L 표시 = 원금(+ $), $ 표시 = 평가액.
  // 금액·합계 = 항상 전체 미상환. 청구 주기 카드(cycle)는 확정 청구(bill)·이용 중(next)을 괄호 안에 나눠 표시.
  const cardDue = useMemo(() => {
    const rows = balances
      .filter((b) => b.kind === '신용카드')
      .map((b) => {
        const cur = b.currency ?? 'HNL'
        const name = `${b.cardLast4 ?? b.name.slice(-4)}${b.info ? ` ${b.info}` : ''}`
        const cy = b.cycle
        if (cy) {
          const bill = cy.billed.valueUsd > 0.005 ? { date: cy.dueDate, overdue: cy.overdue, ...cy.billed } : null
          const next = cy.unbilled.valueUsd > 0.005 ? { date: cy.nextDueDate, ...cy.unbilled } : null
          const local = cy.billed.own + cy.unbilled.own
          const usdPart = cy.billed.usd + cy.unbilled.usd
          return { id: b.id, label: name, cur, local, usdPart, usd: cy.billed.valueUsd + cy.unbilled.valueUsd, bill, next }
        }
        const local = -(b.holdings.find((h) => h.currency === cur)?.amount ?? 0)
        const usdPart = cur === 'USD' ? 0 : -(b.holdings.find((h) => h.currency === 'USD')?.amount ?? 0)
        const usd = -(b.valueUsd ?? b.balanceUsd)
        return { id: b.id, label: `${name}${b.dueDay ? `(${b.dueDay}일)` : ''}`, cur, local, usdPart, usd, bill: null, next: null }
      })
      .filter((c) => c.usd > 0.005)
    const totalUsd = rows.reduce((s, c) => s + c.usd, 0)
    const onlyHnl = rows.every((c) => c.cur === 'HNL')
    const totalHnl = rows.reduce((s, c) => s + c.local, 0)
    const totalUsdPart = rows.reduce((s, c) => s + c.usdPart, 0)
    return { rows, totalUsd, onlyHnl, totalHnl, totalUsdPart }
  }, [balances])
  const fmtUsdPart = (usdPart: number) =>
    usdPart > 0.005 ? ` + $${usdPart.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''
  const fmtDue = (cur: string, local: number, usdPart: number, usd: number) =>
    showCur === 'HNL' && hnlRate
      ? `${cur === 'KRW' ? `${Math.round(local).toLocaleString('ko-KR')}원` : fmtFull(local, 'HNL')}${fmtUsdPart(usdPart)}`
      : fmtFull(usd, 'USD')
  const fmtRow = (c: (typeof cardDue.rows)[number]) => {
    const parts = [
      c.bill ? `${c.bill.overdue ? '미상환 ' : ''}${mdOf(c.bill.date)} 상환 ${fmtDue(c.cur, c.bill.own, c.bill.usd, c.bill.valueUsd)}` : null,
      c.next ? `${mdOf(c.next.date)} 예정${c.bill ? ` ${fmtDue(c.cur, c.next.own, c.next.usd, c.next.valueUsd)}` : ''}` : null,
    ].filter(Boolean)
    return `${c.label} ${fmtDue(c.cur, c.local, c.usdPart, c.usd)}${parts.length ? ` (${parts.join(' · ')})` : ''}`
  }
  // 합계: 렘피라 카드만이면 L 원금 + $, 원화 카드가 섞이면 환산액(L 표시 = 평가액 × 공시 HNL)
  const dueTotal =
    showCur === 'HNL' && hnlRate
      ? cardDue.onlyHnl
        ? `${fmtFull(cardDue.totalHnl, 'HNL')}${fmtUsdPart(cardDue.totalUsdPart)}`
        : fmtFull(cardDue.totalUsd * hnlRate, 'HNL')
      : fmtFull(cardDue.totalUsd, 'USD')

  const dayRows = useMemo(() => recent.filter((r) => r.date === selected), [recent, selected])

  if (!selected || !today) return <div className="min-h-[60vh]" aria-hidden="true" />

  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const lead = first.getDay()
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7) cells.push(null)

  function moveMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1)
    const t = today!
    setSelected(ymd(d).slice(0, 7) === t.slice(0, 7) ? t : ymd(d))
  }

  const sel = new Date(`${selected}T00:00:00`)
  const selDay = byDay.get(selected)
  const net = income - expense

  return (
    <div className="space-y-4">
      {/* 월 이동 → 헤더 중앙(라벨 탭 = 오늘) */}
      <HeaderPortal>
        <HeaderMonthNav
          label={`${year}년 ${month}월`}
          onPrev={() => moveMonth(-1)}
          onNext={() => moveMonth(1)}
          onLabel={ym !== today.slice(0, 7) ? () => setSelected(today) : undefined}
          labelTitle="오늘로"
        />
      </HeaderPortal>

      {/* 그달 요약 */}
      <section className="grid grid-cols-3 gap-2 rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {(hnlRate || ym !== today.slice(0, 7)) && (
          <div className="col-span-3 -mt-1 flex items-center justify-end gap-1.5">
            {ym !== today.slice(0, 7) && (
              <button type="button" onClick={() => setSelected(today)} className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted hover:border-primary hover:text-primary">
                오늘
              </button>
            )}
            {hnlRate && (
              <div className="flex rounded-full bg-surface-subtle p-0.5 text-[11px] font-semibold">
                {(['HNL', 'USD'] as ShowCur[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCur(c)}
                    className={`rounded-full px-2.5 py-0.5 transition ${showCur === c ? 'bg-surface text-primary shadow-soft' : 'text-muted'}`}
                  >
                    {c === 'HNL' ? 'L' : '$'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div>
          <div className="text-[11px] text-faint">수입</div>
          <div className="font-display text-[15px] font-bold text-blue-700">{fmtFull(income, showCur)}</div>
        </div>
        <div>
          <div className="text-[11px] text-faint">지출</div>
          <div className="font-display text-[15px] font-bold text-red-700">{fmtFull(expense, showCur)}</div>
        </div>
        <div>
          <div className="text-[11px] text-faint">수입−지출</div>
          <div className={`font-display text-[15px] font-bold ${net >= 0 ? 'text-ink' : 'text-red-700'}`}>{fmtFull(net, showCur)}</div>
        </div>
        {cardDue.rows.length > 0 && (
          <Link href="/accounting/assets" className="col-span-3 mt-1 flex items-start justify-between gap-3 border-t border-line pt-3">
            <span className="min-w-0">
              <span className="block text-[11px] text-faint">카드대금 상환할 금액</span>
              <span className="mt-0.5 block text-[11px] text-muted">
                {cardDue.rows.map(fmtRow).join(' · ')}
              </span>
            </span>
            <span className="shrink-0 font-display text-[15px] font-bold text-red-700">
              {dueTotal} <span className="text-[12px] font-normal text-faint">›</span>
            </span>
          </Link>
        )}
      </section>

      {/* 월 달력 */}
      <section className="rounded-2xl border border-line bg-surface px-2 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-7 pb-2 text-center text-[12px] font-semibold">
          {WEEK.map((w, i) => (
            <div key={w} className={i === 0 ? 'text-accent' : i === 6 ? 'text-blue-700' : 'text-faint'}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d, i) => {
            if (d == null) return <div key={`e${i}`} className="h-[66px]" />
            const key = `${ym}-${pad(d)}`
            const s = byDay.get(key)
            const isSel = key === selected
            const isToday = key === today
            const dow = i % 7
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={`flex h-[66px] flex-col items-center rounded-lg pt-1.5 transition ${isSel ? 'bg-primary-soft' : 'hover:bg-surface-subtle'}`}
              >
                <span
                  className={`mb-0.5 flex h-6 min-w-[24px] items-center justify-center rounded-full px-1 font-display text-[14px] ${
                    isToday ? 'bg-primary font-bold text-white' : dow === 0 ? 'text-accent' : dow === 6 ? 'text-blue-700' : 'text-ink'
                  }`}
                >
                  {d}
                </span>
                {s && s.inc !== 0 && <span className="font-display text-[10.5px] leading-tight text-blue-700">{fmtCell(s.inc)}</span>}
                {s && s.exp !== 0 && <span className="font-display text-[10.5px] leading-tight text-red-700">{fmtCell(s.exp)}</span>}
              </button>
            )
          })}
        </div>
      </section>

      {/* 선택일 내역 */}
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-bold text-ink">
            {sel.getMonth() + 1}월 {sel.getDate()}일 ({WEEK[sel.getDay()]})
          </span>
          <div className="flex gap-2 font-display text-[11px]">
            {selDay && selDay.inc !== 0 && <span className="text-blue-700">+{fmtFull(selDay.inc, showCur)}</span>}
            {selDay && selDay.exp !== 0 && <span className="text-red-700">{fmtFull(-selDay.exp, showCur)}</span>}
          </div>
        </div>
        {dayRows.length === 0 ? (
          <p className="py-4 text-center text-xs text-faint">거래 없음</p>
        ) : (
          <ul className="divide-y divide-line">
            {dayRows.map((r) => {
              const it = r.itemId ? itemOf.get(r.itemId) : undefined
              const counted = r.gubun === '수입' || r.gubun === '지출'
              const color = (counted && r.itemId ? itemColor.get(r.itemId) : undefined)?.fill ?? PASTEL_NEUTRAL.fill
              const label = it?.name ?? r.gubun ?? '—'
              const sub = [r.name, r.vendor].filter(Boolean).join(' · ')
              const isCard = r.gubun === '지출' && !!r.accountId && cardIds.has(r.accountId)
              const a = amt(r)
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/accounting/entry?edit=${r.id}`)}
                    className={`flex w-full items-center gap-3 py-2.5 text-left ${counted ? '' : 'opacity-60'}`}
                  >
                    <CatIcon name={it?.name ?? r.gubun} category={it?.category} color={color} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{label}</span>
                      {sub && <span className="block truncate text-[11px] text-faint">{sub}</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className={`block font-display text-sm font-bold ${
                          r.gubun === '지출' ? 'text-red-700' : r.gubun === '수입' ? 'text-blue-700' : 'text-muted'
                        }`}
                      >
                        {fmtFull(r.gubun === '지출' ? -a : a, showCur)}
                      </span>
                      {isCard && <span className="text-[10px] text-faint">카드</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <Link
          href={`/accounting/entry?date=${selected}`}
          className="mt-2 flex h-9 items-center justify-center rounded-xl border border-dashed border-line text-[12px] font-medium text-muted transition hover:border-primary hover:text-primary"
        >
          ＋ 이 날 기록
        </Link>
      </section>
    </div>
  )
}
