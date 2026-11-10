// MFH-JOURNAL-DETAIL-V3 — 조회 병렬화(로그인+본문 → 나머지 일괄) · 이전/다음은 검색어 없으면 가벼운 칸만.
// MFH-JOURNAL-DETAIL-V2 — 2027(4-1): theme-2027 · 빨간 ‹ 일지 + ‹n/total› · 분류 색 사각형·날짜(한글) · 제목 22/600 · 메타 = 연회색 알약 ·
//   플래그 알약(틴트) · 중보 틴트 6 · 사진 밴드 · 섹션 라벨(이모지·영문 제거) · 기도제목 일지 틴트 · 수정 남색 / 삭제 연한 빨강.
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getMembersMap, canEditEntry, isMaster } from '@/lib/members'
import { JOURNAL_CATEGORY_BLOCK } from '@/lib/constants'
import { blockColor, brand2027 } from '@/lib/palette'
import type { JournalEntry } from '@/lib/types'
import { applyJournalFilter, parseJournalFilter } from '@/lib/journalFilter'
import { computeListNav, searchParamsToQuery } from '@/lib/listNav'
import BackButton from '@/components/BackButton'
import DetailNav from '@/components/DetailNav'
import { collectPhotoPaths, resolveJournalPhotos } from '@/lib/journalPhotos'
import PhotoCollage, { type CollagePhoto } from '../PhotoCollage'
import JournalFlagsToggle from '../JournalFlagsToggle'
import MarkdownText from '@/components/MarkdownText'
import DeleteButton from './DeleteButton'

export const dynamic = 'force-dynamic'

const DOW = ['일', '월', '화', '수', '목', '금', '토']
// 'YYYY-MM-DD' → '2026. 10. 20 (월)'. 잘못된 값이면 원문.
function fmtDateKo(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  if (!y || !m || !day) return d
  const dow = DOW[new Date(Date.UTC(y, m - 1, day)).getUTCDay()]
  return `${y}. ${m}. ${day} (${dow})`
}

// 본문 섹션 — Manrope 회색 라벨 + 본문. tint = 일지 틴트 면(기도제목).
function Section({ label, text, tint }: { label: string; text: string | null; tint?: boolean }) {
  if (!text) return null
  return (
    <section className={tint ? 'rounded-2xl bg-b27-tint-2 px-4 py-3.5' : ''}>
      <div className="mb-1.5 flex items-center gap-1.5 font-num text-[12px] font-medium text-b27-muted">
        {tint && <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-2" aria-hidden="true" />}
        {label}
      </div>
      <MarkdownText text={text} className="break-keep text-[15px] leading-[1.75] text-b27-ink" />
    </section>
  )
}

// 메타 칩 — 연회색 알약 + 회색 아이콘. color 가 있으면 앞에 8px 색 사각형.
function Meta({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="flex max-w-[180px] items-center gap-1.5 rounded-full bg-b27-card px-3 py-1.5 text-[12px] text-b27-ink">
      {color && <span className="inline-block h-2 w-2 shrink-0 rounded-[2px]" style={{ background: color }} aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </span>
  )
}

export default async function JournalDetail(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const supabase = await createClient()
  // 로그인 확인과 본문 조회를 동시에(둘 다 서로를 기다릴 필요가 없다).
  const [
    {
      data: { user },
    },
    { data },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('journal_entries').select('*').eq('id', params.id).maybeSingle(),
  ])
  if (!user) redirect('/login')
  const entry = data as JournalEntry | null
  if (!entry) notFound()

  const canEdit = canEditEntry(entry.user_id, user.id)

  // 목록과 동일한 필터+검색+정렬로 전체를 재계산 → 현재 항목의 이전/다음.
  const filter = parseJournalFilter({ get: (k) => {
    const v = searchParams[k]
    return Array.isArray(v) ? (v[v.length - 1] ?? null) : (v ?? null)
  } })
  // 본문 4칸은 텍스트 검색(q)이 있을 때만 필요 — 없으면 가벼운 칸만 읽는다.
  const navCols = filter.q
    ? 'id, user_id, entry_date, category, prayer_candidate, headline, today, thanks, meditation, prayer, place_name, created_at'
    : 'id, user_id, entry_date, category, prayer_candidate, place_name, created_at'

  // photos(우선) 또는 레거시 단일 → 원본+썸네일을 한 번에 서명(1시간). 사진별 장소·좌표는 대표 상속.
  const resolved = resolveJournalPhotos(entry)
  const detailPaths = Array.from(
    new Set(resolved.flatMap((p) => (p.thumb_path ? [p.path, p.thumb_path] : [p.path]))),
  )

  // 멤버 이름 · 연계 중보기도/프로젝트/할일/후원자(메타칩용, 연결 없으면 null) · 이전/다음 · 사진 서명 URL 을 한꺼번에 조회.
  const [membersMap, icQ, projQ, taskQ, supQ, navQ, signedQ] = await Promise.all([
    getMembersMap(supabase),
    entry.intercession_id
      ? supabase.from('intercessions').select('visitor_name, message').eq('id', entry.intercession_id).maybeSingle()
      : null,
    entry.project_id
      ? supabase.from('projects').select('title').eq('id', entry.project_id).maybeSingle()
      : null,
    entry.task_id ? supabase.from('tasks').select('title').eq('id', entry.task_id).maybeSingle() : null,
    // 후원자 상세에서 이 일지를 연결하면 채워짐.
    entry.supporter_id
      ? supabase.from('supporters').select('name').eq('id', entry.supporter_id).maybeSingle()
      : null,
    supabase.from('journal_entries').select(navCols),
    detailPaths.length > 0
      ? supabase.storage.from('journal-photos').createSignedUrls(detailPaths, 3600)
      : null,
  ])
  const linkedIntercession = (icQ?.data as { visitor_name: string; message: string } | null) ?? null
  const projectTitle = (projQ?.data as { title: string } | null)?.title ?? null
  const taskTitle = (taskQ?.data as { title: string } | null)?.title ?? null
  const supporterName = (supQ?.data as { name: string } | null)?.name ?? null

  const orderedIds = applyJournalFilter((navQ.data ?? []) as any[], filter).map(
    (e) => e.id as string,
  )
  const nav = computeListNav(orderedIds, params.id)
  const navQuery = searchParamsToQuery(searchParams)

  const urlByPath: Record<string, string> = {}
  for (const sg of signedQ?.data ?? []) {
    if (sg.signedUrl && sg.path) urlByPath[sg.path] = sg.signedUrl
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
        w: p.w,
        h: p.h,
      },
    ]
  })

  const catN = entry.category ? JOURNAL_CATEGORY_BLOCK[entry.category] : undefined

  return (
    <main className="mx-auto max-w-md pb-10 @xl:max-w-3xl">
      {/* 상단바 — 좌: 빨간 ‹ + 「일지」 / 우: ‹ n/total › */}
      <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between bg-b27-paper pl-3 pr-4">
        <span className="flex items-center">
          <BackButton href={navQuery ? `/journal?${navQuery}` : '/journal'} label="일지" variant="text" />
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

      <div className="flex flex-col gap-4 px-5 pt-2">
        {/* 분류 색 사각형 · 분류 · 날짜 → 제목 → 메타 칩 → 플래그 알약 */}
        <div className="flex items-center gap-1.5 font-num text-[12px] font-medium text-b27-muted">
          <span
            className="inline-block h-2 w-2 rounded-[2px]"
            style={{ background: catN ? blockColor(catN).bg : brand2027.line }}
            aria-hidden="true"
          />
          {[entry.category, fmtDateKo(entry.entry_date)].filter(Boolean).join(' · ')}
        </div>
        {entry.headline && (
          <h1 className="-mt-2 break-keep text-[22px] font-semibold leading-[1.35] text-b27-ink @xl:text-[26px]">
            {entry.headline}
          </h1>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {membersMap[entry.user_id] && <Meta>{membersMap[entry.user_id]}</Meta>}
          {entry.place_name && <Meta>{entry.place_name}</Meta>}
          {projectTitle && <Meta color={blockColor(6).bg}>{projectTitle}</Meta>}
          {taskTitle && <Meta color={blockColor(3).bg}>{taskTitle}</Meta>}
          {supporterName && (
            <Link href={`/supporters/${entry.supporter_id}`} className="transition active:opacity-70">
              <Meta color={blockColor(3).bg}>{supporterName}</Meta>
            </Link>
          )}
        </div>
        {/* 기도후보·비공개·비밀글 — 편집 권한 없으면 비활성 표시만. */}
        <JournalFlagsToggle
          id={entry.id}
          flags={{
            prayer_candidate: entry.prayer_candidate,
            is_private: entry.is_private,
            is_secret: entry.is_secret,
          }}
          canEdit={canEdit}
          showSecret={isMaster(user.id)}
          variant="pill"
        />

        {/* 중보기도 연계 — 중보 틴트 면(6) */}
        {linkedIntercession && (
          <div className="flex flex-col gap-1 rounded-2xl bg-b27-tint-6 px-4 py-3.5">
            <span className="flex items-center gap-1.5 font-num text-[12px] font-medium text-b27-muted">
              <span className="inline-block h-2 w-2 rounded-[2px] bg-b27-block-6" aria-hidden="true" />
              연계된 중보기도
            </span>
            <p className="break-keep text-[15px] font-medium leading-snug text-b27-ink">
              {linkedIntercession.visitor_name} · {linkedIntercession.message}
            </p>
          </div>
        )}

        {/* 사진 밴드 */}
        {collage.length > 0 && (
          <section className="-mx-5 @xl:mx-0">
            <PhotoCollage photos={collage} wide />
          </section>
        )}

        <Section label="오늘의 기록" text={entry.today} />
        <Section label="감사·응답" text={entry.thanks} />
        <Section label="묵상·깨달음" text={entry.meditation} />
        <Section label="기도제목" text={entry.prayer} tint />

        {/* 수정(남색) / 삭제(연한 빨강) */}
        {canEdit ? (
          <div className="mt-2 flex items-center gap-2">
            <Link
              href={`/journal/${entry.id}/edit`}
              className="flex-1 rounded-2xl bg-b27-ink py-3.5 text-center text-[14px] font-medium text-white transition active:opacity-80"
            >
              수정
            </Link>
            <DeleteButton id={entry.id} paths={collectPhotoPaths(entry)} />
          </div>
        ) : (
          <p className="mt-2 rounded-2xl bg-b27-card px-4 py-3 text-center text-xs text-b27-muted">
            {membersMap[entry.user_id] ?? '다른 멤버'}님의 일지입니다. 보기만 가능합니다.
          </p>
        )}
      </div>
    </main>
  )
}
