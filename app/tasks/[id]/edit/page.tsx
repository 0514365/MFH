import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Task } from '@/lib/types'
import TaskForm from '../../TaskForm'

export const dynamic = 'force-dynamic'

export default async function EditTask(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('tasks').select('*').eq('id', params.id).maybeSingle()
  const task = data as Task | null
  if (!task) notFound()
  // 본인 할 일만 편집 — 남의 것은 상세로.
  if (task.user_id !== user.id) redirect(`/tasks/${params.id}`)

  return <TaskForm mode="edit" initial={task} />
}
