import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { JournalEntry } from '@/lib/types'
import { journalPhotosForEdit } from '@/lib/journalPhotos'
import { canEditEntry } from '@/lib/members'
import JournalForm, { type InitialPhoto } from '../../JournalForm'

export const dynamic = 'force-dynamic'

export default async function EditJournal(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
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
  // 본인 또는 마스터만 편집 — 그 외엔 상세로 돌려보냄(RLS 도 함께 강제).
  if (!canEditEntry(entry.user_id, user.id)) redirect(`/journal/${params.id}`)

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
