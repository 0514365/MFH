import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import { scrapKey } from '@/lib/insightExport'
import InsightsClient, { type InsightRow } from './InsightsClient'
import '../p/portfolio-theme.css'

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
    .order('created_at', { ascending: false })
    .limit(50)

  // 보관(스크랩)된 인사이트 — 카드의 '보관됨' 표시용. 도메인+내용 키로 매칭(재생성 대비).
  const { data: scrapRows } = await supabase
    .from('insight_scraps')
    .select('domain, content')
  const scrappedKeys = (scrapRows ?? []).map((s) =>
    scrapKey((s as { domain: string }).domain, (s as { content: string | null }).content),
  )

  const year = new Date().getFullYear()
  const { data: themeRow } = await supabase
    .from('year_themes')
    .select('theme')
    .eq('year', year)
    .maybeSingle()
  const themeName = (themeRow as { theme?: string | null } | null)?.theme ?? null

  return (
    <main className="app-theme mx-auto max-w-md px-5 py-8 min-[740px]:max-w-5xl">
      <PageHeader title="Insights" current="insights" />
      <InsightsClient
        initial={(rows ?? []) as InsightRow[]}
        year={year}
        themeName={themeName}
        scrappedKeys={scrappedKeys}
      />
    </main>
  )
}
