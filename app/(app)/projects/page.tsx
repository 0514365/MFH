import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import type { Project } from '@/lib/types'
import ProjectsList from './ProjectsList'
import DomainInsightPanel from '@/app/(app)/insights/DomainInsightPanel'

// MFH-PROJECTS-PAGE-2027 — 4-3: theme-2027 · 제목 「프로젝트」 · 새 프로젝트 = 터키석 ＋(모바일) / 남색 알약(md+) · 신호 칩 → 목록 요약 3칸.
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

  return (
    <main className="theme-2027 mx-auto max-w-md px-5 pb-8 @xl:max-w-5xl">
      <PageHeader
        title="프로젝트"
        current="projects"
        action={
          <Link
            href="/projects/new"
            className="hidden rounded-full bg-b27-ink px-4 py-2 text-[13px] font-medium text-white transition active:opacity-80 md:inline-flex"
          >
            새 프로젝트
          </Link>
        }
      />

      <DomainInsightPanel domain="project_assist" />
      <DomainInsightPanel domain="project" />

      <ProjectsList projects={projects} counts={counts} currentUserId={user.id} />

      {/* 새 프로젝트 ＋ — 터키석 플로팅(모바일), 하단 탭바 위 16px */}
      <Link
        href="/projects/new"
        aria-label="새 프로젝트"
        className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-b27-plus text-white shadow-[0_8px_18px_-6px_rgba(46,196,182,0.6)] transition active:scale-95 md:hidden"
        style={{ bottom: 'calc(92px + env(safe-area-inset-bottom))' }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </Link>
    </main>
  )
}
