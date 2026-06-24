import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Supporter } from '@/lib/types'
import { canEditEntry, isMaster } from '@/lib/members'
import SupporterForm from '../../SupporterForm'

export const dynamic = 'force-dynamic'

export default async function EditSupporter(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isMaster(user.id)) redirect('/')

  const { data } = await supabase.from('supporters').select('*').eq('id', params.id).maybeSingle()
  const supporter = data as Supporter | null
  if (!supporter) notFound()
  // 본인 또는 마스터만 편집 — 그 외엔 상세로.
  if (!canEditEntry(supporter.user_id, user.id)) redirect(`/supporters/${params.id}`)

  return <SupporterForm mode="edit" initial={supporter} />
}
