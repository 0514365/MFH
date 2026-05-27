import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import type { JournalEntry } from '@/lib/types'
import JournalList from './JournalList'

export const dynamic = 'force-dynamic'

export default async function JournalPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('journal_entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
  const entries = (data ?? []) as JournalEntry[]

  return (
    <main className="mx-auto max-w-md px-5 py-8 min-[740px]:max-w-5xl">
      <PageHeader
        title="Log"
        current="journal"
        action={
          <Link
            href="/journal/new"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            + Log
          </Link>
        }
      />

      <JournalList entries={entries} />
    </main>
  )
}
