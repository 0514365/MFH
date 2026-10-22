'use client'

// MFH-RECURRENCE-SCOPE-MODAL-V2 — 2027 공용 부품(4-0): 남색 글자 · 연회색 면 · b27 선 · 굵기 600 이하 · 위험 = 지출 빨강.
// MFH-RECURRENCE-SCOPE-MODAL-V1
// 반복 항목 편집/삭제 시 범위 선택(이 항목만 / 이후 모두). 앱 내 3버튼 모달.
import type { RecurrenceScope } from '@/lib/recurrence'

type Props = {
  title: string
  message: string
  oneLabel: string
  followingLabel: string
  busy?: boolean
  onChoose: (scope: RecurrenceScope) => void
  onCancel: () => void
}

export default function RecurrenceScopeModal({
  title,
  message,
  oneLabel,
  followingLabel,
  busy,
  onChoose,
  onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-b27-line bg-b27-paper p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-b27-ink">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-b27-muted">{message}</p>
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => onChoose('one')}
            disabled={busy}
            className="w-full rounded-xl border border-b27-line px-4 py-2.5 text-sm font-semibold text-b27-ink transition hover:border-b27-muted disabled:opacity-50"
          >
            {oneLabel}
          </button>
          <button
            type="button"
            onClick={() => onChoose('following')}
            disabled={busy}
            className="w-full rounded-xl border border-b27-ink bg-b27-card px-4 py-2.5 text-sm font-semibold text-b27-ink transition hover:opacity-90 disabled:opacity-50"
          >
            {followingLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-full px-4 py-2 text-xs text-b27-muted underline transition hover:text-b27-ink disabled:opacity-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
