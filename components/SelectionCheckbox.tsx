// MFH-SELECTION-CHECKBOX-V2 — 2027 공용 부품(4-0): 남색 글자 · 연회색 면 · b27 선 · 굵기 600 이하 · 위험 = 지출 빨강.
// MFH-SELECTION-CHECKBOX-V1
// 다중선택 모드의 카드 좌측 체크박스. selectMode 일 때만 표시.
// 시각: 선택=bg-b27-ink text-white / 미선택=border-b27-line bg-b27-paper.
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
          ? 'border-b27-ink bg-b27-ink text-white'
          : 'border-b27-line bg-b27-paper text-transparent'
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
