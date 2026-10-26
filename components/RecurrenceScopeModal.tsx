'use client'

// MFH-RECURRENCE-SCOPE-MODAL-V3 — 2027 시트 문법: 그림자·테두리 없는 흰 시트(24px) · Manrope 제목 + 닫기 알약 · 전폭 알약 버튼 · tone="danger"(삭제) = 지출 빨강 글자 + 연한 빨강 면.
// MFH-RECURRENCE-SCOPE-MODAL-V2 — 2027 공용 부품(4-0): 남색 글자 · 연회색 면 · b27 선 · 굵기 600 이하 · 위험 = 지출 빨강.
// MFH-RECURRENCE-SCOPE-MODAL-V1
// 반복 항목 편집/삭제 시 범위 선택(이 항목만 / 이후 모두). 앱 내 3버튼 모달.
import type { RecurrenceScope } from '@/lib/recurrence'

type Props = {
  title: string
  message: string
  oneLabel: string
  followingLabel: string
  tone?: 'default' | 'danger'
  busy?: boolean
  onChoose: (scope: RecurrenceScope) => void
  onCancel: () => void
}

export default function RecurrenceScopeModal({
  title,
  message,
  oneLabel,
  followingLabel,
  tone = 'default',
  busy,
  onChoose,
  onCancel,
}: Props) {
  const danger = tone === 'danger'
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-3xl bg-b27-paper p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-num text-[16px] font-semibold text-b27-ink">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full bg-b27-card px-3 py-1 text-[12px] text-b27-ink transition active:opacity-70 disabled:opacity-50"
          >
            닫기
          </button>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-b27-muted">{message}</p>
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => onChoose('one')}
            disabled={busy}
            className={`h-11 w-full rounded-full bg-b27-card px-4 text-sm font-medium transition active:opacity-70 disabled:opacity-50 ${
              danger ? 'text-b27-expense' : 'text-b27-ink'
            }`}
          >
            {oneLabel}
          </button>
          <button
            type="button"
            onClick={() => onChoose('following')}
            disabled={busy}
            className={`h-11 w-full rounded-full px-4 text-sm transition active:opacity-70 disabled:opacity-50 ${
              danger ? 'bg-b27-expense-soft font-semibold text-b27-expense' : 'bg-b27-ink font-medium text-white'
            }`}
          >
            {followingLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
