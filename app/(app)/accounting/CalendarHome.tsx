'use client'
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
import { PASTEL_NEUTRAL, fmtCompact, fmtShow, hnlRateOf, pastelOf, toShow, useShowCur, type ShowCur } from '@/lib/acct-display'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const isYmd = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
const fmtFull = fmtShow
const fmtCell = fmtCompact

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
  const cardIds = useMemo(() => new Set(balances.filter((b) => b.kind === '신용카드').map((b) => b.id)), [balances])

  const ym = selected?.slice(0, 7) ?? ''
  const [year, month] = ym ? ym.split('-').map(Number) : [0, 0]

  // 그달 집계 + 일별 합
  const { income, expense, cash, card, byDay } = useMemo(() => {
    let income = 0
    let expense = 0
    let cash = 0
    let card = 0
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
        if (r.accountId && cardIds.has(r.accountId)) card += a
        else cash += a
      }
      byDay.set(d, day)
    }
    return { income, expense, cash, card, byDay }
    // amt 는 showCur·hnlRate 에 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent, ym, showCur, hnlRate, cardIds])

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
      {/* 월 이동 + 통화 토글 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-subtle hover:text-primary">
            ‹
          </button>
          <span className="font-display text-[17px] font-bold text-ink">
            {year}년 {month}월
          </span>
          <button type="button" onClick={() => moveMonth(1)} aria-label="다음 달" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-subtle hover:text-primary">
            ›
          </button>
          {ym !== today.slice(0, 7) && (
            <button type="button" onClick={() => setSelected(today)} className="ml-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted hover:border-primary hover:text-primary">
              오늘
            </button>
          )}
        </div>
        {hnlRate && (
          <div className="flex rounded-full bg-surface-subtle p-0.5 text-[11px] font-semibold">
            {(['HNL', 'USD'] as ShowCur[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCur(c)}
                className={`rounded-full px-2.5 py-1 transition ${showCur === c ? 'bg-surface text-primary shadow-soft' : 'text-muted'}`}
              >
                {c === 'HNL' ? 'L' : '$'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 그달 요약 */}
      <section className="grid grid-cols-3 gap-2 rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div>
          <div className="text-[11px] text-faint">수입</div>
          <div className="font-display text-[15px] font-bold text-blue-700">{fmtFull(income, showCur)}</div>
        </div>
        <div>
          <div className="text-[11px] text-faint">지출</div>
          <div className="font-display text-[15px] font-bold text-red-700">{fmtFull(expense, showCur)}</div>
          <div className="mt-1 space-y-0.5 text-[10px] text-faint">
            <div>현금 {fmtFull(cash, showCur)}</div>
            <div>카드 {fmtFull(card, showCur)}</div>
          </div>
        </div>
        <div>
          <div className="text-[11px] text-faint">수입−지출</div>
          <div className={`font-display text-[15px] font-bold ${net >= 0 ? 'text-ink' : 'text-red-700'}`}>{fmtFull(net, showCur)}</div>
        </div>
      </section>

      {/* 월 달력 */}
      <section className="rounded-2xl border border-line bg-surface p-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-semibold">
          {WEEK.map((w, i) => (
            <div key={w} className={i === 0 ? 'text-accent' : i === 6 ? 'text-blue-700' : 'text-faint'}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((d, i) => {
            if (d == null) return <div key={`e${i}`} className="h-[54px]" />
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
                className={`flex h-[54px] flex-col items-center rounded-lg pt-1 transition ${isSel ? 'bg-primary-soft' : 'hover:bg-surface-subtle'}`}
              >
                <span
                  className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 font-display text-[12px] ${
                    isToday ? 'bg-primary font-bold text-white' : dow === 0 ? 'text-accent' : dow === 6 ? 'text-blue-700' : 'text-ink'
                  }`}
                >
                  {d}
                </span>
                {s && s.inc !== 0 && <span className="font-display text-[9.5px] leading-tight text-blue-700">{fmtCell(s.inc)}</span>}
                {s && s.exp !== 0 && <span className="font-display text-[9.5px] leading-tight text-red-700">{fmtCell(s.exp)}</span>}
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
              const { bg, fg } = counted ? pastelOf(it?.category) : PASTEL_NEUTRAL
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
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                      style={{ background: bg, color: fg }}
                      aria-hidden="true"
                    >
                      {label.slice(0, 1)}
                    </span>
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
