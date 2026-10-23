// MFH-ACCOUNTING-SEARCH-PAGE-V1
// 회계 검색(달력 헤더 🔍) — 위플형 검색 화면. 모바일은 전체 화면(SearchView), md 이상은 일반 페이지. 셸은 ../layout.tsx 담당.
// ?q·p(all|week|month|custom)·from·to·g(구분) = 검색 상태(행 탭 → 수정 후 뒤로 오면 그대로).
import { getAcctOptions, getRecentInout, getAccountBalances, getFxInfo } from '@/lib/accounting-db'
import SearchView from './SearchView'

export const dynamic = 'force-dynamic'

export default async function AccountingSearchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = (await searchParams) ?? {}
  const one = (k: string) => {
    const v = sp[k]
    return typeof v === 'string' && v ? v : undefined
  }
  const [options, recent, balances, fx] = await Promise.all([
    getAcctOptions(),
    getRecentInout().then((r) => r ?? []),
    getAccountBalances().then((b) => b ?? []),
    getFxInfo(),
  ])

  if (!options) {
    return (
      <p className="rounded-2xl bg-b27-card px-4 py-6 text-center text-sm text-b27-muted">
        회계 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.
      </p>
    )
  }

  return (
    <SearchView
      recent={recent}
      options={options}
      balances={balances}
      fx={fx}
      initial={{ q: one('q'), p: one('p'), from: one('from'), to: one('to'), g: one('g') }}
    />
  )
}
