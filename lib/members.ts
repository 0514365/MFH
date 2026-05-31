// MFH-MEMBERS-V1
// 멤버(app_members) 이름 조회 — 작성자 배지/라벨 표시에 사용.
import type { SupabaseClient } from '@supabase/supabase-js'

// 포트폴리오 소유자(김우진). /portfolio 편집은 이 사람만 접근.
export const PORTFOLIO_OWNER_ID = '6920f3d8-d132-4859-a73f-12b6ce2210c8'
// 공개 포트폴리오 경로(비소유자 redirect 대상).
export const PUBLIC_PORTFOLIO_PATH = '/p/mfh'

export type MembersMap = Record<string, string> // user_id → display_name

export async function getMembersMap(supabase: SupabaseClient): Promise<MembersMap> {
  const { data } = await supabase.from('app_members').select('user_id, display_name')
  const map: MembersMap = {}
  for (const r of (data ?? []) as { user_id: string; display_name: string }[]) {
    map[r.user_id] = r.display_name
  }
  return map
}
