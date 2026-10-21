'use client'
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
import { PASTEL_NEUTRAL, fmtShow, hnlRateOf, itemPastels, toShow, useShowCur, type Pastel, type ShowCur } from '@/lib/acct-display'
import { blockHalo } from '@/lib/palette'
import { CurToggle, HeaderMonthNav, HeaderPortal } from './AccountingTitle'

type Mode = '지출' | '수입'
const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const BLOCK_MAX = 8 // 항목 블록 최대(상위 7 + 기타) — 9번째 칸은 합계

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const isYmd = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
const fmtFull = fmtShow
// 블록 금액 — 정수, 백만 이상만 M. (3열 블록에 6자리까지 들어간다)
const fmtBlock = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.round(n).toLocaleString('en-US'))

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
  const [mode, setMode] = useState<Mode>('지출')
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

  // 그달 집계 — 수입·지출 합, 일별 합, 항목별 합(모드별)
  const { income, expense, byDay, byItem } = useMemo(() => {
    let income = 0
    let expense = 0
    const byDay = new Map<string, { inc: number; exp: number }>()
    const byItem = { 수입: new Map<string, number>(), 지출: new Map<string, number>() }
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
      const key = r.itemId ?? ''
      const m = byItem[r.gubun]
      m.set(key, (m.get(key) ?? 0) + a)
    }
    return { income, expense, byDay, byItem }
    // amt 는 showCur·hnlRate 에 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent, ym, showCur, hnlRate])

  // 블록 지도 — 모드의 항목별 합을 큰 순서로, 상위 7 + 「기타」(나머지 합). 색은 항목 고정색(기타는 중립).
  const blocks = useMemo(() => {
    const rows = [...byItem[mode].entries()]
      .map(([id, sum]) => ({ id, sum, label: itemOf.get(id)?.name ?? '미분류', color: itemColor.get(id) ?? PASTEL_NEUTRAL }))
      .filter((b) => b.sum > 0)
      .sort((a, b) => b.sum - a.sum)
    if (rows.length <= BLOCK_MAX) return rows
    const head = rows.slice(0, BLOCK_MAX - 1)
    const rest = rows.slice(BLOCK_MAX - 1).reduce((t, b) => t + b.sum, 0)
    return [...head, { id: '', sum: rest, label: '기타', color: PASTEL_NEUTRAL as Pastel }]
  }, [byItem, mode, itemOf, itemColor])

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
  const monthFrom = `${ym}-01`
  const monthTo = `${ym}-${pad(daysInMonth)}`

  function moveMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1)
    const t = today!
    setSelected(ymd(d).slice(0, 7) === t.slice(0, 7) ? t : ymd(d))
  }

  // 블록 탭 → 그 항목의 이번 달 내역(기타는 모드 전체)
  function openLedger(itemId: string) {
    const q = new URLSearchParams({ gubun: mode, from: monthFrom, to: monthTo })
    if (itemId) q.set('item', itemId)
    router.push(`/accounting/ledger?${q.toString()}`)
  }

  const sel = new Date(`${selected}T00:00:00`)
  const selDay = byDay.get(selected)
  const total = mode === '지출' ? expense : income
  const notThisMonth = ym !== today.slice(0, 7)

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

      {/* 제목 줄 — 지출/수입 글자 토글 · 오늘 · (md 이상 L/$) · 그달 금액 */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-4 font-num text-[15px]">
          {(['지출', '수입'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
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
          <span className={`font-num text-[17px] font-medium ${mode === '지출' ? 'text-b27-expense' : 'text-b27-income'}`}>{fmtFull(total, showCur)}</span>
        </div>
      </div>

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

      {/* 블록 지도 — 그달 항목별(모드) 3열, 흰 글자 + 할로, 우하단 남색 합계. 모바일은 화면 폭 꽉 채움 */}
      {blocks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-b27-line px-4 py-8 text-center text-[13px] text-b27-muted">
          이번 달 {mode}이 아직 없어요
          <span className="mt-1 block text-[12px]">＋ 버튼으로 첫 기록을 남기면 여기에 블록이 생깁니다</span>
        </p>
      ) : (
        <section className="grid grid-cols-3 gap-[3px] bg-b27-paper max-md:-mx-4 md:overflow-hidden md:rounded-2xl" style={{ gridAutoRows: '84px' }}>
          {blocks.map((b) => (
            <button
              key={b.id || '기타'}
              type="button"
              onClick={() => openLedger(b.id)}
              className="flex min-w-0 flex-col items-center justify-center overflow-hidden text-white transition active:scale-[0.97]"
              style={{ background: b.color.bg, textShadow: b.color.n ? blockHalo(b.color.n) : undefined, color: b.color.n ? '#fff' : undefined }}
            >
              <span className={`font-num text-[20px] font-medium leading-none ${b.color.n ? '' : 'text-b27-ink'}`}>{fmtBlock(b.sum)}</span>
              <span className={`mt-1 max-w-full truncate px-2 text-[11px] font-medium ${b.color.n ? '' : 'text-b27-muted'}`}>{b.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => openLedger('')}
            className="flex min-w-0 flex-col items-center justify-center bg-b27-ink text-white transition active:scale-[0.97]"
          >
            <span className="font-num text-[20px] font-medium leading-none">{fmtBlock(total)}</span>
            <span className="mt-1 text-[11px] font-medium opacity-80">합계</span>
          </button>
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
