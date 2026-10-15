'use server'
// MFH-RECURRING-ACTIONS-V1
// 반복 기록 server action — 재정 관리자(부부) 확인 후 승인(장부 저장)·건너뜀·규칙 저장/활성 전환. 처리 후 회계 경로 revalidate.
import { createClient } from '@/lib/supabase-server'
import { canManageFinance } from '@/lib/members'
import {
  approveRecurringDue,
  skipRecurringDue,
  saveRecurringRule,
  setRecurringActive,
  type RecurringApproveInput,
  type RecurringRuleInput,
} from '@/lib/recurring-db'
import { revalidatePath } from 'next/cache'

async function financeUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user && canManageFinance(user.id) ? user.id : null
}
function revalidateAll() {
  for (const p of ['/accounting', '/accounting/entry', '/accounting/ledger', '/accounting/report', '/accounting/inbox'])
    revalidatePath(p)
}

export async function approveRecurring(p: RecurringApproveInput): Promise<{ ok: boolean; error?: string }> {
  const uid = await financeUserId()
  if (!uid) return { ok: false, error: '권한이 없습니다' }
  const res = await approveRecurringDue(uid, p)
  if (res.ok) revalidateAll()
  return res
}
export async function skipRecurring(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await financeUserId())) return { ok: false, error: '권한이 없습니다' }
  const res = await skipRecurringDue(id)
  if (res.ok) revalidateAll()
  return res
}
export async function saveRecurring(p: RecurringRuleInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const uid = await financeUserId()
  if (!uid) return { ok: false, error: '권한이 없습니다' }
  const res = await saveRecurringRule(uid, p)
  if (res.ok) revalidatePath('/accounting/inbox')
  return res
}
export async function toggleRecurring(id: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!(await financeUserId())) return { ok: false, error: '권한이 없습니다' }
  const res = await setRecurringActive(id, active)
  if (res.ok) revalidatePath('/accounting/inbox')
  return res
}
