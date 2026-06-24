// MFH-HONDURAS-PAGE-V3
// 온두라스 동향 — 최신 일일 브리핑(가장 최근 생성분). 날짜 행 우측에 "지난 동향" 링크.
// 데이터 생성 = Claude Code /news-update (honduras_news 저장, 매일 06:00 자동 또는 수동). 이 페이지는 읽기 전용.
// 같은 날 여러 동향이면 날짜 뒤 (N) 넘버링. 렌더 본문은 BriefingView 공유(상세 /honduras/[id] 와 동일).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import BriefingView, { hasBriefingContent, NEWS_SELECT, type NewsRow } from './BriefingView'
import { seqSuffix } from '@/lib/honduras'
import '../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

export default async function HondurasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 최신 = 가장 최근 날짜의 가장 최근 생성분.
  const { data } = await supabase
    .from('honduras_news')
    .select(NEWS_SELECT)
    .order('news_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const row = data as NewsRow | null

  const dateSuffix = row ? await seqSuffix(supabase, row.news_date, row.id) : ''

  // 날짜 행 우측 끝 — 지난 동향(목록)으로.
  const archiveLink = (
    <Link
      href="/honduras/archive"
      className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:underline"
    >
      지난 동향
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="M12 5l7 7-7 7" />
      </svg>
    </Link>
  )

  return (
    <main className="app-theme mx-auto max-w-2xl px-5 pb-8">
      <PageHeader title="온두라스 동향" />

      {hasBriefingContent(row) ? (
        <BriefingView row={row} latest dateSuffix={dateSuffix} headerAction={archiveLink} />
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="text-base font-semibold text-primary">아직 오늘 브리핑이 없습니다</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            매일 아침 6시에 자동으로 온두라스 뉴스를 정리합니다.
            <br />
            바로 보려면 Cowork(아이폰 원격) 또는 터미널에서{' '}
            <code className="rounded bg-paper px-1 py-0.5 font-mono text-xs">/news-update</code> 를 실행하세요.
          </p>
        </div>
      )}
    </main>
  )
}
