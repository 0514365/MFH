// MFH-LIST-NAV-V1
// 정렬·필터된 목록에서 현재 항목의 이전/다음 id 와 위치(1-based index, total)를 계산.
// 프로젝트·일지 상세페이지의 ◀▶ 내비게이션 공용.

export type ListNav = {
  prevId: string | null
  nextId: string | null
  index: number // 1-based. 목록에 없으면 0.
  total: number
}

export function computeListNav(orderedIds: string[], currentId: string): ListNav {
  const total = orderedIds.length
  const i = orderedIds.indexOf(currentId)
  if (i < 0) {
    return { prevId: null, nextId: null, index: 0, total }
  }
  return {
    prevId: i > 0 ? orderedIds[i - 1] : null,
    nextId: i < total - 1 ? orderedIds[i + 1] : null,
    index: i + 1,
    total,
  }
}

// 상세 URL 에 붙일 쿼리스트링(목록 필터 유지). 빈 문자열이면 쿼리 없음.
// Next 의 searchParams(객체) 또는 URLSearchParams 모두에서 만들 수 있도록 도우미 제공.
export function searchParamsToQuery(
  sp: Record<string, string | string[] | undefined> | undefined,
): string {
  if (!sp) return ''
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue
    if (Array.isArray(v)) {
      // 배열이면 마지막 값만(필터는 csv 단일 문자열로 운용하므로 통상 문자열)
      if (v.length) params.set(k, v[v.length - 1])
    } else {
      params.set(k, v)
    }
  }
  return params.toString()
}
