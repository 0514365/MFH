// MFH-STATUS-CHIP-V3 — 2027(4-2): status 칩 = 상태 틴트(예정 흰 · 진행 페리윙클 · 완료 민트) / 선택 = 남색 채움.
// MFH-STATUS-CHIP-V2 — 2027(4-1): chip = 흰 알약 · chipOn = 남색 채움(테두리·outline 없음). status 칩은 4-2/4-3 에서.
// MFH-STATUS-CHIP-V1
// 공통 필터 칩 헬퍼 — projects · tasks · calendar 에서 단일 import.
// (이전엔 ProjectsList/TasksListClient 가 statusChipCls·toggle·chip/chipOn 을 각자 중복 정의했음.)
import type { StatusValue } from '@/lib/constants'

// 일반 칩(중요도·분류·프로젝트·정렬 등) — 2027: 연회색 필터 면 위 흰 알약 / 선택 = 남색 채움.
export const chip =
  'inline-flex items-center gap-1.5 rounded-full border border-transparent bg-b27-paper px-3 py-1 text-xs text-b27-muted transition active:opacity-70'
export const chipOn = 'bg-b27-ink text-white'

// Status 칩 = 항상 배지색(카드 StatusBadge 와 동일). 선택 시 같은 색 + 진한 동색 테두리로 강조.
// ⚠️ 동적 클래스 조합 금지(JIT 미감지) → 상태3 × 선택2 = 정적 전체 문자열 분기 반환.
// ⚠️ outline-on-status-* 미등록 → 강조는 border-on-status-*(검증됨) + 코어 border-2.
export const statusChipBase = 'rounded-full px-3 py-1 text-xs transition'

export function statusChipCls(v: StatusValue, active: boolean): string {
  switch (v) {
    case 'in_progress':
      return active
        ? `${statusChipBase} bg-b27-ink font-medium text-white`
        : `${statusChipBase} bg-b27-tint-8 text-[#303C8D]`
    case 'done':
      return active
        ? `${statusChipBase} bg-b27-ink font-medium text-white`
        : `${statusChipBase} bg-b27-tint-4 text-[#226C5A]`
    case 'upcoming':
    default:
      return active
        ? `${statusChipBase} bg-b27-ink font-medium text-white`
        : `${statusChipBase} bg-b27-paper text-b27-muted`
  }
}

export function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}
