// MFH-DETAIL-NAV-V3
// 상세/편집 페이지 상단 이전/다음 내비게이션. ◀ (3/12) ▶ 형태.
// 서버·클라 어디서나 렌더(정적 Link). 양끝에서는 비활성(흐리게, 클릭 불가).
// suffix 로 편집 페이지 링크(/edit)까지 생성 — 같은 목록 순서로 편집을 순회.
import Link from 'next/link'

type Props = {
  basePath: string // 예: '/projects' 또는 '/journal' 또는 '/tasks'
  prevId: string | null
  nextId: string | null
  index: number // 1-based
  total: number
  query?: string // 목록 필터 유지용 쿼리스트링(없으면 '')
  suffix?: string // id 뒤에 붙일 경로(예: '/edit'). 없으면 상세로.
  variant?: 'box' | 'minimal' | 'pad' // minimal: 캐럿+n/total / pad: 큰 40px 버튼(터치 영역↑)
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

export default function DetailNav({ basePath, prevId, nextId, index, total, query, suffix = '', variant = 'box' }: Props) {
  // 목록에 현재 항목이 없거나(필터 불일치) 항목이 1개뿐이면 표시 의미 없음.
  if (total <= 1 || index === 0) return null

  // minimal: 상세 상단바용 — 테두리 없는 캐럿 + n/total.
  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-3 text-muted">
        {prevId ? (
          <Link href={withQuery(`${basePath}/${prevId}${suffix}`, query)} replace aria-label="이전" className="transition hover:text-ink">
            <Arrow dir="prev" />
          </Link>
        ) : (
          <span aria-disabled className="opacity-30">
            <Arrow dir="prev" />
          </span>
        )}
        <span className="font-display text-[10px] font-bold tracking-[0.15em] text-muted">
          {index} / {total}
        </span>
        {nextId ? (
          <Link href={withQuery(`${basePath}/${nextId}${suffix}`, query)} replace aria-label="다음" className="transition hover:text-ink">
            <Arrow dir="next" />
          </Link>
        ) : (
          <span aria-disabled className="opacity-30">
            <Arrow dir="next" />
          </span>
        )}
      </div>
    )
  }

  // pad: 1/7 위 + 큰 [‹][›] 아래(세로) — 프로젝트 상세 헤더용(터치 영역↑·가로 폭↓).
  if (variant === 'pad') {
    const pBtn =
      'inline-flex h-[34px] w-[38px] items-center justify-center rounded-[10px] border border-line text-muted transition hover:border-primary hover:text-ink'
    const pDis = 'inline-flex h-[34px] w-[38px] items-center justify-center rounded-[10px] border border-line text-faint opacity-40'
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="font-display text-[10.5px] font-bold tracking-wide text-muted">
          {index} / {total}
        </span>
        <div className="flex gap-1.5">
          {prevId ? (
            <Link href={withQuery(`${basePath}/${prevId}${suffix}`, query)} replace aria-label="이전" className={pBtn}>
              <Arrow dir="prev" />
            </Link>
          ) : (
            <span aria-disabled className={pDis}>
              <Arrow dir="prev" />
            </span>
          )}
          {nextId ? (
            <Link href={withQuery(`${basePath}/${nextId}${suffix}`, query)} replace aria-label="다음" className={pBtn}>
              <Arrow dir="next" />
            </Link>
          ) : (
            <span aria-disabled className={pDis}>
              <Arrow dir="next" />
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-2 flex items-center gap-2">
      {prevId ? (
        <Link
          href={withQuery(`${basePath}/${prevId}${suffix}`, query)}
          replace
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
          href={withQuery(`${basePath}/${nextId}${suffix}`, query)}
          replace
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
