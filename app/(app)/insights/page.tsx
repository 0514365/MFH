// MFH-INSIGHTS-2027 (page.tsx) — 4-6: 2027 토큰.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import { scrapKey } from '@/lib/insightExport'
import InsightsClient, { type InsightRow } from './InsightsClient'

export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  const hasEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!hasEnv) redirect('/')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('insights')
    .select('id,domain,period_start,period_end,content,model,rating,feedback_note,in_letter,created_at')
    .neq('domain', 'supporter_care') // 후원자 인사이트는 공개 전까지 인사이트 홈에서 제외(후원자 페이지 전용)
    .order('created_at', { ascending: false })
    .limit(50)

  // 보관(스크랩)된 인사이트 — 카드의 '보관됨' 표시용. 도메인+내용 키로 매칭(재생성 대비).
  const { data: scrapRows } = await supabase
    .from('insight_scraps')
    .select('domain, content')
  const scrappedKeys = (scrapRows ?? []).map((s) =>
    scrapKey((s as { domain: string }).domain, (s as { content: string | null }).content),
  )

  return (
    <main className="theme-2027 mx-auto max-w-md px-5 pb-8 @xl:max-w-5xl">
      <PageHeader title="Insights" current="insights" />
      <InsightsClient
        initial={(rows ?? []) as InsightRow[]}
        scrappedKeys={scrappedKeys}
      />
    </main>
  )
}
