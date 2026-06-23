// MFH-HONDURAS-DETAIL-PAGE-V1
// 온두라스 동향 — 고유 id 로 보는 상세(목록에서 항목 클릭 시 진입). 같은 날 여러 동향도 각각 구분.
// 렌더 본문은 BriefingView 공유(최신 페이지와 동일 형식). 같은 날 순번이면 날짜 뒤 (N) 표시.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import BriefingView, { hasBriefingContent, NEWS_SELECT, type NewsRow } from '../BriefingView'
import { seqSuffix } from '@/lib/honduras'
import '../../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

export default async function HondurasDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('honduras_news')
    .select(NEWS_SELECT)
    .eq('id', id)
    .maybeSingle()
  const row = data as NewsRow | null

  const dateSuffix = row ? await seqSuffix(supabase, row.news_date, row.id) : ''

  return (
    <main className="app-theme mx-auto max-w-2xl px-5 py-8">
      <PageHeader title="온두라스 동향" />

      {/* 네비: 목록 / 최신 */}
      <div className="mb-4 flex items-center justify-between text-sm">
        <Link href="/honduras/archive" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          목록
        </Link>
        <Link href="/honduras" className="font-semibold text-muted transition hover:text-accent hover:underline">
          최신 동향 →
        </Link>
      </div>

      {hasBriefingContent(row) ? (
        <BriefingView row={row} dateSuffix={dateSuffix} />
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="text-base font-semibold text-primary">동향을 찾을 수 없습니다</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            삭제되었거나 잘못된 주소입니다.
            <br />
            <Link href="/honduras/archive" className="text-accent underline">
              지난 동향 목록
            </Link>
            에서 다시 선택해 주세요.
          </p>
        </div>
      )}
    </main>
  )
}
