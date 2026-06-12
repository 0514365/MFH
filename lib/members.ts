// MFH-MEMBERS-V1
// 멤버(app_members) 이름 조회 — 작성자 배지/라벨 표시에 사용.
import type { SupabaseClient } from '@supabase/supabase-js'

// 포트폴리오 소유자(김우진). /portfolio 편집은 이 사람만 접근.
export const PORTFOLIO_OWNER_ID = '6920f3d8-d132-4859-a73f-12b6ce2210c8'
// 공개 포트폴리오 경로(비소유자 redirect 대상).
export const PUBLIC_PORTFOLIO_PATH = '/p/mfh'

// 마스터(김우진 = 포트폴리오 소유자): 모든 멤버의 일지·프로젝트·할일을
// 수정·삭제할 수 있는 계정. DB 레벨은 is_master() RLS 가 함께 강제(patch91).
export const isMaster = (uid?: string | null): boolean => uid === PORTFOLIO_OWNER_ID

// 항목 편집·삭제 권한: 본인이 작성했거나(소유자) 마스터면 허용.
export function canEditEntry(ownerId?: string | null, viewerId?: string | null): boolean {
  return !!viewerId && (ownerId === viewerId || isMaster(viewerId))
}

// 저장 시 기록할 작성자(user_id) 결정 — 폼 공통.
// - chosen: AuthorSelect 에서 고른 값(마스터만 채워지고, 일반 멤버는 빈 값).
// - 마스터: chosen 을 그대로 사용(작성자 재지정 가능).
// - 일반 멤버: 편집이면 기존 작성자(existingOwnerId) 유지, 신규면 본인(viewerId).
//   → 마스터 아닌 사람이 남의 글을 편집해도 작성자가 바뀌지 않도록 보장.
export function resolveOwnerId(opts: {
  chosen?: string | null
  existingOwnerId?: string | null
  viewerId: string
}): string {
  return opts.chosen || opts.existingOwnerId || opts.viewerId
}

export type MembersMap = Record<string, string> // user_id → display_name

export async function getMembersMap(supabase: SupabaseClient): Promise<MembersMap> {
  const { data } = await supabase.from('app_members').select('user_id, display_name')
  const map: MembersMap = {}
  for (const r of (data ?? []) as { user_id: string; display_name: string }[]) {
    map[r.user_id] = r.display_name
  }
  return map
}
