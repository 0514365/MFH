'use client'
// MFH-ACCOUNTING-SEARCH-FILTERS-V1
// 회계 검색 공용 UI — 검색 화면(search/SearchView)·내역 탭(TransactionList)이 함께 쓴다.
// · SearchInput(둥근 검색창 + ✕ + 최근 검색어 5개, 기기별 localStorage) · FilterRow(라벨 + 칩) · PeriodFilter(전체·이번 주·이번 달·지정)
// · SortToggle(금액순 · 날짜순, 같은 것 다시 = 방향) · Sheet(바텀시트) · ItemSheet(항목 아이콘 다중선택) · AccountSheet(계좌 다중선택)
// · rangeOf(기간 → [from, to]) · matchText(내용·구매처·항목명·금액 숫자)
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { AcctOptions, InoutRow } from '@/lib/accounting-types'
import { PASTEL_NEUTRAL, type Pastel } from '@/lib/acct-display'
import { CatIcon } from '@/lib/acct-icons'

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
  title: string
  onClear: () => void
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-surface md:rounded-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-line px-4 py-3">
          <span className="flex-1 text-[16px] font-bold text-ink">{title}</span>
          <button type="button" onClick={onClear} className="mr-3 text-[13px] font-medium text-muted">
            초기화
          </button>
          <button type="button" onClick={onClose} className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-white">
            완료
          </button>
        </div>
        <div className="overflow-y-auto px-4 pt-3">{children}</div>
      </div>
    </div>
  )
}

// 항목 시트 — 지출·수입별 아이콘 5열 다중선택(숨긴 항목은 흐리게).
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
  return (
    <Sheet title="항목" onClear={() => onChange(new Set())} onClose={onClose}>
      {(['지출', '수입'] as const).map((g) => (
        <div key={g} className="mb-4">
          <div className="mb-2 text-[13px] font-semibold text-muted">{g}</div>
          <div className="grid grid-cols-5 gap-x-1 gap-y-3">
            {options.items[g].map((i) => {
              const on = value.has(i.id)
              return (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => onChange(toggleIn(value, i.id))}
                  aria-pressed={on}
                  className={`flex flex-col items-center gap-1 ${i.active === false ? 'opacity-50' : ''}`}
                >
                  <span className={`rounded-full p-0.5 ring-2 ${on ? 'ring-primary' : 'ring-transparent'}`}>
                    <CatIcon name={i.name} category={i.category} color={colors.get(i.id)?.fill ?? PASTEL_NEUTRAL.fill} size={40} />
                  </span>
                  <span className={`w-full truncate text-center text-[11px] ${on ? 'font-bold text-primary' : 'text-ink'}`}>{i.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </Sheet>
  )
}

// 계좌 시트 — 계좌 알약 다중선택(신용카드는 「카드」 표시).
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
  return (
    <Sheet title="계좌" onClear={() => onChange(new Set())} onClose={onClose}>
      <div className="flex flex-wrap gap-2 pb-2">
        {options.accounts.map((a) => {
          const on = value.has(a.id)
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(toggleIn(value, a.id))}
              aria-pressed={on}
              className={`rounded-full border px-3 py-1.5 text-[14px] font-semibold transition ${
                on ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink'
              } ${a.active === false ? 'opacity-50' : ''}`}
            >
              {a.name}
              {cardIds.has(a.id) && <span className={`ml-1 text-[10px] ${on ? 'text-white/80' : 'text-faint'}`}>카드</span>}
            </button>
          )
        })}
      </div>
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
