// MFH-HONDURAS-DATE-PAGE-V1
// 온두라스 동향 — 특정 날짜(news_date) 상세. 목록(/honduras/archive)에서 날짜 클릭 시 진입.
// 렌더 본문은 BriefingView 공유(최신 페이지와 동일 형식).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import BriefingView, { hasBriefingContent, NEWS_SELECT, type NewsRow } from '../BriefingView'

export const dynamic = 'force-dynamic'

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

export default async function HondurasDatePage(props: { params: Promise<{ date: string }> }) {
  const { date } = await props.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 날짜 형식이 맞을 때만 조회(임의 세그먼트 방어).
  let row: NewsRow | null = null
  if (isDate(date)) {
    const { data } = await supabase
      .from('honduras_news')
      .select(NEWS_SELECT)
      .eq('news_date', date)
      .maybeSingle()
    row = data as NewsRow | null
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <PageHeader title="온두라스 동향" />

      {/* 네비: 목록 / 최신 */}
      <div className="mb-4 flex items-center justify-between text-sm">
        <Link href="/honduras/archive" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          목록
        </Link>
        <Link href="/honduras" className="font-semibold text-muted transition hover:text-primary hover:underline">
          최신 동향 →
        </Link>
      </div>

      {hasBriefingContent(row) ? (
        <BriefingView row={row} />
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="text-base font-semibold text-primary">해당 날짜의 동향이 없습니다</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {isDate(date) ? `${date} 에 저장된 브리핑을 찾지 못했습니다.` : '날짜 형식이 올바르지 않습니다.'}
            <br />
            <Link href="/honduras/archive" className="text-primary underline">
              지난 동향 목록
            </Link>
            에서 다시 선택해 주세요.
          </p>
        </div>
      )}
    </main>
  )
}
