'use server'
// MFH-CARD-INBOX-ACTIONS-V2 — 자동 승인 되돌리기 · 상점 자동 토글
// MFH-CARD-INBOX-ACTIONS-V1
// 승인대기 인박스 server action — 재정 관리자(부부) 확인 후 승인(장부 저장+학습)·무시. 처리 후 회계 경로 revalidate.
import { createClient } from '@/lib/supabase-server'
import { canManageFinance } from '@/lib/members'
import { approveInboxItem, ignoreInboxItems, revertAutoApproved, setMerchantAuto } from '@/lib/card-inbox-db'
import type { InboxApproveInput } from '@/lib/accounting-types'
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

// 승인(1건 또는 여러 건) — 행마다 순차 처리, 부분 성공 시 done 과 첫 오류 보고.
export async function approveInbox(
  items: InboxApproveInput[],
): Promise<{ ok: boolean; done: number; error?: string }> {
  const uid = await financeUserId()
  if (!uid) return { ok: false, done: 0, error: '권한이 없습니다' }
  if (!items.length) return { ok: false, done: 0, error: '승인할 거래가 없습니다' }
  let done = 0
  let error: string | undefined
  for (const it of items) {
    const res = await approveInboxItem(uid, it)
    if (res.ok) done++
    else error = error ?? res.error
  }
  if (done > 0) revalidateAll()
  return { ok: done === items.length, done, error }
}

// 무시(여러 건).
export async function ignoreInbox(ids: string[]): Promise<{ ok: boolean; done: number; error?: string }> {
  const uid = await financeUserId()
  if (!uid) return { ok: false, done: 0, error: '권한이 없습니다' }
  const res = await ignoreInboxItems(ids)
  if (res.done > 0) revalidateAll()
  return res
}

// 자동 승인 되돌리기(장부 삭제 + 대기 복귀). disableRule = 그 상점 자동도 끔.
export async function revertAuto(id: string, disableRule: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!(await financeUserId())) return { ok: false, error: '권한이 없습니다' }
  const res = await revertAutoApproved(id, disableRule)
  if (res.ok) revalidateAll()
  return res
}

export async function toggleMerchantAuto(id: string, on: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!(await financeUserId())) return { ok: false, error: '권한이 없습니다' }
  const res = await setMerchantAuto(id, on)
  if (res.ok) revalidatePath('/accounting/inbox')
  return res
}
