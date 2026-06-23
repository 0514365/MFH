import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getMembersMap } from '@/lib/members'
import PageHeader from '@/components/PageHeader'
import type { Project } from '@/lib/types'
import ProjectsList from './ProjectsList'
import DomainInsightPanel from '@/app/insights/DomainInsightPanel'
import SignalChips from '@/components/SignalChips'
import { projectSignals } from '@/lib/signals'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = await createClient()
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

  const membersMap = await getMembersMap(supabase)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })
  const signals = projectSignals(projects, today)

  return (
    <main className="mx-auto max-w-md px-5 pb-8 min-[740px]:max-w-5xl">
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

      <SignalChips signals={signals} />

      <DomainInsightPanel domain="project_assist" />
      <DomainInsightPanel domain="project" />

      <ProjectsList projects={projects} counts={counts} membersMap={membersMap} currentUserId={user.id} />
    </main>
  )
}
