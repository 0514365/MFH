// MFH-SELECTION-CHECKBOX-V1
// 다중선택 모드의 카드 좌측 체크박스. selectMode 일 때만 표시.
// 시각: 선택=bg-primary text-white / 미선택=border-line bg-surface.
// 카드 좌측 정렬을 위해 pt-0.5 권장(부모 컨테이너 측 책임).
type Props = {
  checked: boolean
}

export default function SelectionCheckbox({ checked }: Props) {
  return (
    <div
      aria-hidden
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
        checked
          ? 'border-primary bg-primary text-white'
          : 'border-line bg-surface text-transparent'
      }`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  )
}
