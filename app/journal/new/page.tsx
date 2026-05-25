import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import JournalForm from '../JournalForm'

export const dynamic = 'force-dynamic'

export default async function NewJournalPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <JournalForm mode="new" />
}
