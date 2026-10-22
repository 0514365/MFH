// MFH-JOURNAL-PAGE-V3 — 2027(4-1): theme-2027 스코프 · 제목 「일지」 · 새 일지 = 터키석 ＋ 플로팅(모바일) / 헤더 남색 알약(md+).
// MFH-JOURNAL-PAGE-V2
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getMembersMap } from '@/lib/members'
import PageHeader from '@/components/PageHeader'
import type { JournalEntry, Project, Task } from '@/lib/types'
import JournalList from './JournalList'
import DomainInsightPanel from '@/app/(app)/insights/DomainInsightPanel'
import { resolveJournalPhotos } from '@/lib/journalPhotos'
import type { CollagePhoto } from './PhotoCollage'
import OfflineSync from '@/components/OfflineSync'
import type { OfflineJournal } from '@/lib/offlineStore'

export const dynamic = 'force-dynamic'

export default async function JournalPage() {
  const supabase = await createClient()
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

  // 카드 사진 미리보기 — 모든 일지 사진 경로를 한 번에 서명 URL(1시간)로 변환.
  const resolvedByEntry = entries.map((e) => ({ id: e.id, list: resolveJournalPhotos(e) }))
  // 원본 + 썸네일 경로를 한 번에 서명. 목록 셀은 썸네일을, 라이트박스(클릭)는 원본을 로드.
  const allPaths = Array.from(
    new Set(
      resolvedByEntry.flatMap((r) =>
        r.list.flatMap((p) => (p.thumb_path ? [p.path, p.thumb_path] : [p.path])),
      ),
    ),
  )
  const urlByPath: Record<string, string> = {}
  if (allPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from('journal-photos')
      .createSignedUrls(allPaths, 3600)
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) urlByPath[s.path] = s.signedUrl
    }
  }
  const photoMap: Record<string, CollagePhoto[]> = {}
  for (const r of resolvedByEntry) {
    const cs = r.list.flatMap((p) => {
      const url = urlByPath[p.path]
      if (!url) return []
      const thumb_url = p.thumb_path ? (urlByPath[p.thumb_path] ?? url) : url
      return [
        {
          url,
          thumb_url,
          place_name: p.place_name,
          taken_at: p.taken_at ? p.taken_at.slice(0, 10) : null,
          lat: p.lat,
          lng: p.lng,
        },
      ]
    })
    if (cs.length > 0) photoMap[r.id] = cs
  }

  // 오프라인 스냅샷: 최근 30개 일지 + 대표 썸네일(첫 사진). OfflineSync 가 온라인일 때 IndexedDB 에 적재.
  const offlineJournals: OfflineJournal[] = entries.slice(0, 30).map((e, i) => {
    const first = resolvedByEntry[i]?.list[0]
    const thumbPath = first ? first.thumb_path || first.path : null
    return {
      id: e.id,
      entry_date: e.entry_date,
      category: e.category,
      headline: e.headline,
      today: e.today,
      place_name: e.place_name,
      thumbPath,
    }
  })
  const offlineThumbUrls: Record<string, string> = {}
  for (const j of offlineJournals) {
    if (j.thumbPath && urlByPath[j.thumbPath]) offlineThumbUrls[j.thumbPath] = urlByPath[j.thumbPath]
  }

  return (
    <main className="theme-2027 mx-auto max-w-md px-5 pb-8 @xl:max-w-5xl">
      <PageHeader
        title="일지"
        current="journal"
        action={
          <Link
            href="/journal/new"
            className="hidden rounded-full bg-b27-ink px-4 py-2 text-[13px] font-medium text-white transition active:opacity-80 md:inline-flex"
          >
            새 일지
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
        photoMap={photoMap}
      />

      <OfflineSync journals={offlineJournals} thumbUrls={offlineThumbUrls} />

      {/* 새 일지 ＋ — 터키석 플로팅(모바일), 하단 탭바 위 16px */}
      <Link
        href="/journal/new"
        aria-label="새 일지"
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
