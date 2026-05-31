import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { JournalEntry } from '@/lib/types'
import JournalForm from '../../JournalForm'

export const dynamic = 'force-dynamic'

export default async function EditJournal({ params }: { params: { id: string } }) {
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
  // 본인 글만 편집 — 남의 일지는 상세로 돌려보냄(RLS 도 막지만 UI 가드).
  if (entry.user_id !== user.id) redirect(`/journal/${params.id}`)

  let photoUrl: string | null = null
  if (entry.photo_path) {
    const { data: signed } = await supabase.storage
      .from('journal-photos')
      .createSignedUrl(entry.photo_path, 3600)
    photoUrl = signed?.signedUrl ?? null
  }

  return <JournalForm mode="edit" initial={entry} initialPhotoUrl={photoUrl} />
}
