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
    .select('id,domain,period_start,period_end,content,model,rating,feedback_note,created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <PageHeader title="Insights" current="insights" />
      <InsightsClient initial={(rows ?? []) as InsightRow[]} hasApiKey={hasApiKey} />
    </main>
  )
}
