// MFH-SELECTION-BAR-V1
// 다중선택 모드의 하단 sticky bar. 일지·프로젝트·할일 공용.
// - 좁은 화면: 화면 하단 고정(BottomNav 위, bottom-16 = 64px).
// - 넓은 화면: 동일 위치(BottomNav 가 좁은 화면 전용이라 넓은화면도 같은 위치 OK).
// - 액션 chip 들은 children 으로 주입 (모듈별 분류/Status/중요도/완료/삭제 등).
// - 좌측: "N개 선택" 표시. 우측: 액션 chip row + 취소 버튼.
// - 카드 영역 끝 padding 보정(예: pb-32)은 부모 페이지 책임.
import type { ReactNode } from 'react'

type Props = {
  count: number
  onCancel: () => void
  onSelectAll?: () => void
  allSelected?: boolean
  children: ReactNode
}

export default function SelectionBar({
  count,
  onCancel,
  onSelectAll,
  allSelected,
  children,
}: Props) {
  return (
    <div
      className="fixed inset-x-0 bottom-16 z-30 border-t border-line shadow-lg min-[740px]:bottom-0"
      style={{ background: 'var(--paper)' }}
      role="region"
      aria-label="다중선택 도구모음"
    >
      <div className="mx-auto flex max-w-md flex-wrap items-center gap-2 px-5 py-3 min-[740px]:max-w-5xl">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-primary">{count}개 선택</span>
          {onSelectAll && (
            <button
              type="button"
              onClick={onSelectAll}
              className="rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-muted transition hover:border-primary"
            >
              {allSelected ? '전체 해제' : '전체 선택'}
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
          {children}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-primary"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
