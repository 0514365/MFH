// MFH-BIBLE-READ-V1 (09-25 PC 폭: ≥1024px max-w-4xl — 아이패드는 2xl 유지)
// /bible/read?day=<day_no> — 통독 하루치 「본문 읽기」. Manna app/(app)/bible/read/page.tsx V2 이식.
// ?day 없으면 오늘(없으면 다음) 일차. 버전 = 쿠키 bible_ver(기본 개역개정).
// 선택 버전에 빠진 장이 하나라도 있으면 하루치 전체를 개역개정으로 폴백 + 안내 1줄.
// 본문 = patch105 bible_texts(멤버 RLS, 내부 열람용). 시딩 전이면 안내 카드.
// <소제목> 은 본문에 인라인 보존 — VerseText 가 절 위 별도 블록으로 분리. 합절은 "18-19".
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import VerseText from '@/components/VerseText'
import { longDate, orderedChapters, planProgress } from '@/lib/bible/plan'
import {
  BIBLE_VERSION_COOKIE,
  BIBLE_VERSION_LABEL,
  getChapterTexts,
  parseBibleVersion,
  type ChapterText,
} from '@/lib/bible/texts'
import type { ReadingPlan, ReadingPlanDay } from '@/lib/types'
import VersionSelect from './VersionSelect'
import '../../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

const CARD = 'rounded-[24px] border border-line bg-surface p-5 shadow-soft'
const NAV_BTN = 'rounded-xl border border-line px-3 py-2 text-[12px] font-medium text-muted transition hover:border-primary'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-theme mx-auto max-w-md px-5 pb-8 min-[740px]:max-w-2xl lg:max-w-4xl">
      <PageHeader title="본문 읽기" />
      {children}
    </main>
  )
}

export default async function BibleReadPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })
  const { day: dayParam } = await searchParams

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

  const version = parseBibleVersion((await cookies()).get(BIBLE_VERSION_COOKIE)?.value)
  const refs = orderedChapters(plan.read_order).slice(day.start_seq, day.end_seq + 1)

  let chapters: ChapterText[] = []
  let notice: string | null = null
  const first = await getChapterTexts(supabase, version, refs)
  if (first.missing.length === 0) {
    chapters = first.chapters
  } else if (version !== 'nkrv') {
    const fallback = await getChapterTexts(supabase, 'nkrv', refs)
    if (fallback.missing.length === 0) {
      chapters = fallback.chapters
      notice = `${BIBLE_VERSION_LABEL[version]}은 이 범위가 아직 준비 중이라 개역개정으로 표시합니다.`
    }
  }
  const servedLabel = BIBLE_VERSION_LABEL[notice ? 'nkrv' : version]

  const prev = days.find((d) => d.day_no === day.day_no - 1)
  const next = days.find((d) => d.day_no === day.day_no + 1)

  return (
    <Shell>
      {/* 일차 머리 */}
      <div className="mb-4">
        <div className="font-display text-[11px] font-bold uppercase tracking-[0.15em] text-accent">Day {day.day_no}</div>
        <h2 className="mt-1 text-[22px] font-bold leading-tight text-ink">{day.range_label}</h2>
        <p className="mt-1 text-[12px] text-muted">
          {longDate(day.read_date)} · {day.chapters}장 · {day.chars.toLocaleString()}자{day.done ? ' · 읽음' : ''}
        </p>
      </div>

      <div className="mb-4 max-w-[360px]">
        <VersionSelect initial={version} />
      </div>
      {notice && <p className="mb-3 rounded-xl bg-accent-soft px-3 py-2 text-[12px] text-primary">{notice}</p>}

      {chapters.length === 0 ? (
        <div className={CARD}>
          <p className="text-[15px] font-bold text-primary">본문을 불러오지 못했습니다</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            본문 데이터가 아직 준비되지 않았을 수 있습니다(patch105 실행 + bible-seed 시딩 필요).
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {chapters.map((c) => (
            <section key={c.chapSeq} className={CARD}>
              <h3 className="text-[19px] font-bold text-ink">
                {c.ref.book.name} {c.ref.chapter}장
              </h3>
              <div className="mt-3 space-y-2">
                {c.verses.map((v) => (
                  <VerseText key={v.verse} label={`${v.verse}${v.verse_end ? `-${v.verse_end}` : ''}`} body={v.body} />
                ))}
              </div>
            </section>
          ))}
          <p className="text-center text-[11px] text-faint">{servedLabel} · 내부 열람용</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        {prev ? (
          <Link href={`/bible/read?day=${prev.day_no}`} className={NAV_BTN}>
            ← {prev.day_no}일차
          </Link>
        ) : (
          <span />
        )}
        <Link href="/bible" className={NAV_BTN}>
          통독
        </Link>
        {next ? (
          <Link href={`/bible/read?day=${next.day_no}`} className={NAV_BTN}>
            {next.day_no}일차 →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </Shell>
  )
}
