// MFH-JOURNAL-PAGE-V2
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getMembersMap } from '@/lib/members'
import PageHeader from '@/components/PageHeader'
import type { JournalEntry, Project, Task } from '@/lib/types'
import JournalList from './JournalList'
import DomainInsightPanel from '@/app/insights/DomainInsightPanel'

export const dynamic = 'force-dynamic'

export default async function JournalPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 일지 + 일괄변경 chip 옵션용 프로젝트/할일을 병렬 조회.
  // 할일은 done 도 함께 → 화면 측에서 미완료만 필터.
  const [entriesQ, projectsQ, tasksQ] = await Promise.all([
    supabase
      .from('journal_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('projects').select('id, title').order('title', { ascending: true }),
    supabase.from('tasks').select('id, title, done').order('title', { ascending: true }),
  ])

  const entries = (entriesQ.data ?? []) as JournalEntry[]
  const projects = (projectsQ.data ?? []) as Pick<Project, 'id' | 'title'>[]
  const tasks = (tasksQ.data ?? []) as Pick<Task, 'id' | 'title' | 'done'>[]
  const membersMap = await getMembersMap(supabase)

  return (
    <main className="mx-auto max-w-md px-5 py-8 min-[740px]:max-w-5xl">
      <PageHeader
        title="Log"
        current="journal"
        action={
          <Link
            href="/journal/new"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            + Log
          </Link>
        }
      />

      <DomainInsightPanel domain="journal" />

      <JournalList
        entries={entries}
        projects={projects}
        tasks={tasks}
        membersMap={membersMap}
        currentUserId={user.id}
      />
    </main>
  )
}
