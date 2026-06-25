'use server'
// MFH-ACCOUNTING-ACTIONS-V1
// 회계 입력 server action — 마스터 권한 확인 후 노션 입출금기록에 write. 노션 SoT.
import { createClient } from '@/lib/supabase-server'
import { isMaster } from '@/lib/members'
import { createInoutRecord, type InoutInput } from '@/lib/notion'
import { revalidatePath } from 'next/cache'

export async function saveInout(input: InoutInput): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isMaster(user.id)) return { ok: false, error: '권한이 없습니다' }

  const res = await createInoutRecord(input)
  if (res.ok) revalidatePath('/accounting')
  return res
}
