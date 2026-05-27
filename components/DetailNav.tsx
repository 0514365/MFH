// MFH-DETAIL-NAV-V1
// 상세페이지 상단 이전/다음 내비게이션. ◀ (3/12) ▶ 형태.
// 서버 컴포넌트에서 직접 렌더(정적 Link). 양끝에서는 비활성(흐리게, 클릭 불가).
import Link from 'next/link'

type Props = {
  basePath: string // 예: '/projects' 또는 '/journal'
  prevId: string | null
  nextId: string | null
  index: number // 1-based
  total: number
  query?: string // 목록 필터 유지용 쿼리스트링(없으면 '')
}

function withQuery(href: string, query?: string) {
  return query ? `${href}?${query}` : href
}

const btnBase =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border text-muted transition'
const btnActive = 'border-line hover:border-primary'
const btnDisabled = 'border-line opacity-40'

function Arrow({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'prev' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  )
}

export default function DetailNav({ basePath, prevId, nextId, index, total, query }: Props) {
  // 목록에 현재 항목이 없거나(필터 불일치) 항목이 1개뿐이면 표시 의미 없음.
  if (total <= 1 || index === 0) return null

  return (
    <div className="mb-2 flex items-center gap-2">
      {prevId ? (
        <Link
          href={withQuery(`${basePath}/${prevId}`, query)}
          aria-label="이전"
          className={`${btnBase} ${btnActive}`}
        >
          <Arrow dir="prev" />
        </Link>
      ) : (
        <span aria-disabled className={`${btnBase} ${btnDisabled}`}>
          <Arrow dir="prev" />
        </span>
      )}

      <span className="min-w-[3rem] text-center text-xs font-semibold text-faint">
        {index} / {total}
      </span>

      {nextId ? (
        <Link
          href={withQuery(`${basePath}/${nextId}`, query)}
          aria-label="다음"
          className={`${btnBase} ${btnActive}`}
        >
          <Arrow dir="next" />
        </Link>
      ) : (
        <span aria-disabled className={`${btnBase} ${btnDisabled}`}>
          <Arrow dir="next" />
        </span>
      )}
    </div>
  )
}
