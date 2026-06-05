import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { JournalEntry } from '@/lib/types'
import { journalPhotosForEdit } from '@/lib/journalPhotos'
import JournalForm, { type InitialPhoto } from '../../JournalForm'

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

  // photos(우선) 또는 레거시 단일 → 각 사진 서명 URL. 편집은 원본 그대로(상속 없음).
  const resolved = journalPhotosForEdit(entry)
  const initialPhotos: InitialPhoto[] = []
  for (const p of resolved) {
    const { data: signed } = await supabase.storage
      .from('journal-photos')
      .createSignedUrl(p.path, 3600)
    if (signed?.signedUrl) initialPhotos.push({ ...p, url: signed.signedUrl })
  }

  return <JournalForm mode="edit" initial={entry} initialPhotos={initialPhotos} />
}
