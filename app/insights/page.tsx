import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import InsightsClient, { type InsightRow } from './InsightsClient'

export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  const hasEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!hasEnv) redirect('/')

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('insights')
    .select('id,domain,period_start,period_end,content,model,rating,feedback_note,in_letter,created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  // 보관(스크랩)된 원본 id — 카드의 '보관됨' 표시용.
  const { data: scrapRows } = await supabase
    .from('insight_scraps')
    .select('source_id')
    .not('source_id', 'is', null)
  const scrappedIds = (scrapRows ?? [])
    .map((s) => (s as { source_id: string | null }).source_id)
    .filter((v): v is string => !!v)

  const year = new Date().getFullYear()
  const { data: themeRow } = await supabase
    .from('year_themes')
    .select('theme')
    .eq('year', year)
    .maybeSingle()
  const themeName = (themeRow as { theme?: string | null } | null)?.theme ?? null

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <PageHeader title="Insights" current="insights" />
      <div className="mb-4 flex gap-2">
        <Link
          href="/photos"
          className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-surface-subtle px-4 py-3 text-sm font-semibold text-primary transition hover:border-primary"
        >
          사진 모아보기
          <span className="ml-auto text-xs font-normal text-muted">→</span>
        </Link>
        <Link
          href="/insights/saved"
          className="flex items-center rounded-xl border border-line bg-surface-subtle px-4 py-3 text-sm font-semibold text-primary transition hover:border-primary"
        >
          보관함
        </Link>
      </div>
      <InsightsClient
        initial={(rows ?? []) as InsightRow[]}
        year={year}
        themeName={themeName}
        scrappedIds={scrappedIds}
      />
    </main>
  )
}
