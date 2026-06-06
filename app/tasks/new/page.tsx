import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import TaskForm from '../TaskForm'

export const dynamic = 'force-dynamic'

export default async function NewTaskPage(props: {
  searchParams: Promise<{ project?: string }>
}) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <TaskForm mode="new" presetProjectId={searchParams.project ?? null} />
}
