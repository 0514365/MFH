// MFH-JOURNAL-PAGE-V4 — 전송량 절감: 썸네일만(일지당 5장) 서명 · 원본은 확대 시 서명 · 사진 원자료는 목록에 보내지 않음.
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

// 목록 카드·미리보기가 그리는 사진 수(JournalList 의 PhotoCollage max 와 같아야 한다).
const LIST_THUMBS = 5

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

  // 카드 사진 미리보기 — 화면에 그리는 것만 서명한다: 일지당 앞 LIST_THUMBS 장의 썸네일(없으면 원본).
  // 원본은 서명하지 않고 경로만 보낸다 → 확대(라이트박스)할 때 브라우저가 직접 서명(PhotoCollage V5).
  // (전에는 모든 사진의 원본+썸네일을 매번 서명해 목록 응답이 1MB 가까이 불었다.)
  const resolvedByEntry = entries.map((e) => ({ id: e.id, list: resolveJournalPhotos(e) }))
  const thumbPathOf = (p: { path: string; thumb_path: string | null }) => p.thumb_path || p.path
  const allPaths = Array.from(
    new Set(resolvedByEntry.flatMap((r) => r.list.slice(0, LIST_THUMBS).map(thumbPathOf))),
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
    const cs = r.list.flatMap((p, i) => {
      const thumb_url = i < LIST_THUMBS ? urlByPath[thumbPathOf(p)] : null
      // 그려야 하는 칸인데 서명에 실패한 사진은 뺀다(전과 동일).
      if (i < LIST_THUMBS && !thumb_url) return []
      return [
        {
          url: '',
          path: p.path,
          thumb_url: thumb_url ?? null,
          place_name: p.place_name,
          taken_at: p.taken_at ? p.taken_at.slice(0, 10) : null,
          lat: p.lat,
          lng: p.lng,
          w: p.w,
          h: p.h,
        },
      ]
    })
    if (cs.length > 0) photoMap[r.id] = cs
  }

  // 목록(클라이언트)에는 사진 원자료(photos jsonb·EXIF)를 보내지 않는다 — 표시는 photoMap 만 쓴다.
  const listEntries: JournalEntry[] = entries.map((e) => ({ ...e, photos: null, photo_meta: null }))

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
    <main className="mx-auto max-w-md px-5 pb-8 @xl:max-w-5xl">
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
        entries={listEntries}
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
