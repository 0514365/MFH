// MFH-MEMBERS-V1
// 멤버(app_members) 이름 조회 — 작성자 배지/라벨 표시에 사용.
import type { SupabaseClient } from '@supabase/supabase-js'

export type MembersMap = Record<string, string> // user_id → display_name

export async function getMembersMap(supabase: SupabaseClient): Promise<MembersMap> {
  const { data } = await supabase.from('app_members').select('user_id, display_name')
  const map: MembersMap = {}
  for (const r of (data ?? []) as { user_id: string; display_name: string }[]) {
    map[r.user_id] = r.display_name
  }
  return map
}
