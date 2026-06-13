import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getMembersMap, canEditEntry } from '@/lib/members'
import type { JournalEntry } from '@/lib/types'
import { applyJournalFilter, parseJournalFilter } from '@/lib/journalFilter'
import { computeListNav, searchParamsToQuery } from '@/lib/listNav'
import BackButton from '@/components/BackButton'
import DetailNav from '@/components/DetailNav'
import AuthorBadge from '@/components/AuthorBadge'
import { collectPhotoPaths, resolveJournalPhotos } from '@/lib/journalPhotos'
import PhotoCollage, { type CollagePhoto } from '../PhotoCollage'
import DeleteButton from './DeleteButton'

export const dynamic = 'force-dynamic'

function Section({
  emoji,
  enLabel,
  koLabel,
  text,
  alt,
}: {
  emoji: string
  enLabel: string
  koLabel: string
  text: string | null
  alt?: boolean
}) {
  if (!text) return null
  return (
    <section className={`border-t border-line px-5 py-7 ${alt ? 'bg-white/50' : ''}`}>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[18px]">{emoji}</span>
        <div className="flex flex-col">
          <span className="mb-1 font-display text-[8px] font-bold uppercase leading-none tracking-[0.15em] text-primary opacity-50">
            {enLabel}
          </span>
          <h3 className="text-[16px] font-bold leading-none text-ink">{koLabel}</h3>
        </div>
      </div>
      <p className="whitespace-pre-wrap break-keep text-[15px] font-light leading-[1.75] text-ink">{text}</p>
    </section>
  )
}

export default async function JournalDetail(props: {
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

  const { data } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  const entry = data as JournalEntry | null
  if (!entry) notFound()

  const membersMap = await getMembersMap(supabase)
  const canEdit = canEditEntry(entry.user_id, user.id)

  let linkedIntercession: { visitor_name: string; message: string } | null = null
  if (entry.intercession_id) {
    const { data: ic } = await supabase
      .from('intercessions')
      .select('visitor_name, message')
      .eq('id', entry.intercession_id)
      .maybeSingle()
    linkedIntercession = (ic as { visitor_name: string; message: string }) ?? null
  }

  // 목록과 동일한 필터+검색+정렬로 전체를 재계산 → 현재 항목의 이전/다음.
  const filter = parseJournalFilter({ get: (k) => {
    const v = searchParams[k]
    return Array.isArray(v) ? (v[v.length - 1] ?? null) : (v ?? null)
  } })
  const { data: navRows } = await supabase
    .from('journal_entries')
    .select('id, user_id, entry_date, category, prayer_candidate, headline, today, thanks, meditation, prayer, place_name, created_at')
  const orderedIds = applyJournalFilter((navRows ?? []) as any[], filter).map(
    (e) => e.id as string,
  )
  const nav = computeListNav(orderedIds, params.id)
  const navQuery = searchParamsToQuery(searchParams)

  // photos(우선) 또는 레거시 단일 → 각 사진 서명 URL(1시간). 사진별 장소·좌표는 대표 상속.
  const resolved = resolveJournalPhotos(entry)
  const collage: CollagePhoto[] = []
  for (const p of resolved) {
    const { data: signed } = await supabase.storage
      .from('journal-photos')
      .createSignedUrl(p.path, 3600)
    if (signed?.signedUrl) {
      collage.push({
        url: signed.signedUrl,
        place_name: p.place_name,
        taken_at: p.taken_at ? p.taken_at.slice(0, 10) : null,
        lat: p.lat,
        lng: p.lng,
      })
    }
  }

  return (
    <main className="mx-auto max-w-md pb-10">
      {/* 상단바 (이미지) — 좌: ‹ Log / 우: ‹ n/total › */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b border-line px-4 py-3"
        style={{ background: 'var(--paper)' }}
      >
        <BackButton href="/journal" label="Log" variant="text" />
        <DetailNav
          basePath="/journal"
          prevId={nav.prevId}
          nextId={nav.nextId}
          index={nav.index}
          total={nav.total}
          query={navQuery}
          variant="minimal"
        />
      </header>

      {/* 헤더: 날짜 · 메타 · 제목 */}
      <section className="flex flex-col gap-4 px-5 pb-6 pt-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
            {entry.entry_date}
          </span>
          {entry.category && (
            <>
              <span className="h-1 w-1 rounded-full bg-line" />
              <span className="rounded-md bg-surface-subtle px-2 py-1 text-[11px] font-semibold leading-none text-ink">
                {entry.category}
              </span>
            </>
          )}
          {entry.place_name && (
            <span className="flex items-center gap-1 text-xs text-muted">📍 {entry.place_name}</span>
          )}
          <AuthorBadge name={membersMap[entry.user_id]} />
          {entry.prayer_candidate && (
            <span className="ml-auto rounded-md bg-accent-soft px-2 py-1 text-[11px] font-bold leading-none text-accent">
              기도후보
            </span>
          )}
        </div>
        {entry.headline && (
          <h1 className="break-keep text-[26px] font-bold leading-[1.3] tracking-tight text-ink">
            {entry.headline}
          </h1>
        )}
      </section>

      {/* 중보기도 연계 카드 */}
      {linkedIntercession && (
        <div className="relative mx-5 mb-8 flex flex-col gap-2 overflow-hidden rounded-[24px] bg-primary-soft p-4">
          <span className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
            Linked Prayer
          </span>
          <p className="break-keep pr-2 text-[15px] font-semibold leading-snug text-primary">
            {linkedIntercession.visitor_name} · {linkedIntercession.message}
          </p>
        </div>
      )}

      {/* 사진 */}
      {collage.length > 0 && (
        <section className="mb-8 px-5">
          <PhotoCollage photos={collage} />
        </section>
      )}

      {/* 4 섹션 */}
      <Section emoji="🌿" enLabel="Today" koLabel="오늘 있었던 일" text={entry.today} />
      <Section emoji="🙏" enLabel="Thanks & Answers" koLabel="감사·응답" text={entry.thanks} alt />
      <Section emoji="💭" enLabel="Meditation" koLabel="묵상·깨달음" text={entry.meditation} />
      <Section emoji="📌" enLabel="Prayer Requests" koLabel="기도제목" text={entry.prayer} alt />

      {/* 수정 / 삭제 */}
      {canEdit ? (
        <div className="flex items-center justify-center gap-6 border-t border-line px-5 pb-12 pt-8">
          <Link
            href={`/journal/${entry.id}/edit`}
            className="rounded-xl px-5 py-2 text-[13px] font-medium text-muted transition hover:bg-surface-subtle"
          >
            수정하기
          </Link>
          <div className="h-3 w-px bg-line" />
          <DeleteButton id={entry.id} paths={collectPhotoPaths(entry)} />
        </div>
      ) : (
        <p className="border-t border-line px-5 pb-12 pt-8 text-center text-xs text-faint">
          {membersMap[entry.user_id] ?? '다른 멤버'}님의 일지입니다. 보기만 가능합니다.
        </p>
      )}
    </main>
  )
}
