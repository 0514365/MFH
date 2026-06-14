import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import JournalForm from '../JournalForm'

export const dynamic = 'force-dynamic'

export default async function NewJournalPage(props: {
  searchParams: Promise<{ intercession?: string; category?: string; headline?: string }>
}) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const intercessionId =
    typeof searchParams.intercession === 'string' ? searchParams.intercession : undefined
  // QT '묵상일지 작성' 진입 — 분류·머릿말 자동 프리필.
  const initialCategory =
    typeof searchParams.category === 'string' ? searchParams.category : undefined
  const initialHeadline =
    typeof searchParams.headline === 'string' ? searchParams.headline : undefined
  return (
    <JournalForm
      mode="new"
      initialIntercessionId={intercessionId}
      initialCategory={initialCategory}
      initialHeadline={initialHeadline}
    />
  )
}
