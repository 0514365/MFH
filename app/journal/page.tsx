import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import type { JournalEntry } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function JournalList() {
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
    <main className="mx-auto max-w-md px-5 py-8">
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

      {entries.length === 0 ? (
        <p className="mt-16 text-center text-sm leading-relaxed text-faint">
          아직 일지가 없습니다.
          <br />첫 일지를 기록해 보세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id}>
              <Link
                href={`/journal/${e.id}`}
                className="block rounded-2xl border border-line bg-surface p-4 transition hover:border-primary"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted">{e.entry_date}</span>
                  {e.place_name && (
                    <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">
                      📍 {e.place_name}
                    </span>
                  )}
                  {e.category && (
                    <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">{e.category}</span>
                  )}
                  {e.prayer_candidate && (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary">
                      기도후보
                    </span>
                  )}
                </div>
                <div className="mt-1 font-bold text-ink">{e.headline || '(제목 없음)'}</div>
                {e.today && <div className="mt-1 line-clamp-2 text-sm text-muted">{e.today}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
