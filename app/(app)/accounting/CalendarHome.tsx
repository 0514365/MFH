'use client'
// MFH-ACCOUNTING-CALENDAR-V22 — 실기 피드백 2차: 카드대금 = 연한 빨강 알약 한 줄(총액 · 다음 상환일 · ▾) → 탭하면 흰 바탕 세부 행 + [상환][잔액 0][자산 →]. 접힘 기기별 기억, 상환 3일 전 자동 펼침
// MFH-ACCOUNTING-CALENDAR-V21 — 실기 피드백(카드대금 구분감): 카드대금 묶음을 연한 빨강 면(#FDECEA)으로, 합계는 머리줄 제목으로, 행 구분선은 연한 빨강
// MFH-ACCOUNTING-CALENDAR-V20 — 2027 실기 피드백: 블록 지도 제거(효용 없음 → 통계·검색에 재활용 예정) · 제목 줄 토글 = 전체/지출/수입 3상태(기본 전체 = 두 금액, 선택일 내역도 필터)
//   · 달력 아래 「카드대금」 글자 행(카드사별 + 합계 + [상환][잔액 0], 탭 = 자산 탭) · 제목 줄 아래 「승인대기 N건」 한 줄(대기색, 탭 = 승인함)
// MFH-ACCOUNTING-CALENDAR-V19 — 2027 Minimal Block(c-2): 한 화면에 한 가지.
//   제목 줄(지출/수입 글자 토글 + 그달 금액 + 오늘) → 달력(숫자만: 거래 있는 날 남색·없는 날 회색, 오늘 남색 원, 주말 sun/sat)
//   → 그달 항목별 블록 지도(3열 · 금액 비례 정렬 · 상위 7 + 기타 · 우하단 남색 합계, 흰 글자 + 할로, 탭 = 그 항목 내역)
//   → 선택일 내역(10px 색 사각형 · 이름 · 금액). 요약 카드·카드대금 카드·승인대기 배너·CatIcon 제거(카드대금은 자산 탭, 승인은 탭바 배지).
// MFH-ACCOUNTING-CALENDAR-V18 — 요일색(2027 토큰): 일요일 = b27-sun · 토요일 = b27-sat
// MFH-ACCOUNTING-CALENDAR-V14 — 모바일: 페이지 끝에서 80px 이상 더 당기면 기록 화면(당기는 동안 안내 표시)
// 집계는 수입·지출만(이체·조정 제외 — 목록엔 흐리게 표시). 날짜 기준은 브라우저 로컬(서버 UTC 어긋남 방지 위해 마운트 후 렌더).
// 표시 통화 = L 기본 + USD 토글(기기별 localStorage). HNL 거래는 원금, 그 외는 금액(USD) × 공시 HNL 환율.
// 선택일은 URL ?d=YYYY-MM-DD 로 유지(＋ 버튼이 읽어 기록 폼 날짜 프리필, 수정 후 뒤로 오면 같은 날).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AccountBalance, AcctOptions, FxInfo, InoutRow } from '@/lib/accounting-types'
import { PASTEL_NEUTRAL, fmtShow, hnlRateOf, itemPastels, toShow, useShowCur, type ShowCur } from '@/lib/acct-display'
import { CurToggle, HeaderMonthNav, HeaderPortal } from './AccountingTitle'
import CardRepayButton from './CardRepayButton'

type Mode = '전체' | '지출' | '수입'
const MODES: Mode[] = ['전체', '지출', '수입']
const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const CARD_OPEN_KEY = 'mfh-acct-carddue-open'
const DUE_SOON_DAYS = 3

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const isYmd = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
const fmtFull = fmtShow

export default function CalendarHome({
  recent,
  options,
  balances,
  fx,
  initialDate,
  cardPending = 0,
  recPending = 0,
}: {
  recent: InoutRow[]
  options: AcctOptions
  balances: AccountBalance[]
  fx: FxInfo[]
  initialDate?: string
  cardPending?: number
  recPending?: number
}) {
  const router = useRouter()
  const [today, setToday] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('전체')
  // 카드대금 접힘 — 기기별 기억(localStorage). 가장 가까운 상환일 3일 전부터는 자동 펼침(dueSoon).
  const [cardOpen, setCardOpen] = useState(false)
  useEffect(() => {
    try {
      if (localStorage.getItem(CARD_OPEN_KEY) === '1') setCardOpen(true)
    } catch {}
  }, [])
  const toggleCard = () =>
    setCardOpen((v) => {
      const n = !v
      try {
        localStorage.setItem(CARD_OPEN_KEY, n ? '1' : '0')
      } catch {}
      return n
    })
  const [cur] = useShowCur()
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

  // 아래로 당겨 기록(모바일) — 페이지 끝에 닿은 상태에서 손가락을 위로 80px 이상 끌면 기록 화면(선택일 프리필).
  const [pull, setPull] = useState(0)
  const pullStart = useRef<number | null>(null)
  const pullFired = useRef(false)
  const PULL_MAX = 80
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 767px)').matches) return
    const atBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
    const onStart = (e: TouchEvent) => {
      pullStart.current = atBottom() ? e.touches[0].clientY : null
      pullFired.current = false
    }
    const onMove = (e: TouchEvent) => {
      if (pullStart.current == null) return
      const d = pullStart.current - e.touches[0].clientY
      if (d <= 0 || !atBottom()) {
        setPull(0)
        return
      }
      setPull(Math.min(d * 0.6, PULL_MAX + 20))
    }
    const onEnd = () => {
      if (pullStart.current != null && pull >= PULL_MAX && !pullFired.current) {
        pullFired.current = true
        router.push(`/accounting/entry?date=${selected ?? ''}`)
      }
      pullStart.current = null
      setPull(0)
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [pull, selected, router])

  const itemOf = useMemo(() => {
    const m = new Map<string, { name: string; category: string | null }>()
    for (const i of [...options.items['수입'], ...options.items['지출']]) m.set(i.id, { name: i.name, category: i.category ?? null })
    return m
  }, [options])
  const itemColor = useMemo(() => itemPastels([...options.items['수입'], ...options.items['지출']]), [options])
  const cardIds = useMemo(() => new Set(balances.filter((b) => b.kind === '신용카드').map((b) => b.id)), [balances])

  const ym = selected?.slice(0, 7) ?? ''
  const [year, month] = ym ? ym.split('-').map(Number) : [0, 0]

  // 그달 집계 — 수입·지출 합, 일별 합
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

  // 카드대금(전체 미상환) — 카드사별(계좌 이름 첫 단어) 합계. $ 표시면 평가액, L 표시면 렘피라 카드는 원금(+ $분 × 공시), 그 외 평가액 × 공시.
  const cardDue = useMemo(() => {
    const groups = new Map<string, { brand: string; owners: string[]; count: number; dueDay: number | null; usd: number; hnl: number }>()
    for (const b of balances) {
      if (b.kind !== '신용카드') continue
      const brand = b.name.split(' ')[0]
      const g = groups.get(brand) ?? { brand, owners: [], count: 0, dueDay: null, usd: 0, hnl: 0 }
      g.count += 1
      if (b.info && !g.owners.includes(b.info)) g.owners.push(b.info)
      g.dueDay = g.dueDay ?? b.dueDay
      g.usd += -(b.valueUsd ?? b.balanceUsd)
      if (b.currency === 'HNL') {
        const own = -(b.holdings.find((h) => h.currency === 'HNL')?.amount ?? 0)
        const usdPart = -(b.holdings.find((h) => h.currency === 'USD')?.amount ?? 0)
        g.hnl += own + usdPart * (hnlRate ?? 0)
      } else g.hnl += -(b.valueUsd ?? b.balanceUsd) * (hnlRate ?? 0)
      groups.set(brand, g)
    }
    return [...groups.values()]
  }, [balances, hnlRate])
  // 가장 가까운 상환일(카드사 dueDay 중 오늘 이후 첫 날) — 접힘 줄 라벨 · 자동 펼침 판정
  const nextDue = useMemo(() => {
    if (!today) return null
    const [ty, tm, td] = today.split('-').map(Number)
    let best: Date | null = null
    for (const g of cardDue) {
      if (!g.dueDay) continue
      const d = new Date(ty, tm - 1, g.dueDay)
      if (g.dueDay < td) d.setMonth(d.getMonth() + 1)
      if (!best || d < best) best = d
    }
    return best
  }, [cardDue, today])
  const dueSoon = !!nextDue && !!today && (nextDue.getTime() - new Date(`${today}T00:00:00`).getTime()) / 864e5 <= DUE_SOON_DAYS
  const cardExpanded = cardOpen || dueSoon
  const useHnl = showCur === 'HNL' && !!hnlRate
  const fmtGroup = (g: (typeof cardDue)[number]) => (useHnl ? fmtFull(g.hnl, 'HNL') : fmtFull(g.usd, 'USD'))
  const cardTotal = useHnl ? fmtFull(cardDue.reduce((t, g) => t + g.hnl, 0), 'HNL') : fmtFull(cardDue.reduce((t, g) => t + g.usd, 0), 'USD')

  // 선택일 내역 — 전체는 이체·조정 포함, 지출/수입은 그 구분만
  const dayRows = useMemo(
    () => recent.filter((r) => r.date === selected && (mode === '전체' || r.gubun === mode)),
    [recent, selected, mode],
  )

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
  const notThisMonth = ym !== today.slice(0, 7)
  const pending = cardPending + recPending

  return (
    <div className="space-y-5 font-sans text-b27-ink">
      {/* 월 이동 → 헤더 중앙(라벨 탭 = 오늘) */}
      <HeaderPortal>
        <HeaderMonthNav
          label={`${year}년 ${month}월`}
          onPrev={() => moveMonth(-1)}
          onNext={() => moveMonth(1)}
          onLabel={notThisMonth ? () => setSelected(today) : undefined}
          labelTitle="오늘로"
        />
      </HeaderPortal>

      {/* 제목 줄 — 전체/지출/수입 글자 토글(선택 글자 다시 탭 = 전체) · 오늘 · (md 이상 L/$) · 그달 금액(전체는 수입·지출 둘 다) */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-4 font-num text-[15px]">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(mode === m ? '전체' : m)}
              aria-pressed={mode === m}
              className={`border-b-2 pb-0.5 leading-none transition ${mode === m ? 'border-b27-ink font-medium text-b27-ink' : 'border-transparent text-b27-muted'}`}
            >
              {m}
            </button>
          ))}
          {notThisMonth && (
            <button type="button" onClick={() => setSelected(today)} className="rounded-full bg-b27-card px-2.5 py-1 text-[12px] leading-none text-b27-muted">
              오늘
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hnlRate && <CurToggle className="max-md:hidden" />}
          {mode !== '수입' && <span className="font-num text-[17px] font-medium text-b27-expense">{fmtFull(expense, showCur)}</span>}
          {mode !== '지출' && <span className="font-num text-[17px] font-medium text-b27-income">{fmtFull(income, showCur)}</span>}
        </div>
      </div>

      {/* 승인대기 — 있을 때만 한 줄(대기색 글자 · 연회색 알약 · 탭 = 승인함) */}
      {pending > 0 && (
        <Link
          href="/accounting/inbox"
          className="-mt-2 flex items-center justify-between rounded-full bg-b27-card px-4 py-2 font-num text-[13px] transition active:opacity-80"
        >
          <span className="text-b27-wait">
            승인대기 <span className="font-medium">{pending}</span>건
            <span className="ml-2 text-b27-muted">
              {[cardPending > 0 ? `카드 ${cardPending}` : '', recPending > 0 ? `반복 ${recPending}` : ''].filter(Boolean).join(' · ')}
            </span>
          </span>
          <span className="text-b27-muted">→</span>
        </Link>
      )}

      {/* 월 달력 — 숫자만. 거래 있는 날 남색 · 없는 날 회색 · 오늘 남색 원 · 선택일 연회색 */}
      <section className="px-1">
        <div className="grid grid-cols-7 pb-1 text-center font-num text-[11px] font-medium">
          {WEEK.map((w, i) => (
            <div key={w} className={i === 0 ? 'text-b27-sun' : i === 6 ? 'text-b27-sat' : 'text-b27-muted'}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d, i) => {
            if (d == null) return <div key={`e${i}`} className="h-10" />
            const key = `${ym}-${pad(d)}`
            const has = byDay.has(key)
            const isSel = key === selected
            const isToday = key === today
            const dow = i % 7
            const dayColor = dow === 0 ? 'text-b27-sun' : dow === 6 ? 'text-b27-sat' : 'text-b27-ink'
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                aria-current={isToday ? 'date' : undefined}
                className={`flex h-10 items-center justify-center rounded-lg transition ${isSel && !isToday ? 'bg-b27-card' : ''}`}
              >
                <span
                  className={`flex h-7 min-w-[28px] items-center justify-center rounded-full px-1 font-num text-[14px] font-medium ${
                    isToday ? 'bg-b27-ink text-white' : `${dayColor} ${has ? '' : 'opacity-40'}`
                  }`}
                >
                  {d}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 카드대금 — 접힘 줄 = 연한 빨강 알약(총액 · 가장 가까운 상환일 · ▾), 탭 = 펼침(기기별 기억, 상환 3일 전 자동).
          펼침 = 흰 바탕 행(카드사 · 매월 N일 · 금액, 탭 = 자산 탭) + [상환][잔액 0][자산 →] */}
      {cardDue.length > 0 && (
        <section>
          <button
            type="button"
            onClick={toggleCard}
            aria-expanded={cardExpanded}
            className="flex w-full items-center justify-between rounded-full bg-[#FDECEA] px-4 py-2 font-num text-[13px] text-b27-expense transition active:opacity-80"
          >
            <span>
              카드대금 <span className="ml-1 font-medium">{cardTotal}</span>
            </span>
            <span className="text-[12px] text-[#C98E8B]">
              {nextDue ? `${nextDue.getMonth() + 1}/${nextDue.getDate()} 상환` : ''}
              <span className="ml-1.5">{cardExpanded ? '▴' : '▾'}</span>
            </span>
          </button>
          {cardExpanded && (
            <div className="px-1 pt-1">
              {cardDue.map((g) => (
                <Link key={g.brand} href="/accounting/assets" className="flex items-center justify-between gap-3 border-b border-b27-line py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] text-b27-ink">
                      {g.brand}
                      {g.count > 1 && g.owners.length ? `(${g.owners.join(',')})` : ''}
                    </span>
                    {g.dueDay && <span className="block font-num text-[11px] text-b27-muted">매월 {g.dueDay}일</span>}
                  </span>
                  <span className="shrink-0 font-num text-[14px] font-medium text-b27-expense">{fmtGroup(g)}</span>
                </Link>
              ))}
              <div className="flex items-center justify-end gap-1.5 pb-1 pt-2">
                <CardRepayButton balances={balances} options={options} compact />
                <Link href="/accounting/assets" className="inline-flex h-8 items-center rounded-full bg-b27-card px-3.5 font-num text-[13px] font-medium text-b27-muted">
                  자산 →
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 선택일 내역 — 10px 색 사각형 · 이름 · 금액 */}
      <section className="px-1">
        <div className="flex items-baseline justify-between font-num text-[12px] text-b27-muted">
          <span>
            {sel.getMonth() + 1}월 {sel.getDate()}일 ({WEEK[sel.getDay()]})
          </span>
          <span className="flex gap-3">
            {selDay && selDay.inc !== 0 && <span className="text-b27-income">+{fmtFull(selDay.inc, showCur)}</span>}
            {selDay && selDay.exp !== 0 && <span className="text-b27-expense">−{fmtFull(selDay.exp, showCur)}</span>}
          </span>
        </div>
        {dayRows.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-b27-muted">거래 없음</p>
        ) : (
          <ul>
            {dayRows.map((r) => {
              const it = r.itemId ? itemOf.get(r.itemId) : undefined
              const counted = r.gubun === '수입' || r.gubun === '지출'
              const color = (counted && r.itemId ? itemColor.get(r.itemId) : undefined) ?? PASTEL_NEUTRAL
              const label = it?.name ?? r.gubun ?? '—'
              const sub = [r.name, r.vendor].filter(Boolean).join(' · ')
              const isCard = r.gubun === '지출' && !!r.accountId && cardIds.has(r.accountId)
              const a = amt(r)
              return (
                <li key={r.id} className="border-b border-b27-line">
                  <button
                    type="button"
                    onClick={() => router.push(`/accounting/entry?edit=${r.id}`)}
                    className={`flex w-full items-center gap-3 py-3 text-left ${counted ? '' : 'opacity-60'}`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: color.fill }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-b27-ink">{label}</span>
                      {sub && <span className="block truncate text-[11px] text-b27-muted">{sub}</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className={`block font-num text-[14px] font-medium ${
                          r.gubun === '지출' ? 'text-b27-expense' : r.gubun === '수입' ? 'text-b27-income' : 'text-b27-muted'
                        }`}
                      >
                        {fmtFull(r.gubun === '지출' ? -a : a, showCur)}
                      </span>
                      {isCard && <span className="text-[10px] text-b27-muted">카드</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <Link
          href={`/accounting/entry?date=${selected}`}
          className="mt-3 flex h-10 items-center justify-center rounded-full bg-b27-card text-[12px] text-b27-muted transition hover:text-b27-ink max-md:hidden"
        >
          ＋ 이 날 기록
        </Link>
      </section>

      {/* 당겨서 기록 안내(모바일) — 당긴 만큼 높이가 늘어나고, 기준을 넘으면 색이 바뀐다 */}
      <div
        className={`flex items-center justify-center overflow-hidden text-[12px] transition-colors md:hidden ${pull >= PULL_MAX ? 'text-b27-ink' : 'text-b27-muted'}`}
        style={{ height: pull, opacity: pull > 8 ? 1 : 0 }}
        aria-hidden="true"
      >
        {pull >= PULL_MAX ? '놓으면 기록 화면으로' : '↑ 더 당겨서 기록'}
      </div>
    </div>
  )
}
