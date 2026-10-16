'use client'
// MFH-ACCOUNTING-CHARTS-V2 — 위플형 통계: 추이 파스텔(수입 하늘·지출 코랄) + 표시 통화 fmt prop · PastelDonut(카테고리 고정 파스텔, 가운데 '가장 큰 ○○')
// MFH-ACCOUNTING-CHARTS-V1
// 통계 탭 차트 부품(의존성 0, SVG 직접) — Card · 추이(hover 툴팁 + 막대 클릭 선택) · 파스텔 도넛. 색 = 위플 파스텔(lib/acct-display).
import { useState, type ReactNode } from 'react'
import { PASTEL_EXPENSE, PASTEL_INCOME } from '@/lib/acct-display'

export const INCOME = PASTEL_INCOME
export const EXPENSE = PASTEL_EXPENSE

export function fmtUsd(n: number): string {
  const s = `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

// ── 월별(연도별) 추이 — 그룹 막대 + 순액 선 · hover 툴팁 · 클릭 선택 ─────────
export type TrendBucket = { key: string; label: string; income: number; expense: number }
export function TrendChart({
  buckets,
  selected,
  onSelect,
  fmt = fmtUsd,
  hint = '막대 클릭 = 그 달만 보기',
}: {
  buckets: TrendBucket[]
  selected: string | null
  onSelect: (key: string | null) => void
  fmt?: (n: number) => string
  hint?: string
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
          <div className="flex justify-between"><span className="text-faint">수입</span><b className="font-display text-blue-700">{fmt(h.income)}</b></div>
          <div className="flex justify-between"><span className="text-faint">지출</span><b className="font-display text-red-700">{fmt(h.expense)}</b></div>
          <div className="flex justify-between border-t border-line pt-1"><span className="text-faint">순액</span><b className={`font-display ${h.income - h.expense >= 0 ? 'text-ink' : 'text-red-700'}`}>{fmt(h.income - h.expense)}</b></div>
        </div>
      )}
      <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-faint">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: INCOME }} />수입</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: EXPENSE }} />지출</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0 w-3 border-t border-dashed border-muted" />순액</span>
        <span className="text-faint">· {hint}</span>
      </div>
    </div>
  )
}

// ── 도넛 — hover 강조·가운데 값 · 조각/범례 클릭 ───────────────────────────
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const [x0, y0] = p(a0)
  const [x1, y1] = p(a1)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
}
// ── 파스텔 도넛(위플형) — 조각 색 = 호출측 지정(카테고리 고정 파스텔), 가운데 = 가장 큰 조각 이름·비중. 범례 없음(아래 막대 목록이 대신). ──
export type PastelSlice = { key: string; name: string; sum: number; fill: string }
export function PastelDonut({
  slices,
  total,
  topLabel,
  onPick,
}: {
  slices: PastelSlice[]
  total: number
  topLabel: string // 예: '가장 큰 지출'
  onPick?: (s: PastelSlice) => void
}) {
  if (total <= 0 || slices.length === 0) return <p className="py-10 text-center text-xs text-faint">거래 없음</p>
  const R = 64
  const r = 40
  const C = 70
  const mid = (R + r) / 2
  let a = -Math.PI / 2
  const arcs = slices.map((s) => {
    const span = (Math.max(0, s.sum) / total) * Math.PI * 2
    const a0 = a
    a += span
    return { s, a0, a1: a }
  })
  const top = slices[0]
  const pct = Math.round((top.sum / total) * 100)
  return (
    <svg viewBox="0 0 140 140" width={200} height={200} className="mx-auto block" role="img" aria-label={`${topLabel} ${top.name} ${pct}%`}>
      {arcs.map(({ s, a0, a1 }) =>
        a1 - a0 >= Math.PI * 2 - 1e-6 ? (
          <circle key={s.key} cx={C} cy={C} r={mid} fill="none" stroke={s.fill} strokeWidth={R - r} style={{ cursor: onPick ? 'pointer' : 'default' }} onClick={() => onPick?.(s)} />
        ) : a1 - a0 > 0 ? (
          <path key={s.key} d={arcPath(C, C, mid, a0, a1)} fill="none" stroke={s.fill} strokeWidth={R - r} style={{ cursor: onPick ? 'pointer' : 'default' }} onClick={() => onPick?.(s)} />
        ) : null,
      )}
      {arcs.length > 1 &&
        arcs.map(({ s, a0 }) => (
          <line key={`gap-${s.key}`} x1={C + (r - 1) * Math.cos(a0)} y1={C + (r - 1) * Math.sin(a0)} x2={C + (R + 1) * Math.cos(a0)} y2={C + (R + 1) * Math.sin(a0)} stroke="var(--surface)" strokeWidth={1.5} pointerEvents="none" />
        ))}
      <text x={C} y={C - 10} textAnchor="middle" fontSize={7.5} fill="var(--text-faint)">
        {topLabel}
      </text>
      <text x={C} y={C + 3} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--text)">
        {top.name.length > 7 ? `${top.name.slice(0, 7)}…` : top.name}
      </text>
      <text x={C} y={C + 17} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text)" fontFamily="var(--font-montserrat)">
        {pct}%
      </text>
    </svg>
  )
}
