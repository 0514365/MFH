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

function Section({ label, text }: { label: string; text: string | null }) {
  if (!text) return null
  return (
    <section className="mb-5">
      <h2 className="mb-1 text-sm font-bold text-primary">{label}</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{text}</p>
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
    .select('id, entry_date, category, prayer_candidate, headline, today, thanks, meditation, prayer, place_name, created_at')
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
    <main className="mx-auto max-w-md px-5 py-8">
      <div className="flex items-center justify-between gap-2">
        <BackButton href="/journal" label="Log" />
        <DetailNav
          basePath="/journal"
          prevId={nav.prevId}
          nextId={nav.nextId}
          index={nav.index}
          total={nav.total}
          query={navQuery}
        />
      </div>
      <div className="mb-4 mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted">{entry.entry_date}</span>
        <AuthorBadge name={membersMap[entry.user_id]} />
        {entry.place_name && (
          <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">
            📍 {entry.place_name}
          </span>
        )}
        {entry.category && (
          <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-muted">{entry.category}</span>
        )}
        {entry.prayer_candidate && (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary">기도후보</span>
        )}
      </div>
      {entry.headline && <h1 className="mb-6 text-xl font-extrabold text-ink">{entry.headline}</h1>}

      {linkedIntercession && (
        <div className="mb-6 rounded-2xl border border-primary bg-primary-soft p-4">
          <div className="text-xs font-bold text-primary">🙏 중보기도 연계</div>
          <p className="mt-1 text-sm font-semibold text-ink">{linkedIntercession.visitor_name}</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {linkedIntercession.message}
          </p>
        </div>
      )}

      {collage.length > 0 && (
        <div className="mb-6">
          <PhotoCollage photos={collage} />
        </div>
      )}

      <Section label="🌿 오늘 있었던 일" text={entry.today} />
      <Section label="🙏 감사·응답" text={entry.thanks} />
      <Section label="💭 묵상·깨달음" text={entry.meditation} />
      <Section label="📌 기도제목" text={entry.prayer} />

      {canEdit ? (
        <div className="mt-10 flex items-center gap-4">
          <Link href={`/journal/${entry.id}/edit`} className="text-xs font-semibold text-accent underline">
            수정
          </Link>
          <DeleteButton id={entry.id} paths={collectPhotoPaths(entry)} />
        </div>
      ) : (
        <p className="mt-10 text-xs text-faint">
          {membersMap[entry.user_id] ?? '다른 멤버'}님의 일지입니다. 보기만 가능합니다.
        </p>
      )}
    </main>
  )
}
