import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Project } from '@/lib/types'
import ProjectForm from '../../ProjectForm'

export const dynamic = 'force-dynamic'

export default async function EditProject({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('projects').select('*').eq('id', params.id).maybeSingle()
  const project = data as Project | null
  if (!project) notFound()
  // 본인 프로젝트만 편집 — 남의 것은 상세로.
  if (project.user_id !== user.id) redirect(`/projects/${params.id}`)

  return <ProjectForm mode="edit" initial={project} />
}
