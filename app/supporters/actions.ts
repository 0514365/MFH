'use server'
// MFH-SUPPORTERS-ACTIONS-V1
// 후원자 노션 동기화 server action — 마스터 권한 확인 후 노션 후원자 DB upsert/archive. 앱(Supabase)이 SoT, 노션은 헌금 연결용 미러.
import { createClient } from '@/lib/supabase-server'
import { isMaster } from '@/lib/members'
import { upsertSupporterToNotion, archiveSupporterInNotion } from '@/lib/notion'
import type { Supporter } from '@/lib/types'

async function isMasterUser(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return !!user && isMaster(user.id)
}

export async function syncSupporter(s: Supporter): Promise<{ ok: boolean; error?: string }> {
  if (!(await isMasterUser())) return { ok: false, error: '권한이 없습니다' }
  return upsertSupporterToNotion(s)
}

export async function unsyncSupporter(appId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await isMasterUser())) return { ok: false, error: '권한이 없습니다' }
  if (!appId) return { ok: false, error: '대상 후원자가 없습니다' }
  return archiveSupporterInNotion(appId)
}
