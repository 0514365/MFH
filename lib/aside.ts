// MFH-ASIDE-DATA-V1 — 보조 패널(components/AsidePanel) 데이터 조회. app/(app)/layout.tsx 가 호출(서버 전용).
// 홈(app/(app)/page.tsx)과 같은 테이블·정렬 기준을 쓴다. 가벼운 컬럼만 select.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AsideData } from '@/components/AsidePanel'
import { projectSignals, taskSignals } from '@/lib/signals'
import { planProgress, progressBadge } from '@/lib/bible/plan'
import type { ReadingPlan } from '@/lib/types'

type QtRow = { passage?: { book?: string | null; range?: string | null; title?: string | null } | null } | null
type NewsRow = { highlights?: { title?: string | null }[] | null } | null
type LetterRow = { number: string | null; title: string; year_month: string } | null
type DayRow = { day_no: number; read_date: string; done: boolean; chapters: number; range_label: string }

export async function loadAside(supabase: SupabaseClient, today: string): Promise<AsideData> {
  const month = today.slice(0, 7)
  const monthStart = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const nextMonth = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`

  const [prayerQ, newsQ, qtQ, projQ, taskQ, planQ, journalQ, letterQ] = await Promise.all([
    supabase.from('intercessions').select('id', { count: 'exact', head: true }).eq('is_read', false),
    supabase
      .from('honduras_news')
      .select('highlights')
      .order('news_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('daily_qt')
      .select('passage')
      .order('qt_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('projects').select('status, due_date, importance, updated_at'),
    supabase.from('tasks').select('done, due_date, importance'),
    supabase.from('reading_plans').select('id').eq('is_active', true).maybeSingle(),
    supabase
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .gte('entry_date', monthStart)
      .lt('entry_date', nextMonth),
    supabase
      .from('letters')
      .select('number, title, year_month')
      .eq('kind', 'letter')
      .order('year_month', { ascending: false })
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  // 통독 — 활성 계획이 있으면 일차 목록으로 오늘(또는 다음) 분량·진행률.
  let bible: AsideData['bible'] = null
  const plan = planQ.data as Pick<ReadingPlan, 'id'> | null
  if (plan) {
    const { data: dayRows } = await supabase
      .from('reading_plan_days')
      .select('day_no, read_date, done, chapters, range_label')
      .eq('plan_id', plan.id)
      .order('day_no', { ascending: true })
    const days = (dayRows ?? []) as DayRow[]
    const progress = planProgress(days, today)
    const badge = progressBadge(progress)
    const focusNo = progress.todayDayNo ?? progress.nextDayNo
    const focus = focusNo != null ? days.find((d) => d.day_no === focusNo) ?? null : null
    bible = {
      label: focus ? focus.range_label : progress.completed ? '완독' : '읽을 분량 없음',
      pct: progress.pct,
      badge: badge.label,
      warn: badge.tone === 'warn',
    }
  }

  const qtRow = qtQ.data as QtRow
  const qtBook = (qtRow?.passage?.book ?? '').trim()
  const qtRange = (qtRow?.passage?.range ?? '').trim()
  const qtRef = qtBook && qtRange ? `${qtBook} ${qtRange}` : ''
  const qtTitle = (qtRow?.passage?.title ?? '').trim()
  const qt = qtRow ? { main: qtTitle || qtRef || '오늘의 말씀 묵상', ref: qtTitle ? qtRef : '' } : null

  const newsRow = newsQ.data as NewsRow
  const newsTitle = (newsRow?.highlights?.[0]?.title ?? '').trim()
  const letterRow = letterQ.data as LetterRow

  return {
    projSignals: projectSignals(
      (projQ.data ?? []) as { status: string; due_date: string | null; importance: number; updated_at: string }[],
      today,
    ),
    taskSignals: taskSignals((taskQ.data ?? []) as { done: boolean; due_date: string | null; importance: number }[], today),
    qt,
    bible,
    unreadPrayers: prayerQ.count ?? 0,
    news: newsTitle ? { title: newsTitle } : null,
    monthLabel: `${m}월`,
    journalCount: journalQ.count ?? 0,
    letter: letterRow ? { number: letterRow.number, title: letterRow.title, yearMonth: letterRow.year_month } : null,
  }
}
