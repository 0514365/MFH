// MFH-BADGE-SERVER-V1
// 앱 아이콘 뱃지 숫자(서버 푸시용) — 사용자별 = 할 일 마감 도래 미완료 + (재정 관리자면) 회계 승인대기(카드 문자 + 반복 기록).
// 클라이언트 쪽 같은 합계는 lib/badge.ts refreshAppBadge. 서비스 롤(admin) 클라이언트를 받는다 — 서버 전용.
import type { SupabaseClient } from '@supabase/supabase-js'
import { canManageFinance } from './members'

const HN_TZ = 'America/Tegucigalpa'

export async function tasksDueCount(admin: SupabaseClient, uid: string): Promise<number> {
  const hnToday = new Date().toLocaleDateString('en-CA', { timeZone: HN_TZ })
  const { count } = await admin
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)
    .eq('done', false)
    .not('due_date', 'is', null)
    .lte('due_date', hnToday)
  return count ?? 0
}

export async function approvalPendingCount(admin: SupabaseClient): Promise<number> {
  const [card, rec] = await Promise.all([
    admin.from('card_tx_inbox').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('acct_recurring_due').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])
  return (card.count ?? 0) + (rec.count ?? 0)
}

// 사용자별 뱃지 합계. pending 을 미리 구했으면 넘겨서 재조회를 피한다.
export async function badgeTotalFor(admin: SupabaseClient, uid: string, pending?: number): Promise<number> {
  const due = await tasksDueCount(admin, uid)
  if (!canManageFinance(uid)) return due
  return due + (pending ?? (await approvalPendingCount(admin)))
}
