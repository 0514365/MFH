// MFH-HONDURAS-PAGE-V2
// 온두라스 동향 — 최신 일일 브리핑 + "지난 동향 보기"(목록) 링크.
// 데이터 생성 = Claude Code /news-update (honduras_news 저장, 매일 06:00 자동 또는 수동). 이 페이지는 읽기 전용.
// 렌더 본문은 BriefingView 공유(지난 동향 상세 /honduras/[date] 와 동일 형식).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import BriefingView, { hasBriefingContent, NEWS_SELECT, type NewsRow } from './BriefingView'

export const dynamic = 'force-dynamic'

export default async function HondurasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 최신 1일치(멤버 RLS 통과). 없으면 null → 빈 상태.
  const { data } = await supabase
    .from('honduras_news')
    .select(NEWS_SELECT)
    .order('news_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  const row = data as NewsRow | null

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <PageHeader title="온두라스 동향" />

      {hasBriefingContent(row) ? (
        <>
          <BriefingView row={row} latest />
          {/* 지난 동향 보기 → 목록 */}
          <div className="mt-6">
            <Link
              href="/honduras/archive"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-primary transition hover:border-primary"
            >
              지난 동향 보기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </>
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
