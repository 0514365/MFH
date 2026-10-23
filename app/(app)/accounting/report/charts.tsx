'use client'
// MFH-ACCOUNTING-CHARTS-V4 — 2027(회계 잔여 b): 안 쓰는 Card · TrendChart · fmtUsd · INCOME/EXPENSE 삭제(추이는 ReportView 막대 12개가 대신). PastelDonut · 타입만 남김.
// MFH-ACCOUNTING-CHARTS-V3 — PastelDonut 위플형: 도넛 바깥에 조각별 아이콘 원(흰 선 아이콘)+연결선, 조각 위 % (작은 조각 생략)
// MFH-ACCOUNTING-CHARTS-V2 — 위플형 통계: 추이 파스텔(수입 하늘·지출 코랄) + 표시 통화 fmt prop · PastelDonut(카테고리 고정 파스텔, 가운데 '가장 큰 ○○')
// MFH-ACCOUNTING-CHARTS-V1
// 통계 탭 차트 부품(의존성 0, SVG 직접) — 파스텔 도넛 + 추이 버킷 타입.

export type TrendBucket = { key: string; label: string; income: number; expense: number }

// ── 도넛 — hover 강조·가운데 값 · 조각/범례 클릭 ───────────────────────────
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const [x0, y0] = p(a0)
  const [x1, y1] = p(a1)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
}
// ── 파스텔 도넛(위플형) — 조각 색 = 호출측 지정(카테고리 고정 파스텔), 가운데 = 가장 큰 조각 이름·비중. 범례 없음(아래 막대 목록이 대신). ──
// cat = 아이콘 대체용 대분류(항목 이름에 아이콘이 없을 때).
export type PastelSlice = { key: string; name: string; sum: number; fill: string; cat?: string | null }
// 2027 Minimal Block — 가는 도넛(흰 틈) + 가운데 「가장 큰 항목 %」. 바깥 아이콘 원·조각 위 % 제거(범례가 대신). 색은 호출부(블록 8색).
export function PastelDonut({
  slices,
  total,
  topLabel,
  onPick,
}: {
  slices: PastelSlice[]
  total: number
  topLabel: string // 예: '가장 큰 지출' (aria 용)
  onPick?: (s: PastelSlice) => void
}) {
  if (total <= 0 || slices.length === 0) return <p className="py-8 text-center text-[12px] text-b27-muted">거래 없음</p>
  const W = 160
  const H = 160
  const CX = W / 2
  const CY = H / 2
  const R = 74
  const r = 50
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
  const pick = (s: PastelSlice) => onPick?.(s)
  const cursor = { cursor: onPick ? 'pointer' : 'default' }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-[150px] w-[150px] shrink-0" role="img" aria-label={`${topLabel} ${top.name} ${pct}%`}>
      {arcs.map(({ s, a0, a1 }) =>
        a1 - a0 >= Math.PI * 2 - 1e-6 ? (
          <circle key={s.key} cx={CX} cy={CY} r={mid} fill="none" stroke={s.fill} strokeWidth={R - r} style={cursor} onClick={() => pick(s)} />
        ) : a1 - a0 > 0 ? (
          <path key={s.key} d={arcPath(CX, CY, mid, a0, a1)} fill="none" stroke={s.fill} strokeWidth={R - r} style={cursor} onClick={() => pick(s)} />
        ) : null,
      )}
      {arcs.length > 1 &&
        arcs.map(({ s, a0 }) => (
          <line key={`gap-${s.key}`} x1={CX + (r - 1) * Math.cos(a0)} y1={CY + (r - 1) * Math.sin(a0)} x2={CX + (R + 1) * Math.cos(a0)} y2={CY + (R + 1) * Math.sin(a0)} stroke="#fff" strokeWidth={3} pointerEvents="none" />
        ))}
      <text x={CX} y={CY + 2} textAnchor="middle" fontSize={22} fontWeight={500} fill="var(--b27-ink)" fontFamily="var(--font-manrope)">
        {pct}%
      </text>
      <text x={CX} y={CY + 18} textAnchor="middle" fontSize={9.5} fill="var(--b27-muted)">
        {top.name.length > 7 ? `${top.name.slice(0, 7)}…` : top.name}
      </text>
    </svg>
  )
}
