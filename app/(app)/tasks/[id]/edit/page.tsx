import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Task } from '@/lib/types'
import { parseTaskFilter, orderTaskIds } from '@/lib/taskFilter'
import { computeListNav, searchParamsToQuery } from '@/lib/listNav'
import { canEditEntry } from '@/lib/members'
import TaskForm from '../../TaskForm'

export const dynamic = 'force-dynamic'

export default async function EditTask(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('tasks').select('*').eq('id', params.id).maybeSingle()
  const task = data as Task | null
  if (!task) notFound()
  // 본인 또는 마스터만 편집 — 그 외엔 상세로.
  if (!canEditEntry(task.user_id, user.id)) redirect(`/tasks/${params.id}`)

  // 목록과 동일한 필터+정렬+그룹평탄화로 전체를 재계산 → 현재 항목의 이전/다음(편집 순회).
  const filter = parseTaskFilter({
    get: (k) => {
      const v = searchParams[k]
      return Array.isArray(v) ? (v[v.length - 1] ?? null) : (v ?? null)
    },
  })
  const { data: navRows } = await supabase
    .from('tasks')
    .select(
      'id, done, status, importance, category, project_id, due_date, due_time, created_at, title, description, place_name',
    )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderedIds = orderTaskIds((navRows ?? []) as any[], filter)
  const nav = computeListNav(orderedIds, params.id)
  const navQuery = searchParamsToQuery(searchParams)

  return <TaskForm mode="edit" initial={task} nav={nav} navQuery={navQuery} />
}
