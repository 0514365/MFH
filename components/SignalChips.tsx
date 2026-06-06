// MFH-SIGNAL-CHIPS-V1 — 규칙 신호 칩 렌더(Phase 4b). 표시 전용(서버 컴포넌트).
// 차분한 파스텔 톤. 0인 칩은 호출부(signals.ts)에서 이미 제외됨.
import type { Signal, SignalKind } from '@/lib/signals'

// ⚠️ 정적 클래스 문자열만(Tailwind JIT 감지). 동적 조합 금지.
const CLS: Record<SignalKind, string> = {
  overdue: 'bg-red-50 text-red-700 border-red-200',
  soon: 'bg-orange-50 text-orange-700 border-orange-200',
  stalled: 'bg-slate-100 text-slate-600 border-slate-200',
  important: 'bg-yellow-50 text-yellow-700 border-yellow-200',
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
