import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import SupporterForm from '../SupporterForm'

export const dynamic = 'force-dynamic'

export default async function NewSupporterPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <SupporterForm mode="new" />
}
