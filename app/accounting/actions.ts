'use server'
// MFH-ACCOUNTING-ACTIONS-V2
// 회계 입력·수정·삭제 server action — 마스터 권한 확인 후 노션 입출금기록 write/update/archive. 노션 SoT.
import { createClient } from '@/lib/supabase-server'
import { isMaster } from '@/lib/members'
import {
  createInoutRecord,
  updateInoutRecord,
  deleteInoutRecord,
  type InoutInput,
} from '@/lib/notion'
import { revalidatePath } from 'next/cache'

async function isMasterUser(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return !!user && isMaster(user.id)
}

export async function saveInout(input: InoutInput): Promise<{ ok: boolean; error?: string }> {
  if (!(await isMasterUser())) return { ok: false, error: '권한이 없습니다' }
  const res = await createInoutRecord(input)
  if (res.ok) revalidatePath('/accounting')
  return res
}

export async function updateInout(
  pageId: string,
  input: InoutInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isMasterUser())) return { ok: false, error: '권한이 없습니다' }
  if (!pageId) return { ok: false, error: '대상 거래가 없습니다' }
  const res = await updateInoutRecord(pageId, input)
  if (res.ok) revalidatePath('/accounting')
  return res
}

export async function deleteInout(pageId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await isMasterUser())) return { ok: false, error: '권한이 없습니다' }
  if (!pageId) return { ok: false, error: '대상 거래가 없습니다' }
  const res = await deleteInoutRecord(pageId)
  if (res.ok) revalidatePath('/accounting')
  return res
}
