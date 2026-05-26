import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import type { Project } from '@/lib/types'
import ProjectsList from './ProjectsList'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('projects')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  const projects = (data ?? []) as Project[]

  const { data: taskRows } = await supabase.from('tasks').select('project_id, done')
  const counts: Record<string, { total: number; done: number }> = {}
  for (const t of (taskRows ?? []) as { project_id: string | null; done: boolean }[]) {
    if (!t.project_id) continue
    const c = counts[t.project_id] ?? { total: 0, done: 0 }
    c.total += 1
    if (t.done) c.done += 1
    counts[t.project_id] = c
  }

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <PageHeader
        title="Projects"
        current="projects"
        action={
          <Link
            href="/projects/new"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            + Project
          </Link>
        }
      />

      <ProjectsList projects={projects} counts={counts} />
    </main>
  )
}
