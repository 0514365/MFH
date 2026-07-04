// MFH-SUPPORTERS-INSIGHTS-V1
// 후원자 분석(분석 탭) — supporter_care AI 인사이트 패널. 셸은 ../layout.tsx 담당.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { canManageFinance } from '@/lib/members'
import DomainInsightPanel from '@/app/insights/DomainInsightPanel'

export const dynamic = 'force-dynamic'

export default async function SupportersInsightsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!canManageFinance(user.id)) redirect('/')

  return <DomainInsightPanel domain="supporter_care" />
}
