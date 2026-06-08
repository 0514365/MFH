'use client'

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
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => onChoose('one')}
            disabled={busy}
            className="w-full rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-primary disabled:opacity-50"
          >
            {oneLabel}
          </button>
          <button
            type="button"
            onClick={() => onChoose('following')}
            disabled={busy}
            className="w-full rounded-xl border border-primary bg-primary-soft px-4 py-2.5 text-sm font-semibold text-primary transition hover:opacity-90 disabled:opacity-50"
          >
            {followingLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-full px-4 py-2 text-xs text-faint underline transition hover:text-muted disabled:opacity-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
