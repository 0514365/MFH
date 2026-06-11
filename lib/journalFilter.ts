// MFH-JOURNAL-FILTER-V2
// 일지 목록 필터/검색/정렬 순수함수. 목록(JournalList)과 상세(journal/[id]) 가 공유한다.
// URL 쿼리 <-> 필터 상태 직렬화 + 결정적(deterministic) 정렬을 한곳에 둔다.
// 일지는 status 가 없으므로 축 = 분류(category) · 기도후보(prayer) · 텍스트(q) · 날짜범위(df/dt) · 정렬(날짜).
// 날짜 범위는 entry_date(일지 작성일) 기준. 둘 다 inclusive. created_at(레코드 생성시각) 과 무관.
import { splitCsv, sanitizeDate, compareCreatedDesc, type ParamsLike } from '@/lib/filterUtils'

export type JournalSortKey = 'date'

export type JournalFilter = {
  q: string // 통합 텍스트 검색어
  fCategory: string[]
  fAuthor: string[] // 작성자(user_id) 필터
  prayerOnly: boolean // 기도후보만
  dateFrom: string // YYYY-MM-DD, '' = 미지정
  dateTo: string // YYYY-MM-DD, '' = 미지정
  asc: boolean // 날짜 오름차순 여부(기본 false=최신 먼저)
}

export const EMPTY_JOURNAL_FILTER: JournalFilter = {
  q: '',
  fCategory: [],
  fAuthor: [],
  prayerOnly: false,
  dateFrom: '',
  dateTo: '',
  asc: false,
}

export function parseJournalFilter(sp: ParamsLike): JournalFilter {
  const q = (sp.get('q') ?? '').trim()
  const fCategory = splitCsv(sp.get('cat'))
  const fAuthor = splitCsv(sp.get('author'))
  const prayerOnly = sp.get('pray') === '1'
  const dateFrom = sanitizeDate(sp.get('df'))
  const dateTo = sanitizeDate(sp.get('dt'))
  const asc = sp.get('dir') === 'asc'
  return { q, fCategory, fAuthor, prayerOnly, dateFrom, dateTo, asc }
}

// 필터를 쿼리스트링으로. 기본값이면 빈 문자열 → URL 깔끔하게 유지.
export function buildJournalQuery(f: JournalFilter): string {
  const params = new URLSearchParams()
  if (f.q) params.set('q', f.q)
  if (f.fCategory.length) params.set('cat', f.fCategory.join(','))
  if (f.fAuthor.length) params.set('author', f.fAuthor.join(','))
  if (f.prayerOnly) params.set('pray', '1')
  if (f.dateFrom) params.set('df', f.dateFrom)
  if (f.dateTo) params.set('dt', f.dateTo)
  if (f.asc) params.set('dir', 'asc')
  return params.toString()
}

export function isDefaultJournalFilter(f: JournalFilter): boolean {
  return (
    f.q === '' &&
    f.fCategory.length === 0 &&
    f.fAuthor.length === 0 &&
    !f.prayerOnly &&
    f.dateFrom === '' &&
    f.dateTo === '' &&
    !f.asc
  )
}

// applyJournalFilter 가 의존하는 최소 형태. 실제 JournalEntry 에 created_at 타입 선언이
// 있든 없든 안전하도록 옵셔널 created_at 을 가진 제네릭으로 받는다.
type FilterableEntry = {
  entry_date: string
  category: string | null
  user_id?: string | null
  prayer_candidate: boolean | null
  headline: string | null
  today: string | null
  thanks: string | null
  meditation: string | null
  prayer: string | null
  place_name: string | null
  created_at?: string | null
}

// 통합 텍스트 검색 대상(머리말·오늘·감사·묵상·기도·장소).
function haystack(e: FilterableEntry): string {
  return [e.headline, e.today, e.thanks, e.meditation, e.prayer, e.place_name]
    .filter((s): s is string => !!s)
    .join('\n')
    .toLowerCase()
}

export function applyJournalFilter<T extends FilterableEntry>(entries: T[], f: JournalFilter): T[] {
  const q = f.q.trim().toLowerCase()
  // 잘못 입력된 역순(from > to) 은 결과 0 으로 자연 처리(별도 swap 하지 않음).
  let list = entries.filter((e) => {
    if (f.fCategory.length && !(e.category && f.fCategory.includes(e.category))) return false
    if (f.fAuthor.length && !(e.user_id && f.fAuthor.includes(e.user_id))) return false
    if (f.prayerOnly && !e.prayer_candidate) return false
    if (f.dateFrom && e.entry_date < f.dateFrom) return false
    if (f.dateTo && e.entry_date > f.dateTo) return false
    if (q && !haystack(e).includes(q)) return false
    return true
  })

  const dir = f.asc ? 1 : -1
  list = [...list].sort((a, b) => {
    const av = a.entry_date ?? ''
    const bv = b.entry_date ?? ''
    if (av < bv) return -1 * dir
    if (av > bv) return 1 * dir
    return compareCreatedDesc(a, b) // 같은 날짜는 created_at 최신 먼저(서버 기본 정렬과 일치)
  })

  return list
}
