import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { JournalEntry } from '@/lib/types'
import BackButton from '@/components/BackButton'
import DeleteButton from './DeleteButton'

export const dynamic = 'force-dynamic'

function Section({ label, text }: { label: string; text: string | null }) {
  if (!text) return null
  return (
    <section className="mb-5">
      <h2 className="mb-1 text-sm font-bold text-primary">{label}</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{text}</p>
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

  let photoUrl: string | null = null
  if (entry.photo_path) {
    const { data: signed } = await supabase.storage
      .from('journal-photos')
      .createSignedUrl(entry.photo_path, 3600)
    photoUrl = signed?.signedUrl ?? null
  }

  const taken = entry.photo_taken_at ? entry.photo_taken_at.slice(0, 10) : null
  const lat = entry.photo_lat
  const lng = entry.photo_lng

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <BackButton href="/journal" label="Log" />
      <div className="mb-4 mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted">{entry.entry_date}</span>
        {entry.place_name && (
          <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">
            📍 {entry.place_name}
          </span>
        )}
        {entry.category && (
          <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">{entry.category}</span>
        )}
        {entry.prayer_candidate && (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary">기도후보</span>
        )}
      </div>
      {entry.headline && <h1 className="mb-6 text-xl font-extrabold text-ink">{entry.headline}</h1>}

      {photoUrl && (
        <figure className="mb-6">
          <img src={photoUrl} alt="" className="w-full rounded-2xl border border-line" />
          <figcaption className="mt-2 text-xs text-faint">
            {taken && <span>촬영일 {taken}</span>}
            {taken && lat != null && lng != null && <span> · </span>}
            {lat != null && lng != null && (
              <a
                className="underline"
                target="_blank"
                rel="noreferrer"
                href={`https://maps.google.com/?q=${lat},${lng}`}
              >
                지도에서 열기
              </a>
            )}
          </figcaption>
        </figure>
      )}

      <Section label="🌿 오늘 있었던 일" text={entry.today} />
      <Section label="🙏 감사·응답" text={entry.thanks} />
      <Section label="💭 묵상·깨달음" text={entry.meditation} />
      <Section label="📌 기도제목" text={entry.prayer} />

      <div className="mt-10 flex items-center gap-4">
        <Link href={`/journal/${entry.id}/edit`} className="text-xs font-semibold text-accent underline">
          수정
        </Link>
        <DeleteButton id={entry.id} photoPath={entry.photo_path} />
      </div>
    </main>
  )
}
