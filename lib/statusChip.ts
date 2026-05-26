// MFH-STATUS-CHIP-V1
// 공통 필터 칩 헬퍼 — projects · tasks · calendar 에서 단일 import.
// (이전엔 ProjectsList/TasksListClient 가 statusChipCls·toggle·chip/chipOn 을 각자 중복 정의했음.)
import type { StatusValue } from '@/lib/constants'

// 일반 칩(중요도·분류·프로젝트·정렬 등) — 마룬 톤.
export const chip =
  'rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted transition hover:border-primary'
export const chipOn = 'border-primary bg-primary-soft text-primary outline outline-1 outline-primary'

// Status 칩 = 항상 배지색(카드 StatusBadge 와 동일). 선택 시 같은 색 + 진한 동색 테두리로 강조.
// ⚠️ 동적 클래스 조합 금지(JIT 미감지) → 상태3 × 선택2 = 정적 전체 문자열 분기 반환.
// ⚠️ outline-on-status-* 미등록 → 강조는 border-on-status-*(검증됨) + 코어 border-2.
export const statusChipBase = 'rounded-full px-3 py-1 text-xs transition'

export function statusChipCls(v: StatusValue, active: boolean): string {
  switch (v) {
    case 'in_progress':
      return active
        ? `${statusChipBase} border-2 border-on-status-progress bg-status-progress font-semibold text-on-status-progress`
        : `${statusChipBase} border border-transparent bg-status-progress text-on-status-progress`
    case 'done':
      return active
        ? `${statusChipBase} border-2 border-on-status-done bg-status-done font-semibold text-on-status-done`
        : `${statusChipBase} border border-transparent bg-status-done text-on-status-done`
    case 'upcoming':
    default:
      return active
        ? `${statusChipBase} border-2 border-on-status-upcoming bg-status-upcoming font-semibold text-on-status-upcoming`
        : `${statusChipBase} border border-transparent bg-status-upcoming text-on-status-upcoming`
  }
}

export function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}
