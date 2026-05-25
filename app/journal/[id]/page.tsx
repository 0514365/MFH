import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { JournalEntry } from '@/lib/types'
import DeleteButton from './DeleteButton'

export const dynamic = 'force-dynamic'

function Section({ label, text }: { label: string; text: string | null }) {
  if (!text) return null
  return (
    <section className="mb-5">
      <h2 className="mb-1 text-sm font-bold text-brand-primary">{label}</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{text}</p>
    </section>
  )
}

export default async function JournalDetail({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  const entry = data as JournalEntry | null
  if (!entry) notFound()

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Link href="/journal" className="text-xs text-muted underline">
        ← 일지
      </Link>
      <div className="mb-4 mt-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-brand-accent">{entry.entry_date}</span>
        {entry.category && (
          <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink/60">{entry.category}</span>
        )}
        {entry.prayer_candidate && (
          <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] text-brand-primary">기도후보</span>
        )}
      </div>
      {entry.headline && <h1 className="mb-6 text-xl font-extrabold text-ink">{entry.headline}</h1>}

      <Section label="🌿 오늘 있었던 일" text={entry.today} />
      <Section label="🙏 감사·응답" text={entry.thanks} />
      <Section label="💭 묵상·깨달음" text={entry.meditation} />
      <Section label="📌 기도제목" text={entry.prayer} />

      <div className="mt-10">
        <DeleteButton id={entry.id} />
      </div>
    </main>
  )
}
