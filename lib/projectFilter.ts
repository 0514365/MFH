// MFH-PROJECT-FILTER-V1
// 프로젝트 목록 필터/정렬 순수함수. 목록(ProjectsList)과 상세(projects/[id]) 가 공유한다.
// URL 쿼리 <-> 필터 상태 직렬화 + 결정적(deterministic) 정렬을 한곳에 둔다.
import { normalizeStatus, type StatusValue } from '@/lib/constants'
import {
  splitCsv,
  parseStatusCsv,
  parseImportanceCsv,
  compareCreatedDesc,
  type ParamsLike,
} from '@/lib/filterUtils'

export type ProjectSortKey = 'due' | 'importance'

export type ProjectFilter = {
  hideDone: boolean
  fStatus: StatusValue[]
  fImportance: number[]
  fCategory: string[]
  sortKey: ProjectSortKey
  asc: boolean
}

export const EMPTY_PROJECT_FILTER: ProjectFilter = {
  hideDone: true,
  fStatus: [],
  fImportance: [],
  fCategory: [],
  sortKey: 'due',
  asc: true,
}

export function parseProjectFilter(sp: ParamsLike): ProjectFilter {
  // 완료숨김 기본 true → 쿼리에 done=0 이 있을 때만 완료 표시(hideDone=false). (Tasks 와 동일 규칙)
  const hideDone = sp.get('done') === '0' ? false : true

  const fStatus = parseStatusCsv(sp.get('status'))
  const fImportance = parseImportanceCsv(sp.get('imp'))
  const fCategory = splitCsv(sp.get('cat'))

  const sortRaw = sp.get('sort')
  const sortKey: ProjectSortKey = sortRaw === 'importance' ? 'importance' : 'due'

  const dirRaw = sp.get('dir')
  const asc = dirRaw === 'desc' ? false : true

  return { hideDone, fStatus, fImportance, fCategory, sortKey, asc }
}

// 필터를 쿼리스트링으로. 기본값(빈 필터)이면 빈 문자열을 반환 -> URL 깔끔하게 유지.
export function buildProjectQuery(f: ProjectFilter): string {
  const params = new URLSearchParams()
  if (!f.hideDone) params.set('done', '0')
  if (f.fStatus.length) params.set('status', f.fStatus.join(','))
  if (f.fImportance.length) params.set('imp', f.fImportance.join(','))
  if (f.fCategory.length) params.set('cat', f.fCategory.join(','))
  if (f.sortKey !== 'due') params.set('sort', f.sortKey)
  if (!f.asc) params.set('dir', 'desc')
  return params.toString()
}

export function isDefaultProjectFilter(f: ProjectFilter): boolean {
  return (
    f.hideDone === true &&
    f.fStatus.length === 0 &&
    f.fImportance.length === 0 &&
    f.fCategory.length === 0 &&
    f.sortKey === 'due' &&
    f.asc
  )
}

// applyProjectFilter 가 의존하는 최소 형태. 실제 Project 에 created_at 타입 선언이
// 있든 없든 안전하도록 옵셔널 created_at 을 가진 제네릭으로 받는다.
type FilterableProject = {
  status: string
  importance: number
  category: string | null
  due_date: string | null
  created_at?: string | null
}

// 결정적 정렬 + 필터. ProjectsList 의 기존 filtered 로직과 동일하되,
// due 동률/importance 동률일 때 created_at desc 로 tie-break 하여 prev/next 가 흔들리지 않게 한다.
export function applyProjectFilter<T extends FilterableProject>(projects: T[], f: ProjectFilter): T[] {
  let list = projects.filter((p) => {
    // 프로젝트엔 done 컬럼이 없음 → status==='done' 을 완료로 간주(Tasks 의 done 숨김과 동일 UX).
    if (f.hideDone && normalizeStatus(p.status) === 'done') return false
    if (f.fStatus.length && !f.fStatus.includes(normalizeStatus(p.status))) return false
    if (f.fImportance.length && !f.fImportance.includes(p.importance)) return false
    if (f.fCategory.length && !(p.category && f.fCategory.includes(p.category))) return false
    return true
  })

  const dir = f.asc ? 1 : -1
  list = [...list].sort((a, b) => {
    if (f.sortKey === 'due') {
      const av = a.due_date ?? ''
      const bv = b.due_date ?? ''
      if (!av && !bv) return compareCreatedDesc(a, b)
      if (!av) return 1
      if (!bv) return -1
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return compareCreatedDesc(a, b)
    }
    const diff = ((a.importance ?? 0) - (b.importance ?? 0)) * dir
    if (diff !== 0) return diff
    return compareCreatedDesc(a, b)
  })

  return list
}
