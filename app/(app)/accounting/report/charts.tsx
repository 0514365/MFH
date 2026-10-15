'use client'
// MFH-ACCOUNTING-CHARTS-V1
// 분석 탭 차트 부품(의존성 0, SVG 직접) — KPI 타일 · 월별 추이(hover 툴팁 + 월 클릭 선택) · 도넛(hover 강조 + 조각 클릭 drill-down).
// 색: 수입 청 · 지출 적(내역과 통일). 도넛 범주색 6개는 dataviz 검증(색각·대비) 통과 팔레트, 7번째부터 '기타' 회색.
import { useState, type ReactNode } from 'react'

export const INCOME = '#2563EB'
export const EXPENSE = '#DC2626'
export const CAT_COLORS = ['#A33A3F', '#2563EB', '#0D9488', '#D97706', '#7C3AED', '#DB2777']
export const OTHER_COLOR = '#A8A6A4'

export function fmtUsd(n: number): string {
  const s = `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return n < 0 ? `−${s}` : s
}
const fmtShort = (n: number) => {
  const a = Math.abs(n)
  const s = a >= 1000 ? `$${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : `$${a.toFixed(0)}`
  return n < 0 ? `−${s}` : s
}

export function Card({
  title,
  right,
  rightColor,
  children,
}: {
  title: ReactNode
  right?: ReactNode
  rightColor?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-bold text-muted">{title}</h2>
        {right != null && (
          <span className={`font-display text-[13px] font-bold ${rightColor ?? 'text-ink'}`}>{right}</span>
        )}
      </div>
      {children}
    </section>
  )
}

// ── KPI 타일 ───────────────────────────────────────────
export type Kpi = { label: string; value: string; color?: string; delta?: { text: string; good: boolean | null } }
export function KpiTiles({ tiles }: { tiles: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[11px] text-faint">{t.label}</div>
          <div className={`mt-0.5 font-display text-[18px] font-bold ${t.color ?? 'text-ink'}`}>{t.value}</div>
          {t.delta && (
            <div
              className={`mt-0.5 text-[11px] ${
                t.delta.good == null ? 'text-faint' : t.delta.good ? 'text-blue-700' : 'text-red-700'
              }`}
            >
              {t.delta.text}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── 월별(연도별) 추이 — 그룹 막대 + 순액 선 · hover 툴팁 · 클릭 선택 ─────────
export type TrendBucket = { key: string; label: string; income: number; expense: number }
export function TrendChart({
  buckets,
  selected,
  onSelect,
}: {
  buckets: TrendBucket[]
  selected: string | null
  onSelect: (key: string | null) => void
}) {
  const [hover, setHover] = useState<number | null>(null)
  const hasData = buckets.some((b) => b.income > 0 || b.expense > 0)
  if (!hasData) return <p className="py-6 text-center text-xs text-faint">거래 없음</p>
  const max = Math.max(1, ...buckets.map((b) => Math.max(b.income, b.expense)))
  const n = buckets.length
  const groupW = 40
  const W = n * groupW
  const H = 170
  const padT = 14
  const padB = 22
  const chartH = H - padT - padB
  const base = padT + chartH
  const barW = 13
  const y = (v: number) => base - (v / max) * chartH
  const netPts = buckets.map((b, i) => `${i * groupW + groupW / 2},${y(Math.max(0, b.income - b.expense))}`)
  const h = hover != null ? buckets[hover] : null
  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="xMidYMid meet" role="img" aria-label="수입·지출 추이">
          {[0.5, 1].map((f) => (
            <line key={f} x1={0} y1={y(max * f)} x2={W} y2={y(max * f)} stroke="var(--line)" strokeWidth={1} strokeDasharray="2 3" />
          ))}
          <line x1={0} y1={base} x2={W} y2={base} stroke="var(--line)" strokeWidth={1} />
          {buckets.map((b, i) => {
            const cx = i * groupW + groupW / 2
            const dim = selected != null && selected !== b.key
            const op = dim ? 0.3 : hover != null && hover !== i ? 0.75 : 1
            return (
              <g key={b.key} opacity={op} style={{ transition: 'opacity .15s' }}>
                {selected === b.key && <rect x={i * groupW} y={padT - 6} width={groupW} height={chartH + 6} fill="var(--primary-soft)" rx={6} />}
                <rect x={cx - barW - 1} y={y(b.income)} width={barW} height={base - y(b.income)} rx={3} fill={INCOME} />
                <rect x={cx + 1} y={y(b.expense)} width={barW} height={base - y(b.expense)} rx={3} fill={EXPENSE} />
                <text x={cx} y={H - 7} textAnchor="middle" fontSize={9.5} fill={selected === b.key ? 'var(--primary)' : 'var(--text-faint)'} fontWeight={selected === b.key ? 700 : 400}>
                  {b.label}
                </text>
                <rect
                  x={i * groupW}
                  y={0}
                  width={groupW}
                  height={H}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  onClick={() => onSelect(selected === b.key ? null : b.key)}
                />
              </g>
            )
          })}
          <polyline points={netPts.join(' ')} fill="none" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinejoin="round" strokeDasharray="3 2" pointerEvents="none" />
        </svg>
      </div>
      {h && hover != null && (
        <div
          className="pointer-events-none absolute top-1 z-10 w-[150px] rounded-xl border border-line bg-surface px-3 py-2 text-[11px] shadow-soft"
          style={{ left: `calc(${((hover + 0.5) / n) * 100}% - 75px)` }}
        >
          <div className="mb-1 font-bold text-ink">{h.label}</div>
          <div className="flex justify-between"><span className="text-faint">수입</span><b className="font-display text-blue-700">{fmtUsd(h.income)}</b></div>
          <div className="flex justify-between"><span className="text-faint">지출</span><b className="font-display text-red-700">{fmtUsd(h.expense)}</b></div>
          <div className="flex justify-between border-t border-line pt-1"><span className="text-faint">순액</span><b className={`font-display ${h.income - h.expense >= 0 ? 'text-ink' : 'text-red-700'}`}>{fmtUsd(h.income - h.expense)}</b></div>
        </div>
      )}
      <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-faint">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: INCOME }} />수입</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: EXPENSE }} />지출</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0 w-3 border-t border-dashed border-muted" />순액</span>
        <span className="text-faint">· 막대 클릭 = 그 달만 보기</span>
      </div>
    </div>
  )
}

// ── 도넛 — hover 강조·가운데 값 · 조각/범례 클릭 ───────────────────────────
export type Slice = { key: string; name: string; sum: number; count?: number }
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const [x0, y0] = p(a0)
  const [x1, y1] = p(a1)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
}
// 상위 maxSlices-1 + 나머지 '기타'. 색은 순서 고정(CAT_COLORS), 기타는 회색.
export function foldSlices(rows: Slice[], maxSlices = 7): Slice[] {
  const sorted = [...rows].filter((r) => r.sum > 0).sort((a, b) => b.sum - a.sum)
  if (sorted.length <= maxSlices) return sorted
  const head = sorted.slice(0, maxSlices - 1)
  const tail = sorted.slice(maxSlices - 1)
  return [...head, { key: '__other__', name: `기타 ${tail.length}개`, sum: tail.reduce((s, r) => s + r.sum, 0) }]
}
export function sliceColor(i: number, key: string): string {
  return key === '__other__' ? OTHER_COLOR : CAT_COLORS[i % CAT_COLORS.length]
}

export function Donut({
  slices,
  total,
  centerLabel,
  onPick,
  emptyText = '거래 없음',
}: {
  slices: Slice[]
  total: number
  centerLabel: string
  onPick?: (s: Slice) => void // 조각/범례 클릭(기타 제외)
  emptyText?: string
}) {
  const [hover, setHover] = useState<string | null>(null)
  if (total <= 0 || slices.length === 0) return <p className="py-6 text-center text-xs text-faint">{emptyText}</p>
  const R = 60
  const r = 36
  const C = 70
  let a = -Math.PI / 2
  const arcs = slices.map((s, i) => {
    const span = (s.sum / total) * Math.PI * 2
    const a0 = a
    a += span
    return { s, i, a0, a1: a, color: sliceColor(i, s.key) }
  })
  const hv = slices.find((s) => s.key === hover)
  const pct = (v: number) => (total > 0 ? `${((v / total) * 100).toFixed(v / total < 0.1 ? 1 : 0)}%` : '')
  return (
    <div className="flex flex-col items-center gap-4 @md:flex-row @md:items-start">
      <svg viewBox="0 0 140 140" width={170} height={170} className="shrink-0" role="img" aria-label={centerLabel}>
        {arcs.map(({ s, a0, a1, color }) => {
          const dim = hover != null && hover !== s.key
          const full = a1 - a0 >= Math.PI * 2 - 1e-6
          const mid = (R + r) / 2
          const sw = hover === s.key ? R - r + 6 : R - r
          return (
            <g key={s.key} opacity={dim ? 0.35 : 1} style={{ transition: 'opacity .15s' }}>
              {full ? (
                <circle cx={C} cy={C} r={mid} fill="none" stroke={color} strokeWidth={sw} />
              ) : (
                <path d={arcPath(C, C, mid, a0, a1)} fill="none" stroke={color} strokeWidth={sw} />
              )}
              {/* 히트 영역 — 조각보다 넓은 투명 스트로크(pointer-events: stroke) */}
              {full ? (
                <circle cx={C} cy={C} r={mid} fill="none" stroke="transparent" strokeWidth={R - r + 14} pointerEvents="stroke" style={{ cursor: s.key === '__other__' || !onPick ? 'default' : 'pointer' }} onPointerEnter={() => setHover(s.key)} onPointerLeave={() => setHover(null)} onClick={() => s.key !== '__other__' && onPick?.(s)} />
              ) : (
                <path d={arcPath(C, C, mid, a0, a1)} fill="none" stroke="transparent" strokeWidth={R - r + 14} pointerEvents="stroke" style={{ cursor: s.key === '__other__' || !onPick ? 'default' : 'pointer' }} onPointerEnter={() => setHover(s.key)} onPointerLeave={() => setHover(null)} onClick={() => s.key !== '__other__' && onPick?.(s)} />
              )}
            </g>
          )
        })}
        {/* 조각 사이 2px 표면 간격 */}
        {arcs.length > 1 &&
          arcs.map(({ s, a0 }) => (
            <line key={`gap-${s.key}`} x1={C + (r - 2) * Math.cos(a0)} y1={C + (r - 2) * Math.sin(a0)} x2={C + (R + 2) * Math.cos(a0)} y2={C + (R + 2) * Math.sin(a0)} stroke="var(--surface)" strokeWidth={2} pointerEvents="none" />
          ))}
        <text x={C} y={C - 6} textAnchor="middle" fontSize={8} fill="var(--text-faint)">
          {hv ? hv.name : centerLabel}
        </text>
        <text x={C} y={C + 8} textAnchor="middle" fontSize={hv ? 11 : 12} fontWeight={700} fill="var(--text)" fontFamily="var(--font-montserrat)">
          {fmtShort(hv ? hv.sum : total)}
        </text>
        {hv && (
          <text x={C} y={C + 20} textAnchor="middle" fontSize={8} fill="var(--text-muted)">
            {pct(hv.sum)}
          </text>
        )}
      </svg>
      <ul className="w-full min-w-0 flex-1 space-y-1">
        {arcs.map(({ s, color }) => {
          const clickable = s.key !== '__other__' && !!onPick
          return (
            <li
              key={s.key}
              onPointerEnter={() => setHover(s.key)}
              onPointerLeave={() => setHover(null)}
              onClick={() => clickable && onPick?.(s)}
              className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-[13px] transition ${
                hover === s.key ? 'bg-surface-subtle' : ''
              } ${clickable ? 'cursor-pointer' : ''}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
                <span className="truncate text-ink">{s.name}</span>
                {s.count != null && <span className="shrink-0 text-[11px] text-faint">{s.count}건</span>}
              </span>
              <span className="shrink-0 font-display font-bold text-ink">
                {fmtUsd(s.sum)}
                <span className="ml-1.5 inline-block w-9 text-right text-[11px] font-normal text-faint">{pct(s.sum)}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
