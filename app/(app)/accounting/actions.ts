'use server'
// MFH-ACCOUNTING-ACTIONS-V7 — setReceipt(영수증 교체·제거)
// MFH-ACCOUNTING-ACTIONS-V6 — 항목 관리(editItem·toggleItem·saveItemOrder)
// MFH-ACCOUNTING-ACTIONS-V5 — saveItem(항목 즉석 추가)
// MFH-ACCOUNTING-ACTIONS-V4
// 회계 입력·수정·삭제 + 계좌 추가 server action — 재정 관리자(부부) 권한 확인 후 Supabase 장부(acct_*) write.
// V4(2026-10): 노션 → Supabase 이전. 일괄 작업은 단일 쿼리(배열 insert / in()) 로 처리.
import { createClient } from '@/lib/supabase-server'
import { canManageFinance } from '@/lib/members'
import {
  createInoutRecord,
  createInoutRecords,
  updateInoutRecord,
  deleteInoutRecord,
  deleteInoutRecords,
  patchInoutFieldsBulk,
  createAccount,
  createItem,
  updateItem,
  setItemActive,
  reorderItems,
  setInoutReceipt,
} from '@/lib/accounting-db'
import type { InoutInput, InoutPatch, AccountInput, ItemInput, ItemPatch } from '@/lib/accounting-types'
import { revalidatePath } from 'next/cache'

async function isFinanceUser(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return !!user && canManageFinance(user.id)
}

function revalidateAccounting() {
  revalidatePath('/accounting')
  revalidatePath('/accounting/entry')
  revalidatePath('/accounting/ledger')
  revalidatePath('/accounting/report')
  revalidatePath('/accounting/assets')
}

export async function saveInout(input: InoutInput): Promise<{ ok: boolean; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, error: '권한이 없습니다' }
  const res = await createInoutRecord(input)
  if (res.ok) revalidateAccounting()
  return res
}

export async function updateInout(
  id: string,
  input: InoutInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, error: '권한이 없습니다' }
  if (!id) return { ok: false, error: '대상 거래가 없습니다' }
  const res = await updateInoutRecord(id, input)
  if (res.ok) revalidateAccounting()
  return res
}

export async function deleteInout(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, error: '권한이 없습니다' }
  if (!id) return { ok: false, error: '대상 거래가 없습니다' }
  const res = await deleteInoutRecord(id)
  if (res.ok) revalidateAccounting()
  return res
}

// 일괄 생성(CSV 일괄 입력) — 매핑·검증된 거래들을 한 번에 insert(source=csv). 전부 성공/전부 실패.
export async function bulkCreateInout(
  items: InoutInput[],
): Promise<{ ok: boolean; done: number; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, done: 0, error: '권한이 없습니다' }
  if (items.length === 0) return { ok: false, done: 0, error: '저장할 거래가 없습니다' }
  const res = await createInoutRecords(items.map((it) => ({ ...it, source: it.source ?? 'csv' })))
  if (res.done > 0) revalidateAccounting()
  return res
}

// 일괄 삭제 — 선택 거래들을 한 번에 삭제.
export async function bulkDeleteInout(
  ids: string[],
): Promise<{ ok: boolean; done: number; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, done: 0, error: '권한이 없습니다' }
  if (ids.length === 0) return { ok: false, done: 0, error: '선택된 거래가 없습니다' }
  const res = await deleteInoutRecords(ids)
  if (res.done > 0) revalidateAccounting()
  return res
}

// 일괄 수정(통합 수정) — 선택 거래들의 항목/계좌만 부분 변경. targets 의 gubun 은 구 시그니처 호환(미사용).
export async function bulkPatchInout(
  targets: { id: string; gubun: '수입' | '지출' }[],
  patch: InoutPatch,
): Promise<{ ok: boolean; done: number; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, done: 0, error: '권한이 없습니다' }
  if (targets.length === 0) return { ok: false, done: 0, error: '선택된 거래가 없습니다' }
  const hasAny =
    !!patch.itemId ||
    !!patch.accountId ||
    !!patch.date ||
    patch.name != null ||
    patch.vendor != null ||
    patch.supporterId !== undefined ||
    (patch.rate != null && patch.rate > 0)
  if (!hasAny) return { ok: false, done: 0, error: '변경할 값을 하나 이상 입력하세요' }
  const res = await patchInoutFieldsBulk(
    targets.map((t) => t.id),
    patch,
  )
  if (res.done > 0) revalidateAccounting()
  return res
}

// 계좌 추가 — acct_accounts 에 1건 생성(입금·지불 공용). 성공 시 요약·기록 콤보 즉시 반영.
export async function saveAccount(input: AccountInput): Promise<{ ok: boolean; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, error: '권한이 없습니다' }
  const res = await createAccount(input)
  if (res.ok) revalidateAccounting()
  return res
}

// 항목(분류) 추가 — 입력 폼·승인대기에서 즉석 생성. 성공 시 콤보 즉시 반영(revalidate) + 새 id 반환.
export async function saveItem(input: ItemInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, error: '권한이 없습니다' }
  const res = await createItem(input)
  if (res.ok) {
    revalidateAccounting()
    revalidatePath('/accounting/inbox')
  }
  return res
}

// ===== 항목 관리 =====

function revalidateItems() {
  revalidateAccounting()
  revalidatePath('/accounting/inbox')
}

export async function editItem(id: string, patch: ItemPatch): Promise<{ ok: boolean; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, error: '권한이 없습니다' }
  const res = await updateItem(id, patch)
  if (res.ok) revalidateItems()
  return res
}

export async function toggleItem(id: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, error: '권한이 없습니다' }
  const res = await setItemActive(id, active)
  if (res.ok) revalidateItems()
  return res
}

export async function saveItemOrder(ids: string[]): Promise<{ ok: boolean; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, error: '권한이 없습니다' }
  const res = await reorderItems(ids)
  if (res.ok) revalidateItems()
  return res
}

// ===== 영수증 =====

// 영수증 교체(path) 또는 제거(null) — 이전 파일은 서버에서 삭제.
export async function setReceipt(id: string, path: string | null): Promise<{ ok: boolean; error?: string }> {
  if (!(await isFinanceUser())) return { ok: false, error: '권한이 없습니다' }
  const res = await setInoutReceipt(id, path)
  if (res.ok) revalidateAccounting()
  return res
}
