// MFH-TASK-FILTER-V4
// 할 일 목록 필터/정렬 순수함수. 목록(TasksListClient)과 상세(tasks/[id]) 가 공유한다.
// URL 쿼리 <-> 필터 상태 직렬화 + 결정적 정렬 + (기본정렬일 때) 기한그룹 평탄화를 한곳에 둔다.
import { normalizeStatus, type StatusValue } from '@/lib/constants'
import { taskGroupOf, TASK_GROUP_ORDER, type TaskGroupKey } from '@/lib/taskGroups'
import {
  splitCsv,
  parseStatusCsv,
  parseImportanceCsv,
  compareCreatedDesc,
  type ParamsLike,
} from '@/lib/filterUtils'

export type TaskSortKey = 'due' | 'importance'

export type TaskFilter = {
  hideDone: boolean
  fStatus: StatusValue[]
  fImportance: number[]
  fCategory: string[]
  fProject: string[]
  q: string
  sortKey: TaskSortKey
  asc: boolean
}

export const EMPTY_TASK_FILTER: TaskFilter = {
  hideDone: true,
  fStatus: [],
  fImportance: [],
  fCategory: [],
  fProject: [],
  q: '',
  sortKey: 'due',
  asc: true,
}

// URL 쿼리 -> 필터. 쿼리키: done(=0 이면 완료표시), status, imp, cat, proj, sort, dir.
// 완료숨김 기본 true → 쿼리에 done=0 이 있을 때만 완료 표시(hideDone=false).
export function parseTaskFilter(sp: ParamsLike): TaskFilter {
  const doneRaw = sp.get('done')
  const hideDone = doneRaw === '0' ? false : true

  const fStatus = parseStatusCsv(sp.get('status'))
  const fImportance = parseImportanceCsv(sp.get('imp'))
  const fCategory = splitCsv(sp.get('cat'))
  const fProject = splitCsv(sp.get('proj'))

  const q = (sp.get('q') ?? '').trim()

  const sortRaw = sp.get('sort')
  const sortKey: TaskSortKey = sortRaw === 'importance' ? 'importance' : 'due'

  const dirRaw = sp.get('dir')
  const asc = dirRaw === 'desc' ? false : true

  return { hideDone, fStatus, fImportance, fCategory, fProject, q, sortKey, asc }
}

// 필터를 쿼리스트링으로. 기본값이면 빈 문자열.
export function buildTaskQuery(f: TaskFilter): string {
  const params = new URLSearchParams()
  if (!f.hideDone) params.set('done', '0')
  if (f.fStatus.length) params.set('status', f.fStatus.join(','))
  if (f.fImportance.length) params.set('imp', f.fImportance.join(','))
  if (f.fCategory.length) params.set('cat', f.fCategory.join(','))
  if (f.fProject.length) params.set('proj', f.fProject.join(','))
  if (f.q.trim()) params.set('q', f.q.trim())
  if (f.sortKey !== 'due') params.set('sort', f.sortKey)
  if (!f.asc) params.set('dir', 'desc')
  return params.toString()
}

export function isDefaultTaskFilter(f: TaskFilter): boolean {
  return (
    f.hideDone === true &&
    f.fStatus.length === 0 &&
    f.fImportance.length === 0 &&
    f.fCategory.length === 0 &&
    f.fProject.length === 0 &&
    f.q.trim() === '' &&
    f.sortKey === 'due' &&
    f.asc
  )
}

// applyTaskFilter / orderTaskIds 가 의존하는 최소 형태. created_at 옵셔널 제네릭.
type FilterableTask = {
  id: string
  done: boolean
  status: string | null
  importance: number
  category: string | null
  project_id: string | null
  due_date: string | null
  due_time: string | null
  created_at?: string | null
  // 키워드 검색 대상(옵셔널 — nav 등 최소조회에서 없으면 검색 미적용).
  title?: string | null
  description?: string | null
  place_name?: string | null
}

// 결정적 정렬 + 필터. TasksListClient 의 기존 filtered 로직과 동일하되,
// due/importance 동률 시 created_at desc tie-break 로 prev/next 흔들림 방지.
export function applyTaskFilter<T extends FilterableTask>(tasks: T[], f: TaskFilter): T[] {
  // 키워드: 제목·설명·장소 부분일치(대소문자 무시). 공백으로 나눠 모두 포함(AND).
  const terms = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  let list = tasks.filter((t) => {
    if (f.hideDone && t.done) return false
    if (f.fStatus.length && !f.fStatus.includes(normalizeStatus(t.status))) return false
    if (f.fImportance.length && !f.fImportance.includes(t.importance)) return false
    if (f.fCategory.length && !(t.category && f.fCategory.includes(t.category))) return false
    if (f.fProject.length && !(t.project_id && f.fProject.includes(t.project_id))) return false
    if (terms.length) {
      const hay = `${t.title ?? ''} ${t.description ?? ''} ${t.place_name ?? ''}`.toLowerCase()
      if (!terms.every((term) => hay.includes(term))) return false
    }
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
      if (av !== bv) return av < bv ? -1 * dir : 1 * dir
      // 같은 날짜면 시간 보조정렬(시간 없는 건 뒤로)
      const at = a.due_time ?? ''
      const bt = b.due_time ?? ''
      if (!at && !bt) return compareCreatedDesc(a, b)
      if (!at) return 1
      if (!bt) return -1
      if (at !== bt) return at < bt ? -1 * dir : 1 * dir
      return compareCreatedDesc(a, b)
    }
    const diff = ((a.importance ?? 0) - (b.importance ?? 0)) * dir
    if (diff !== 0) return diff
    return compareCreatedDesc(a, b)
  })

  return list
}

// 화면에 "보이는 순서"대로의 id 배열 → 상세 ◀▶ 가 목록과 정확히 일치.
// 목록은 기본정렬(due·오름차순)일 때만 기한그룹 헤더로 묶어 TASK_GROUP_ORDER 순으로 표시하므로,
// 같은 조건이면 그룹 평탄화 순서를, 아니면 applyTaskFilter 순서를 그대로 반환한다.
export function orderTaskIds<T extends FilterableTask>(tasks: T[], f: TaskFilter): string[] {
  const filtered = applyTaskFilter(tasks, f)
  const grouped = f.sortKey === 'due' && f.asc
  if (!grouped) return filtered.map((t) => t.id)

  const buckets: Record<TaskGroupKey, T[]> = {
    overdue: [],
    this_week: [],
    next_week: [],
    this_month: [],
    later: [],
    unset: [],
    done: [],
  }
  for (const t of filtered) buckets[taskGroupOf(t.due_date, t.done)].push(t)
  const ordered: string[] = []
  for (const k of TASK_GROUP_ORDER) {
    for (const t of buckets[k]) ordered.push(t.id)
  }
  return ordered
}

// ───────── 세션 영속(탭 단위) ─────────
// 편집 왕복 등으로 URL 쿼리가 사라져도 필터를 유지. 직렬화는 buildTaskQuery/parseTaskFilter 재사용.
// sessionStorage = 탭 종료 시 자동 소멸 → "로그아웃 전까지 유지" 를 가볍게 충족.
const TASK_FILTER_STORAGE_KEY = 'mfh.taskFilter'

export function saveTaskFilter(f: TaskFilter): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(TASK_FILTER_STORAGE_KEY, buildTaskQuery(f))
  } catch {
    /* sessionStorage 불가(시크릿 등) 무시 */
  }
}

export function readTaskFilter(): TaskFilter | null {
  if (typeof window === 'undefined') return null
  try {
    const s = window.sessionStorage.getItem(TASK_FILTER_STORAGE_KEY)
    if (s === null) return null
    return parseTaskFilter(new URLSearchParams(s))
  } catch {
    return null
  }
}

export function clearTaskFilter(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(TASK_FILTER_STORAGE_KEY)
  } catch {
    /* 무시 */
  }
}
