// MFH-PROJECT-FILTER-V1
// 프로젝트 목록 필터/정렬 순수함수. 목록(ProjectsList)과 상세(projects/[id]) 가 공유한다.
// URL 쿼리 <-> 필터 상태 직렬화 + 결정적(deterministic) 정렬을 한곳에 둔다.
import { normalizeStatus, type StatusValue } from '@/lib/constants'

export type ProjectSortKey = 'due' | 'importance'

export type ProjectFilter = {
  fStatus: StatusValue[]
  fImportance: number[]
  fCategory: string[]
  sortKey: ProjectSortKey
  asc: boolean
}

export const EMPTY_PROJECT_FILTER: ProjectFilter = {
  fStatus: [],
  fImportance: [],
  fCategory: [],
  sortKey: 'due',
  asc: true,
}

const STATUS_SET: StatusValue[] = ['upcoming', 'in_progress', 'done']

// URLSearchParams 또는 Next 의 ReadonlyURLSearchParams / 평범한 객체 모두 지원하는 최소 인터페이스.
type ParamsLike = { get(key: string): string | null }

// "a,b,c" -> ['a','b','c'] (빈값 제거)
function splitCsv(v: string | null): string[] {
  if (!v) return []
  return v
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export function parseProjectFilter(sp: ParamsLike): ProjectFilter {
  const statusRaw = splitCsv(sp.get('status'))
  const fStatus = statusRaw.filter((s): s is StatusValue =>
    (STATUS_SET as string[]).includes(s),
  )

  const fImportance = splitCsv(sp.get('imp'))
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 5)

  const fCategory = splitCsv(sp.get('cat'))

  const sortRaw = sp.get('sort')
  const sortKey: ProjectSortKey = sortRaw === 'importance' ? 'importance' : 'due'

  const dirRaw = sp.get('dir')
  const asc = dirRaw === 'desc' ? false : true

  return { fStatus, fImportance, fCategory, sortKey, asc }
}

// 필터를 쿼리스트링으로. 기본값(빈 필터)이면 빈 문자열을 반환 -> URL 깔끔하게 유지.
export function buildProjectQuery(f: ProjectFilter): string {
  const params = new URLSearchParams()
  if (f.fStatus.length) params.set('status', f.fStatus.join(','))
  if (f.fImportance.length) params.set('imp', f.fImportance.join(','))
  if (f.fCategory.length) params.set('cat', f.fCategory.join(','))
  if (f.sortKey !== 'due') params.set('sort', f.sortKey)
  if (!f.asc) params.set('dir', 'desc')
  return params.toString()
}

export function isDefaultProjectFilter(f: ProjectFilter): boolean {
  return (
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
    if (f.fStatus.length && !f.fStatus.includes(normalizeStatus(p.status))) return false
    if (f.fImportance.length && !f.fImportance.includes(p.importance)) return false
    if (f.fCategory.length && !(p.category && f.fCategory.includes(p.category))) return false
    return true
  })

  const dir = f.asc ? 1 : -1
  const createdDesc = (a: T, b: T) => {
    const ac = a.created_at ?? ''
    const bc = b.created_at ?? ''
    if (ac === bc) return 0
    return ac < bc ? 1 : -1 // created_at 내림차순(최신 먼저)
  }

  list = [...list].sort((a, b) => {
    if (f.sortKey === 'due') {
      const av = a.due_date ?? ''
      const bv = b.due_date ?? ''
      if (!av && !bv) return createdDesc(a, b)
      if (!av) return 1
      if (!bv) return -1
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return createdDesc(a, b)
    }
    const diff = ((a.importance ?? 0) - (b.importance ?? 0)) * dir
    if (diff !== 0) return diff
    return createdDesc(a, b)
  })

  return list
}
