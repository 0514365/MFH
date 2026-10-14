import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Task } from '@/lib/types'
import TaskForm from '../TaskForm'

export const dynamic = 'force-dynamic'

export default async function NewTaskPage(props: {
  searchParams: Promise<{ project?: string; from?: string }>
}) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ?from=<id> → 원본 할 일을 프리필(복제). DB 선기록 없이 새 폼에 채워 두고 사용자가 저장.
  //   제목에 (사본), 완료는 해제, 완료상태는 upcoming 으로 되돌려 둔다. 귀속(user_id)은 저장 시 현재 사용자.
  let initial: Task | null = null
  if (searchParams.from) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', searchParams.from)
      .maybeSingle()
    if (data) {
      const src = data as Task
      initial = {
        ...src,
        id: '',
        title: `${src.title} (사본)`,
        done: false,
        status: src.status === 'done' ? 'upcoming' : src.status,
        completed_at: null,
        // 복제본은 원본 반복 시리즈에 편입하지 않는다(독립 단건).
        recurrence_id: null,
        recurrence_freq: null,
      }
    }
  }

  return (
    <TaskForm mode="new" initial={initial} presetProjectId={searchParams.project ?? null} />
  )
}
