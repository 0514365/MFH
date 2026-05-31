import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import JournalForm from '../JournalForm'

export const dynamic = 'force-dynamic'

export default async function NewJournalPage({
  searchParams,
}: {
  searchParams: { intercession?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const intercessionId =
    typeof searchParams.intercession === 'string' ? searchParams.intercession : undefined
  return <JournalForm mode="new" initialIntercessionId={intercessionId} />
}
