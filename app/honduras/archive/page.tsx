// MFH-HONDURAS-ARCHIVE-PAGE-V2
// 온두라스 동향 — 지난 동향 목록(저장된 모든 동향, 최신순). 같은 날 여러 개면 "날짜 (N)" 생성순 넘버링.
// 항목 클릭 → /honduras/[id] 상세.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import { SECTION_META, NEWS_SELECT, type NewsRow } from '../BriefingView'

export const dynamic = 'force-dynamic'

// 목록 미리보기 — 대표 헤드라인 한 줄(하이라이트 우선 → 정치 → 경제 → …).
function previewLine(row: NewsRow): string {
  const hi = (Array.isArray(row.highlights) ? row.highlights : []).find((h) => (h?.title ?? '').trim())
  if (hi) return (hi.title ?? '').trim()
  const s = row.sections ?? {}
  for (const m of SECTION_META) {
    const it = (s[m.key] ?? []).find((x) => (x?.title ?? '').trim())
    if (it) return (it.title ?? '').trim()
  }
  return ''
}

// 항목 총 건수(섹션 + 하이라이트).
function countItems(row: NewsRow): number {
  const s = row.sections ?? {}
  const sectionN = SECTION_META.reduce((acc, m) => acc + (s[m.key]?.length ?? 0), 0)
  const highlightN = Array.isArray(row.highlights) ? row.highlights.length : 0
  return sectionN + highlightN
}

export default async function HondurasArchivePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 저장된 모든 동향(멤버 RLS), 최신순(같은 날은 최근 생성이 위).
  const { data } = await supabase
    .from('honduras_news')
    .select(NEWS_SELECT)
    .order('news_date', { ascending: false })
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as NewsRow[]

  // 같은 날짜 내 생성순 넘버링(asc=1,2,3…) + 그날 총개수.
  const countMap = new Map<string, number>()
  const grouped = new Map<string, NewsRow[]>()
  for (const r of rows) {
    countMap.set(r.news_date, (countMap.get(r.news_date) ?? 0) + 1)
    if (!grouped.has(r.news_date)) grouped.set(r.news_date, [])
    grouped.get(r.news_date)!.push(r)
  }
  const seqMap = new Map<string, number>() // id → 생성순 번호
  for (const group of grouped.values()) {
    const asc = [...group].sort((a, b) => a.created_at.localeCompare(b.created_at))
    asc.forEach((r, i) => seqMap.set(r.id, i + 1))
  }
  const dateLabel = (r: NewsRow) =>
    (countMap.get(r.news_date) ?? 1) > 1 ? `${r.news_date} (${seqMap.get(r.id) ?? 1})` : r.news_date

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <PageHeader title="지난 동향" />

      {/* 최신으로 */}
      <div className="mb-4">
        <Link href="/honduras" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          최신 동향
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="text-base font-semibold text-primary">저장된 동향이 없습니다</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            매일 아침 6시에 자동으로 쌓입니다. 바로 만들려면{' '}
            <code className="rounded bg-paper px-1 py-0.5 font-mono text-xs">/news-update</code> 를 실행하세요.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-faint">총 {rows.length}건</p>
          <div className="space-y-2.5">
            {rows.map((r) => {
              const preview = previewLine(r)
              return (
                <Link
                  key={r.id}
                  href={`/honduras/${r.id}`}
                  className="block rounded-xl border border-line bg-surface p-4 transition hover:border-primary"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-lg font-bold text-primary">{dateLabel(r)}</span>
                    <span className="shrink-0 text-xs text-faint">{countItems(r)}건</span>
                  </div>
                  {preview && <p className="mt-1 line-clamp-1 text-sm text-muted">{preview}</p>}
                </Link>
              )
            })}
          </div>
        </>
      )}
    </main>
  )
}
