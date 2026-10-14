import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import SupporterForm from '../SupporterForm'
import { canManageFinance } from '@/lib/members'

export const dynamic = 'force-dynamic'

export default async function NewSupporterPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!canManageFinance(user.id)) redirect('/')
  return <SupporterForm mode="new" />
}
