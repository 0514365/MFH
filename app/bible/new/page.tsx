// MFH-BIBLE-NEW-PAGE-V1
// /bible/new — 통독 계획 수립. 폼·미리보기·저장은 PlanForm(client).
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PageHeader from '@/components/PageHeader'
import BackButton from '@/components/BackButton'
import PlanForm from '../PlanForm'
import '../../p/portfolio-theme.css'

export const dynamic = 'force-dynamic'

export default async function BibleNewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 기본 시작일 = 온두라스 현지 오늘(홈·다른 페이지와 동일 기준).
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })

  return (
    <main className="app-theme mx-auto max-w-md px-5 pb-8">
      <PageHeader title="통독 계획" action={<BackButton href="/bible" variant="chip" label="통독" />} />
      <p className="-mt-1 mb-4 text-xs text-muted">1년 1독을 기본으로, 기간·요일·순서·배분을 정하면 하루 분량을 자동 계산합니다.</p>
      <PlanForm today={today} />
    </main>
  )
}
