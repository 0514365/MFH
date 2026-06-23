import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import SavedClient, { type ScrapRow } from './SavedClient'

export const dynamic = 'force-dynamic'

export default async function SavedInsightsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('insight_scraps')
    .select('id,source_id,domain,content,period_start,period_end,rating,feedback_note,scrapped_at')
    .order('scrapped_at', { ascending: false })

  return (
    <main className="mx-auto max-w-md px-5 pb-8 pt-2">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/insights"
          aria-label="뒤로"
          className="rounded-xl border border-line p-2 text-muted transition hover:border-primary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="font-display text-lg font-bold text-primary">보관함</h1>
      </div>
      <SavedClient initial={(data ?? []) as ScrapRow[]} />
    </main>
  )
}
