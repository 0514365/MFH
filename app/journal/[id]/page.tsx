import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getMembersMap, canEditEntry, PORTFOLIO_OWNER_ID } from '@/lib/members'
import type { JournalEntry } from '@/lib/types'
import { applyJournalFilter, parseJournalFilter } from '@/lib/journalFilter'
import { computeListNav, searchParamsToQuery } from '@/lib/listNav'
import BackButton from '@/components/BackButton'
import DetailNav from '@/components/DetailNav'
import { collectPhotoPaths, resolveJournalPhotos } from '@/lib/journalPhotos'
import PhotoCollage, { type CollagePhoto } from '../PhotoCollage'
import DeleteButton from './DeleteButton'
import '../../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

const MONTHS_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
// 'YYYY-MM-DD' → 'OCTOBER 15, 2026' (이미지형 영문 날짜). 잘못된 값이면 원문.
function fmtDateEn(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  if (!y || !m || !day) return d
  return `${MONTHS_EN[m - 1]} ${day}, ${y}`
}

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

  // photos(우선) 또는 레거시 단일 → 원본+썸네일을 한 번에 서명(1시간). 사진별 장소·좌표는 대표 상속.
  const resolved = resolveJournalPhotos(entry)
  const detailPaths = Array.from(
    new Set(resolved.flatMap((p) => (p.thumb_path ? [p.path, p.thumb_path] : [p.path]))),
  )
  const urlByPath: Record<string, string> = {}
  if (detailPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from('journal-photos')
      .createSignedUrls(detailPaths, 3600)
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) urlByPath[s.path] = s.signedUrl
    }
  }
  const collage: CollagePhoto[] = resolved.flatMap((p) => {
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

  return (
    <main className="app-theme mx-auto max-w-md pb-10">
      {/* 상단바 (이미지) — 좌: ‹ Log / 우: ‹ n/total › */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b border-line px-4 py-3"
        style={{ background: 'var(--paper)' }}
      >
        <BackButton href="/journal" label="" variant="text" />
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 font-display text-[16px] font-semibold uppercase tracking-[0.06em] text-muted">
          {fmtDateEn(entry.entry_date)}
        </span>
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

      {/* 헤더: 제목 → 메타칩(로그목록과 동일 스타일). 날짜는 상단바 중앙으로 이동. */}
      <section className="flex flex-col gap-3.5 px-5 pb-6 pt-5">
        {/* 제목 */}
        {entry.headline && (
          <h1 className="break-keep text-[26px] font-bold leading-[1.3] tracking-tight text-ink">
            {entry.headline}
          </h1>
        )}
        {/* 메타칩 — 분류(회색) + 장소·작성자·기도후보(아이콘색, 목록과 동일) */}
        <div className="flex flex-wrap items-center gap-2">
          {entry.category && (
            <span className="rounded-lg bg-surface-subtle px-2.5 py-1 text-[11px] font-bold tracking-wide text-primary">
              {entry.category}
            </span>
          )}
          {entry.place_name && (
            <span className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-medium text-muted">
              <span className="shrink-0" style={{ color: '#9A9A98' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </span>
              <span className="max-w-[160px] truncate">{entry.place_name}</span>
            </span>
          )}
          {membersMap[entry.user_id] && (
            <span className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-medium text-muted">
              <span className="shrink-0" style={{ color: entry.user_id === PORTFOLIO_OWNER_ID ? '#5E82A6' : '#C56A7E' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </span>
              <span className="max-w-[120px] truncate">{membersMap[entry.user_id]}</span>
            </span>
          )}
          {entry.prayer_candidate && (
            <span className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-medium text-muted">
              <span className="shrink-0" style={{ color: '#B61821' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10 2.5h4v6h6v4h-6v9h-4v-9H4v-4h6z" /></svg>
              </span>
              기도후보
            </span>
          )}
        </div>
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
