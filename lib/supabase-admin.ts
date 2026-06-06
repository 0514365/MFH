// MFH-SUPABASE-ADMIN-V1 — service role 클라이언트 (서버 전용, RLS 우회)
// ⚠️ 절대 클라이언트 컴포넌트에서 import 금지(번들 노출 방지). API 라우트 등 서버에서만 사용.
// 현재 용도: cron 푸시 발송(/api/push/send) — 전체 사용자의 구독·마감 카운트 조회.
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
