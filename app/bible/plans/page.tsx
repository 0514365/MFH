// MFH-BIBLE-PLANS-PAGE-V1
// /bible/plans — 내 통독 계획 목록(활성·대기·완독). 활성 전환·삭제는 PlansList(client).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import BackButton from '@/components/BackButton'
import { planProgress, type ProgressDay } from '@/lib/bible/plan'
import type { ReadingPlan } from '@/lib/types'
import PlansList, { type PlanCard } from './PlansList'
import '../../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

export default async function BiblePlansPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })

  const [plansQ, daysQ] = await Promise.all([
    supabase.from('reading_plans').select('*').order('is_active', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('reading_plan_days').select('plan_id, day_no, read_date, done, chapters'),
  ])
  const plans = (plansQ.data ?? []) as ReadingPlan[]
  const days = (daysQ.data ?? []) as (ProgressDay & { plan_id: string })[]

  const cards: PlanCard[] = plans.map((p) => ({
    plan: p,
    progress: planProgress(
      days.filter((d) => d.plan_id === p.id),
      today,
    ),
  }))

  return (
    <main className="app-theme mx-auto max-w-md px-5 pb-8">
      <PageHeader
        title="계획 관리"
        action={
          <>
            <BackButton href="/bible" variant="chip" label="통독" />
            <Link href="/bible/new" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">
              + 새 계획
            </Link>
          </>
        }
      />
      <p className="-mt-1 mb-4 text-xs text-muted">활성 계획은 1개만 홈과 통독 화면에 표시됩니다.</p>
      <PlansList initial={cards} />
    </main>
  )
}
