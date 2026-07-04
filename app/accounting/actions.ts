'use server'
// MFH-ACCOUNTING-ACTIONS-V2
// 회계 입력·수정·삭제 server action — 재정 관리자(부부) 권한 확인 후 노션 입출금기록 write/update/archive. 노션 SoT.
import { createClient } from '@/lib/supabase-server'
import { canManageFinance } from '@/lib/members'
import {
  createInoutRecord,
  updateInoutRecord,
  deleteInoutRecord,
  patchInoutFields,
  type InoutInput,
  type InoutPatch,
} from '@/lib/notion'
import { revalidatePath } from 'next/cache'

async function isFinanceUser(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return !!user && canManageFinance(user.id)
}

export async function saveInout(input: InoutInput): Promise<{ ok: boolean; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, error: '권한이 없습니다' }
  const res = await createInoutRecord(input)
  if (res.ok) revalidatePath('/accounting')
  return res
}

export async function updateInout(
  pageId: string,
  input: InoutInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, error: '권한이 없습니다' }
  if (!pageId) return { ok: false, error: '대상 거래가 없습니다' }
  const res = await updateInoutRecord(pageId, input)
  if (res.ok) revalidatePath('/accounting')
  return res
}

export async function deleteInout(pageId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, error: '권한이 없습니다' }
  if (!pageId) return { ok: false, error: '대상 거래가 없습니다' }
  const res = await deleteInoutRecord(pageId)
  if (res.ok) revalidatePath('/accounting')
  return res
}

// 일괄 생성(CSV 일괄 입력) — 매핑·검증된 거래들을 순차 생성(노션 rate limit 회피). 부분 성공 시 done 보고.
export async function bulkCreateInout(
  items: InoutInput[],
): Promise<{ ok: boolean; done: number; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, done: 0, error: '권한이 없습니다' }
  if (items.length === 0) return { ok: false, done: 0, error: '저장할 거래가 없습니다' }
  let done = 0
  let error: string | undefined
  for (const it of items) {
    const res = await createInoutRecord(it)
    if (res.ok) done++
    else error = res.error
  }
  if (done > 0) revalidatePath('/accounting')
  return { ok: done === items.length, done, error }
}

// 일괄 삭제 — 선택 거래들을 순차 archived(노션 rate limit 회피). 부분 성공 시 done 으로 보고.
export async function bulkDeleteInout(
  ids: string[],
): Promise<{ ok: boolean; done: number; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, done: 0, error: '권한이 없습니다' }
  if (ids.length === 0) return { ok: false, done: 0, error: '선택된 거래가 없습니다' }
  let done = 0
  let error: string | undefined
  for (const id of ids) {
    const res = await deleteInoutRecord(id)
    if (res.ok) done++
    else error = res.error
  }
  if (done > 0) revalidatePath('/accounting')
  return { ok: done === ids.length, done, error }
}

// 일괄 수정(통합 수정) — 선택 거래들의 항목/계좌만 부분 변경. 계좌는 행 구분에 맞는 필드로. 수입·지출만 대상.
export async function bulkPatchInout(
  targets: { id: string; gubun: '수입' | '지출' }[],
  patch: InoutPatch,
): Promise<{ ok: boolean; done: number; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, done: 0, error: '권한이 없습니다' }
  if (targets.length === 0) return { ok: false, done: 0, error: '선택된 거래가 없습니다' }
  if (!patch.itemId && !patch.accountId)
    return { ok: false, done: 0, error: '변경할 항목 또는 계좌를 선택하세요' }
  let done = 0
  let error: string | undefined
  for (const t of targets) {
    const res = await patchInoutFields(t.id, t.gubun, patch)
    if (res.ok) done++
    else error = res.error
  }
  if (done > 0) revalidatePath('/accounting')
  return { ok: done === targets.length, done, error }
}
