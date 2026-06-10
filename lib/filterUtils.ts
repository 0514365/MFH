// MFH-FILTER-UTILS-V1
// journal/project/task 필터 lib 공통 유틸 — CSV·상태·중요도 파싱, 날짜 검증, created_at tie-break.
// 도메인별 필터 축·정렬 본체는 각 *Filter.ts 에 그대로 두고, 기계적으로 반복되던 조각만 모은다.
import { type StatusValue } from '@/lib/constants'

// URLSearchParams 또는 Next 의 ReadonlyURLSearchParams / 평범한 객체 모두 지원하는 최소 인터페이스.
export type ParamsLike = { get(key: string): string | null }

// "a,b,c" -> ['a','b','c'] (빈값 제거)
export function splitCsv(v: string | null): string[] {
  if (!v) return []
  return v
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

const STATUS_SET: StatusValue[] = ['upcoming', 'in_progress', 'done']

// status CSV → 유효한 StatusValue 만 통과.
export function parseStatusCsv(v: string | null): StatusValue[] {
  return splitCsv(v).filter((s): s is StatusValue => (STATUS_SET as string[]).includes(s))
}

// importance CSV → 1~5 정수만 통과.
export function parseImportanceCsv(v: string | null): number[] {
  return splitCsv(v)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 5)
}

// YYYY-MM-DD 형태만 허용. 그 외는 빈 문자열로 무시.
export function sanitizeDate(v: string | null): string {
  if (!v) return ''
  const s = v.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
}

// created_at 내림차순(최신 먼저) tie-break — 정렬 동률 시 prev/next 흔들림 방지용.
export function compareCreatedDesc(
  a: { created_at?: string | null },
  b: { created_at?: string | null },
): number {
  const ac = a.created_at ?? ''
  const bc = b.created_at ?? ''
  if (ac === bc) return 0
  return ac < bc ? 1 : -1
}
