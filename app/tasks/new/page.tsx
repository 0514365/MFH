import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import TaskForm from '../TaskForm'

export const dynamic = 'force-dynamic'

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: { project?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <TaskForm mode="new" presetProjectId={searchParams.project ?? null} />
}
