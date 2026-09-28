// MFH-BIBLE-READ-V3 — 장 단위 읽기(?day=N&ch=K) + 「읽기표 체크 후 다음장」 + 장별 최근 읽은 날·총 횟수(patch108 bible_chapter_reads).
// /bible/read?day=<day_no>&ch=<일차 내 순번 1-based> — 통독 하루치를 한 장씩 읽는다.
//   · ?day 없으면 오늘(없으면 다음) 일차. ?ch 없으면 이 계획에서 아직 체크하지 않은 첫 장(모두 체크했으면 1).
//   · 머리: Day N · 범위 · 장 칩(일차 내 장 목록, 체크된 장은 ✓) / 본문 1장 / 이전장·다음장(일차 경계 넘김) / 체크 버튼 / 기록 요약.
//   · 버전 = 쿠키 bible_ver(기본 개역개정). 선택 버전에 이 장이 없으면 개역개정 폴백 + 안내 1줄.
//   · 본문 = patch105 bible_texts(멤버 RLS, 내부 열람용). <소제목> 은 VerseText 가 절 위 블록으로 분리.
//   PC 폭: ≥1024px max-w-4xl — 아이패드는 2xl 유지.
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import VerseText from '@/components/VerseText'
import { longDate, orderedChapters, planProgress, planScope, type ChapterRef } from '@/lib/bible/plan'
import {
  BIBLE_VERSION_COOKIE,
  BIBLE_VERSION_LABEL,
  chapSeqOf,
  getChapterTexts,
  parseBibleVersion,
  type ChapterText,
} from '@/lib/bible/texts'
import type { ReadingPlan, ReadingPlanDay } from '@/lib/types'
import VersionSelect from './VersionSelect'
import ChapterCheck from './ChapterCheck'
import '../../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

const CARD = 'rounded-[24px] border border-line bg-surface p-5 shadow-soft'
const NAV_BTN = 'rounded-xl border border-line px-3 py-2 text-[12px] font-medium text-muted transition hover:border-primary'
const NAV_LINK = 'text-[14px] font-semibold text-primary transition hover:underline'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-theme mx-auto max-w-md px-5 pb-8 min-[740px]:max-w-2xl lg:max-w-4xl">
      <PageHeader title="본문 읽기" />
      {children}
    </main>
  )
}

const href = (dayNo: number, ch: number) => `/bible/read?day=${dayNo}&ch=${ch}`

type ReadRow = { chap_seq: number; read_at: string; plan_id: string | null }

export default async function BibleReadPage({ searchParams }: { searchParams: Promise<{ day?: string; ch?: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })
  const { day: dayParam, ch: chParam } = await searchParams

  // 활성 계획 + 일정 (app/bible/page.tsx 와 같은 조회)
  const { data: planRow } = await supabase.from('reading_plans').select('*').eq('is_active', true).maybeSingle()
  const plan = planRow as ReadingPlan | null
  if (!plan) {
    return (
      <Shell>
        <div className={`${CARD} text-center`}>
          <p className="text-base font-semibold text-primary">활성 통독 계획이 없습니다</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">계획을 먼저 세우면 하루치 본문을 여기서 읽을 수 있습니다.</p>
          <Link href="/bible" className={`${NAV_BTN} mt-4 inline-block`}>
            통독으로
          </Link>
        </div>
      </Shell>
    )
  }
  const { data: dayRows } = await supabase
    .from('reading_plan_days')
    .select('*')
    .eq('plan_id', plan.id)
    .order('day_no', { ascending: true })
  const days = (dayRows ?? []) as ReadingPlanDay[]

  const progress = planProgress(days, today)
  const wanted = dayParam ? Number(dayParam) : null
  const day =
    (wanted != null && Number.isInteger(wanted) ? days.find((d) => d.day_no === wanted) : null) ??
    (progress.todayDayNo != null ? days.find((d) => d.day_no === progress.todayDayNo) : null) ??
    (progress.nextDayNo != null ? days.find((d) => d.day_no === progress.nextDayNo) : null) ??
    days[0] ??
    null
  if (!day) {
    return (
      <Shell>
        <div className={CARD}>
          <p className="text-sm text-muted">읽을 일차가 없습니다.</p>
        </div>
      </Shell>
    )
  }

  // 이 일차의 장 목록(읽기 순서) + 정경 chap_seq
  const list = orderedChapters(plan.read_order, planScope(plan))
  const dayRefs: ChapterRef[] = list.slice(day.start_seq, day.end_seq + 1)
  const daySeqs = dayRefs.map((r) => chapSeqOf(r.book.order, r.chapter))

  // 장별 읽음 기록(이 일차의 장 전체, 전 기간) — 최근·횟수 + 이 계획에서 체크 여부(plan_id 일치)
  const { data: readRows } = await supabase
    .from('bible_chapter_reads')
    .select('chap_seq, read_at, plan_id')
    .in('chap_seq', daySeqs)
    .order('read_at', { ascending: false })
  const reads = (readRows ?? []) as ReadRow[]
  const checkedInPlan = new Set(reads.filter((r) => r.plan_id === plan.id).map((r) => r.chap_seq))

  // 현재 장: ?ch(1-based) → 없으면 이 계획에서 아직 체크 안 한 첫 장 → 없으면 1
  const total = dayRefs.length
  const chWanted = chParam ? Number(chParam) : NaN
  let ch: number
  if (Number.isInteger(chWanted) && chWanted >= 1 && chWanted <= total) ch = chWanted
  else {
    const firstUnread = daySeqs.findIndex((s) => !checkedInPlan.has(s))
    ch = firstUnread >= 0 ? firstUnread + 1 : 1
  }
  const ref = dayRefs[ch - 1]
  const chapSeq = daySeqs[ch - 1]
  const chapReads = reads.filter((r) => r.chap_seq === chapSeq)
  const dayComplete = daySeqs.every((s, i) => i === ch - 1 || checkedInPlan.has(s))

  // 이전·다음 장(일차 경계 넘김)
  const prevDay = days.find((d) => d.day_no === day.day_no - 1)
  const nextDay = days.find((d) => d.day_no === day.day_no + 1)
  const prevHref = ch > 1 ? href(day.day_no, ch - 1) : prevDay ? href(prevDay.day_no, prevDay.end_seq - prevDay.start_seq + 1) : null
  const nextHref = ch < total ? href(day.day_no, ch + 1) : nextDay ? href(nextDay.day_no, 1) : null

  // 본문(선택 버전 → 없으면 개역개정 폴백)
  const version = parseBibleVersion((await cookies()).get(BIBLE_VERSION_COOKIE)?.value)
  let chapter: ChapterText | null = null
  let notice: string | null = null
  const first = await getChapterTexts(supabase, version, [ref])
  if (first.chapters.length > 0) chapter = first.chapters[0]
  else if (version !== 'nkrv') {
    const fallback = await getChapterTexts(supabase, 'nkrv', [ref])
    if (fallback.chapters.length > 0) {
      chapter = fallback.chapters[0]
      notice = `${BIBLE_VERSION_LABEL[version]}은 이 장이 아직 준비 중이라 개역개정으로 표시합니다.`
    }
  }
  const servedLabel = BIBLE_VERSION_LABEL[notice ? 'nkrv' : version]

  return (
    <Shell>
      {/* 일차 머리 */}
      <div className="mb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-display text-[11px] font-bold uppercase tracking-[0.15em] text-accent">Day {day.day_no}</div>
          <Link href="/bible" className="text-[12px] font-medium text-muted hover:text-primary">
            통독 →
          </Link>
        </div>
        <h2 className="mt-1 text-[22px] font-bold leading-tight text-ink">
          {ref.book.name} {ref.chapter}장
        </h2>
        <p className="mt-1 text-[12px] text-muted">
          {day.range_label} · {longDate(day.read_date)} · {ch}/{total}장{day.done ? ' · 읽음' : ''}
        </p>
      </div>

      {/* 일차 내 장 칩 — 체크된 장은 ✓ */}
      {total > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {dayRefs.map((r, i) => {
            const on = i === ch - 1
            const checked = checkedInPlan.has(daySeqs[i])
            return (
              <Link
                key={daySeqs[i]}
                href={href(day.day_no, i + 1)}
                aria-current={on ? 'page' : undefined}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                  on ? 'border-primary bg-primary text-on-primary' : checked ? 'border-line bg-surface-subtle text-muted' : 'border-line bg-surface text-ink hover:border-primary'
                }`}
              >
                {r.book.abbr} {r.chapter}
                {checked ? ' ✓' : ''}
              </Link>
            )
          })}
        </div>
      )}

      <div className="mb-4 max-w-[360px]">
        <VersionSelect initial={version} />
      </div>
      {notice && <p className="mb-3 rounded-xl bg-accent-soft px-3 py-2 text-[12px] text-primary">{notice}</p>}

      {!chapter ? (
        <div className={CARD}>
          <p className="text-[15px] font-bold text-primary">본문을 불러오지 못했습니다</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            본문 데이터가 아직 준비되지 않았을 수 있습니다(patch105 실행 + bible-seed 시딩 필요).
          </p>
        </div>
      ) : (
        <section className={CARD}>
          <div className="space-y-2">
            {chapter.verses.map((v) => (
              <VerseText key={v.verse} label={`${v.verse}${v.verse_end ? `-${v.verse_end}` : ''}`} body={v.body} />
            ))}
          </div>
          <p className="mt-4 text-center text-[11px] text-faint">{servedLabel} · 내부 열람용</p>
        </section>
      )}

      {/* 이전장 · 다음장 */}
      <div className="mt-4 flex items-center justify-between">
        {prevHref ? (
          <Link href={prevHref} className={NAV_LINK}>
            ‹ 이전장
          </Link>
        ) : (
          <span />
        )}
        {nextHref ? (
          <Link href={nextHref} className={NAV_LINK}>
            다음장 ›
          </Link>
        ) : (
          <span />
        )}
      </div>

      {/* 읽기표 체크 + 기록 요약 */}
      <ChapterCheck
        chapSeq={chapSeq}
        planId={plan.id}
        day={{
          id: day.id,
          chars: day.chars,
          read_on: day.read_on,
          read_time: day.read_time,
          read_minutes: day.read_minutes,
          read_method: day.read_method,
          done: day.done,
        }}
        dayComplete={dayComplete}
        nextHref={nextHref}
        lastReadAt={chapReads[0]?.read_at ?? null}
        readCount={chapReads.length}
      />
    </Shell>
  )
}
