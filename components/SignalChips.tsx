// MFH-SIGNAL-CHIPS-V2 — 2027 공용 부품(4-0): 신호 칩 = 의미색 면(지남 빨강 · 임박/중요 호박 · 정체 회색), 테두리 없음.
// MFH-SIGNAL-CHIPS-V1 — 규칙 신호 칩 렌더(Phase 4b). 표시 전용(서버 컴포넌트).
// 차분한 파스텔 톤. 0인 칩은 호출부(signals.ts)에서 이미 제외됨.
import type { Signal, SignalKind } from '@/lib/signals'

// ⚠️ 정적 클래스 문자열만(Tailwind JIT 감지). 동적 조합 금지.
const CLS: Record<SignalKind, string> = {
  overdue: 'bg-b27-expense-soft text-b27-expense border-transparent',
  soon: 'bg-b27-wait-soft text-b27-wait border-transparent',
  stalled: 'bg-b27-card text-b27-muted border-transparent',
  important: 'bg-b27-tint-3 text-b27-wait border-transparent',
}

export default function SignalChips({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) return null
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {signals.map((s) => (
        <span
          key={s.kind}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${CLS[s.kind]}`}
        >
          {s.kind === 'important' ? '★ ' : ''}
          {s.label} {s.count}
        </span>
      ))}
    </div>
  )
}
