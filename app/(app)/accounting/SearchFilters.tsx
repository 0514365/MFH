'use client'
// MFH-ACCOUNTING-SEARCH-FILTERS-V3 — 실기 피드백: Sheet 높이 고정(72vh) — 대분류 탭을 바꿔도 시트가 내려앉지 않음(내용 적으면 아래 여백)
// MFH-ACCOUNTING-SEARCH-FILTERS-V2 — 2027 블록 재활용: ItemSheet = 대분류 알약 + 블록 3열 다중선택(✓ + 남색 안쪽 테두리) · AccountSheet = 통화별 이름 행 + 체크 원 · Sheet 헤더 2027(닫기 알약)
// MFH-ACCOUNTING-SEARCH-FILTERS-V1
// 회계 검색 공용 UI — 검색 화면(search/SearchView)·내역 탭(TransactionList)이 함께 쓴다.
// · SearchInput(둥근 검색창 + ✕ + 최근 검색어 5개, 기기별 localStorage) · FilterRow(라벨 + 칩) · PeriodFilter(전체·이번 주·이번 달·지정)
// · SortToggle(금액순 · 날짜순, 같은 것 다시 = 방향) · Sheet(바텀시트) · ItemSheet(항목 아이콘 다중선택) · AccountSheet(계좌 다중선택)
// · rangeOf(기간 → [from, to]) · matchText(내용·구매처·항목명·금액 숫자)
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { AcctOption, AcctOptions, InoutRow } from '@/lib/accounting-types'
import { PASTEL_NEUTRAL, type Pastel } from '@/lib/acct-display'
import { blockHalo } from '@/lib/palette'

export type Period = 'all' | 'week' | 'month' | 'custom'
export type SortKey = 'date' | 'amount'
export type SortDir = 'asc' | 'desc'

export const PERIODS: { key: Period; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'custom', label: '지정' },
]
export const isPeriod = (s: string | undefined): s is Period => PERIODS.some((p) => p.key === s)

const pad = (n: number) => String(n).padStart(2, '0')
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const isYmd = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
const dotDate = (s: string) => s.replaceAll('-', '.')

// 기간 → [from, to] (빈 문자열 = 제한 없음). 주 = 일~토(달력과 같음). today 없으면(마운트 전) 제한 없음.
export function rangeOf(p: Period, today: string | null, from: string, to: string): [string, string] {
  if (p === 'custom') return [from, to]
  if (p === 'all' || !today) return ['', '']
  const d = new Date(`${today}T00:00:00`)
  if (p === 'week') {
    const s = new Date(d)
    s.setDate(d.getDate() - d.getDay())
    const e = new Date(s)
    e.setDate(s.getDate() + 6)
    return [ymd(s), ymd(e)]
  }
  return [ymd(new Date(d.getFullYear(), d.getMonth(), 1)), ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0))]
}

// 오늘(브라우저 로컬) — 서버 UTC 어긋남 방지로 마운트 후 설정.
export function useToday(): string | null {
  const [today, setToday] = useState<string | null>(null)
  useEffect(() => setToday(ymd(new Date())), [])
  return today
}

// 검색어 매칭 — 내용·구매처·항목명 부분 일치, 숫자만이면 원금·USD 금액 숫자 포함도.
export function matchText(r: InoutRow, term: string, itemName: string): boolean {
  const t = term.trim().toLowerCase()
  if (!t) return true
  if ([r.name, r.vendor, itemName].some((s) => s && s.toLowerCase().includes(t))) return true
  const digits = t.replace(/[,\s]/g, '')
  if (!/^\d+(\.\d+)?$/.test(digits)) return false
  return [r.principal, r.amountUsd]
    .filter((n): n is number => n != null)
    .some((n) => String(Math.round(n)).includes(digits) || String(n).includes(digits))
}

export const toggleIn = (set: Set<string>, id: string) => {
  const n = new Set(set)
  if (n.has(id)) n.delete(id)
  else n.add(id)
  return n
}
export const splitIds = (s: string | undefined) => new Set((s ?? '').split(',').filter(Boolean))
export const numOf = (s: string) => {
  const n = Number(s.replace(/,/g, ''))
  return s.trim() && Number.isFinite(n) ? n : null
}
export const summary = (names: string[]) => (names.length === 1 ? names[0] : `${names[0]} 외 ${names.length - 1}`)

export const chipCls = (active: boolean) =>
  `shrink-0 rounded-full px-3 py-1.5 text-[14px] font-semibold transition ${
    active ? 'bg-primary text-white' : 'text-muted hover:text-primary'
  }`
export const pickCls = (active: boolean) =>
  `min-w-0 truncate rounded-full px-3 py-1.5 text-left text-[14px] font-semibold transition ${
    active ? 'bg-primary-soft text-primary' : 'text-muted hover:text-primary'
  }`

// ===== 최근 검색어 =====
const RECENT_KEY = 'mfh-acct-search-recent'
const RECENT_MAX = 5
function loadRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}
function storeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {}
}
// 최근 검색어 목록 + remember(q)(맨 앞으로) · forget(t).
export function useRecentQueries() {
  const [list, setList] = useState<string[]>([])
  useEffect(() => setList(loadRecent()), [])
  const save = (next: string[]) => {
    setList(next)
    storeRecent(next)
  }
  return {
    list,
    remember: (q: string) => {
      const t = q.trim()
      if (t) save([t, ...list.filter((x) => x !== t)].slice(0, RECENT_MAX))
    },
    forget: (t: string) => save(list.filter((x) => x !== t)),
  }
}

// ===== 컴포넌트 =====

// 둥근 검색창 + ✕ + 최근 검색어(검색어가 비었을 때). onCommit = Enter·최근 검색어 탭(디바운스 건너뛰고 즉시 반영).
export function SearchInput({
  value,
  onChange,
  onCommit,
  recent,
  autoFocus = false,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  onCommit: (v: string) => void
  recent: ReturnType<typeof useRecentQueries>
  autoFocus?: boolean
  className?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus) ref.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className={className}>
      <label className="flex h-12 items-center gap-2 rounded-full border border-line bg-surface-subtle px-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-muted" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          ref={ref}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.currentTarget.blur()
            onCommit(value)
            recent.remember(value)
          }}
          placeholder="내용 · 구매처 · 항목 · 금액"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-faint"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('')
              onCommit('')
              ref.current?.focus()
            }}
            aria-label="지우기"
            className="shrink-0 text-faint"
          >
            ✕
          </button>
        )}
      </label>
      {!value && recent.list.length > 0 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
          {recent.list.map((t) => (
            <span key={t} className="flex shrink-0 items-center rounded-full border border-line bg-surface pl-3 text-[13px] text-ink">
              <button
                type="button"
                onClick={() => {
                  onChange(t)
                  onCommit(t)
                }}
                className="py-1"
              >
                {t}
              </button>
              <button type="button" onClick={() => recent.forget(t)} aria-label={`${t} 삭제`} className="px-2 py-1 text-[11px] text-faint">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// 라벨 + 오른쪽 내용 한 줄.
export function FilterRow({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="w-12 shrink-0 text-[14px] font-medium text-ink">{label}</span>
      {children}
    </div>
  )
}

// 칩 단일선택 줄.
export function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
  labelOf,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  labelOf?: (v: T) => string
}) {
  return (
    <FilterRow label={label}>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button key={o || '__all'} type="button" onClick={() => onChange(o)} aria-pressed={value === o} className={chipCls(value === o)}>
            {labelOf ? labelOf(o) : o}
          </button>
        ))}
      </div>
    </FilterRow>
  )
}

// 기간 칩 + 아래 줄(범위 표시 또는 지정 날짜 입력).
export function PeriodFilter({
  period,
  onPeriod,
  from,
  to,
  onFrom,
  onTo,
  range,
}: {
  period: Period
  onPeriod: (p: Period) => void
  from: string
  to: string
  onFrom: (v: string) => void
  onTo: (v: string) => void
  range: [string, string]
}) {
  const [rFrom, rTo] = range
  const label = period === 'all' ? '전체 기간' : rFrom || rTo ? `${rFrom ? dotDate(rFrom) : ''} – ${rTo ? dotDate(rTo) : ''}` : ''
  const dateCls = 'h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-[14px] text-ink md:max-w-[11rem]'
  return (
    <>
      <ChipRow
        label="기간"
        options={PERIODS.map((p) => p.key)}
        value={period}
        onChange={onPeriod}
        labelOf={(k) => PERIODS.find((p) => p.key === k)?.label ?? k}
      />
      {period === 'custom' ? (
        <div className="flex items-center gap-2 pl-14">
          <input type="date" value={from} onChange={(e) => onFrom(e.target.value)} aria-label="시작일" className={dateCls} />
          <span className="text-muted">–</span>
          <input type="date" value={to} onChange={(e) => onTo(e.target.value)} aria-label="종료일" className={dateCls} />
        </div>
      ) : (
        <p className="pl-14 font-display text-[13px] text-muted">{label}</p>
      )}
    </>
  )
}

// 금액순 · 날짜순 — 활성 쪽을 다시 누르면 방향 전환.
export function SortToggle({
  sortKey,
  sortDir,
  onChange,
}: {
  sortKey: SortKey
  sortDir: SortDir
  onChange: (k: SortKey, d: SortDir) => void
}) {
  return (
    <>
      {(['amount', 'date'] as SortKey[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k, k === sortKey ? (sortDir === 'desc' ? 'asc' : 'desc') : 'desc')}
          className={`shrink-0 text-[13px] font-semibold ${sortKey === k ? 'text-ink' : 'text-faint'}`}
        >
          {k === 'amount' ? '금액순' : '날짜순'}
          {sortKey === k && <span className="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>}
        </button>
      ))}
    </>
  )
}

// 바텀시트 — 배경 탭 = 닫기 · 초기화 / 완료.
export function Sheet({
  title,
  onClear,
  onClose,
  children,
}: {
  title: ReactNode
  onClear: () => void
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(43,49,96,0.25)] md:items-center" onClick={onClose}>
      {/* 높이 고정(72vh) — 탭 내용이 적어도 시트가 내려앉지 않고 아래 여백이 남는다(선택 위치 안정) */}
      <div
        className="flex h-[72vh] w-full max-w-md flex-col rounded-t-[22px] bg-b27-paper font-sans text-b27-ink md:h-[70vh] md:rounded-[22px]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3">
          <span className="flex-1 font-num text-[15px] font-medium">{title}</span>
          <button type="button" onClick={onClear} className="mr-2 rounded-full px-3 py-1.5 font-num text-[13px] text-b27-muted">
            초기화
          </button>
          <button type="button" onClick={onClose} className="rounded-full bg-b27-card px-4 py-1.5 font-num text-[13px] font-medium text-b27-ink">
            닫기
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">{children}</div>
      </div>
    </div>
  )
}

// 항목 시트 — 대분류 알약(지출 대분류… · 수입) + 블록 3열 다중선택(탭 = 즉시 반영, ✓ + 남색 안쪽 테두리, 숨긴 항목 흐림). 빠른 기록 ③과 같은 격자.
const CAT_ORDER = ['생활비', '사역비', '사역', '차량', '생활', '운영/행정']
export function ItemSheet({
  options,
  colors,
  value,
  onChange,
  onClose,
}: {
  options: AcctOptions
  colors: Map<string, Pastel>
  value: Set<string>
  onChange: (v: Set<string>) => void
  onClose: () => void
}) {
  // 탭 = 지출 대분류(정해진 순서, 그 외 이름순) + 「수입」
  const tabs: [string, AcctOption[]][] = (() => {
    const m = new Map<string, AcctOption[]>()
    for (const it of options.items['지출']) {
      const c = it.category || '기타'
      if (!m.has(c)) m.set(c, [])
      m.get(c)!.push(it)
    }
    const exp = [...m.entries()].sort((a, b) => (CAT_ORDER.indexOf(a[0]) + 1 || 99) - (CAT_ORDER.indexOf(b[0]) + 1 || 99) || a[0].localeCompare(b[0]))
    return options.items['수입'].length ? [...exp, ['수입', options.items['수입']]] : exp
  })()
  const [tab, setTab] = useState(tabs[0]?.[0] ?? '')
  const list = tabs.find(([c]) => c === tab)?.[1] ?? []
  const countIn = (items: AcctOption[]) => items.filter((i) => value.has(i.id)).length
  return (
    <Sheet
      title={
        <>
          항목{value.size > 0 && <span className="ml-1.5 text-[12px] font-normal text-b27-muted">{value.size} 선택</span>}
        </>
      }
      onClear={() => onChange(new Set())}
      onClose={onClose}
    >
      {tabs.length > 1 && (
        <div className="mb-3 flex gap-1 overflow-x-auto rounded-full bg-b27-card p-[3px] font-num text-[12px]">
          {tabs.map(([c, items]) => {
            const n = countIn(items)
            return (
              <button
                key={c}
                type="button"
                onClick={() => setTab(c)}
                aria-pressed={tab === c}
                className={`shrink-0 rounded-full px-3 py-1.5 leading-none transition ${tab === c ? 'bg-b27-ink font-medium text-white' : 'text-b27-muted'}`}
              >
                {c}
                {n > 0 && <span className="ml-1 opacity-80">{n}</span>}
              </button>
            )
          })}
        </div>
      )}
      <div className="-mx-4 grid grid-cols-3 gap-[3px] bg-b27-paper" style={{ gridAutoRows: '56px' }}>
        {list.map((i) => {
          const on = value.has(i.id)
          const c = colors.get(i.id) ?? PASTEL_NEUTRAL
          return (
            <button
              key={i.id}
              type="button"
              onClick={() => onChange(toggleIn(value, i.id))}
              aria-pressed={on}
              className={`relative flex min-w-0 items-center justify-center px-2 text-[13px] font-medium transition active:scale-[0.97] ${
                c.n ? 'text-white' : 'bg-b27-card text-b27-muted'
              } ${on ? 'shadow-[inset_0_0_0_3px_var(--b27-ink)]' : ''} ${i.active === false ? 'opacity-45' : ''}`}
              style={c.n ? { background: c.bg, textShadow: blockHalo(c.n) } : undefined}
            >
              <span className="truncate">{i.name}</span>
              {on && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white font-num text-[10px] text-b27-ink" style={{ textShadow: 'none' }} aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>
      {list.length === 0 && <p className="py-6 text-center text-[12px] text-b27-muted">항목 없음</p>}
    </Sheet>
  )
}

// 계좌 시트 — 통화별(렘피라 · 달러 · 원화) 이름 행 + 오른쪽 체크 원. 신용카드는 「카드」 표시. 빠른 기록 ②와 같은 행.
const CUR_LABEL: Record<string, string> = { HNL: '렘피라', USD: '달러', KRW: '원화' }
export function AccountSheet({
  options,
  cardIds,
  value,
  onChange,
  onClose,
}: {
  options: AcctOptions
  cardIds: Set<string>
  value: Set<string>
  onChange: (v: Set<string>) => void
  onClose: () => void
}) {
  const groups = (['HNL', 'USD', 'KRW'] as const)
    .map((cur) => [cur, options.accounts.filter((a) => (a.currency ?? 'USD') === cur)] as const)
    .filter(([, list]) => list.length > 0)
  const rest = options.accounts.filter((a) => !['HNL', 'USD', 'KRW'].includes(a.currency ?? 'USD'))
  const row = (a: AcctOption) => {
    const on = value.has(a.id)
    return (
      <li key={a.id}>
        <button type="button" onClick={() => onChange(toggleIn(value, a.id))} aria-pressed={on} className={`flex w-full items-center justify-between gap-3 border-b border-b27-line py-3 text-left ${a.active === false ? 'opacity-50' : ''}`}>
          <span className="min-w-0 truncate text-[14px] text-b27-ink">
            {a.name}
            {cardIds.has(a.id) && <span className="ml-1.5 font-num text-[11px] text-b27-muted">카드</span>}
          </span>
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-num text-[11px] ${on ? 'bg-b27-ink text-white' : 'border border-b27-line'}`} aria-hidden="true">
            {on ? '✓' : ''}
          </span>
        </button>
      </li>
    )
  }
  return (
    <Sheet
      title={
        <>
          계좌{value.size > 0 && <span className="ml-1.5 text-[12px] font-normal text-b27-muted">{value.size} 선택</span>}
        </>
      }
      onClear={() => onChange(new Set())}
      onClose={onClose}
    >
      {groups.map(([cur, list]) => (
        <div key={cur}>
          <div className="mt-1 font-num text-[11px] text-b27-muted">{CUR_LABEL[cur]}</div>
          <ul className="mb-2">{list.map(row)}</ul>
        </div>
      ))}
      {rest.length > 0 && <ul className="mb-2">{rest.map(row)}</ul>}
    </Sheet>
  )
}

// 시트 여는 줄 — 「전체 항목 ›」 / 「식비 외 2 ›」 + 오른쪽 보조(더 보기 등).
export function PickRow({
  label,
  text,
  active,
  onClick,
  right,
}: {
  label: string
  text: string
  active: boolean
  onClick: () => void
  right?: ReactNode
}) {
  return (
    <FilterRow label={label}>
      <button type="button" onClick={onClick} className={pickCls(active)}>
        {text}
        <span className="ml-1 text-faint">›</span>
      </button>
      {right}
    </FilterRow>
  )
}

// 더 보기 / 접기 — 안에 값이 있으면 강조색.
export function MoreToggle({ open, filled, onToggle }: { open: boolean; filled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`ml-auto shrink-0 text-[13px] font-medium underline underline-offset-4 ${filled ? 'text-primary' : 'text-muted'}`}
    >
      {open ? '접기' : '더 보기'}
    </button>
  )
}

// 금액 최소–최대(표시 통화 기준).
export function AmountRange({
  min,
  max,
  onMin,
  onMax,
  symbol,
}: {
  min: string
  max: string
  onMin: (v: string) => void
  onMax: (v: string) => void
  symbol: string
}) {
  const cls =
    'h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-right font-display text-[14px] text-ink placeholder:text-faint md:max-w-[9rem]'
  return (
    <FilterRow label="금액">
      <input inputMode="decimal" value={min} onChange={(e) => onMin(e.target.value)} placeholder={`${symbol} 최소`} className={cls} />
      <span className="text-muted">–</span>
      <input inputMode="decimal" value={max} onChange={(e) => onMax(e.target.value)} placeholder={`${symbol} 최대`} className={cls} />
    </FilterRow>
  )
}
