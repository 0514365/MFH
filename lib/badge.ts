// MFH-BADGE-V2 — 뱃지 = 할 일 마감 도래 + (재정 관리자) 회계 승인대기(카드 문자 + 반복 기록). 서버 푸시도 같은 합계(lib/badge-server).
// MFH-BADGE-V1 — 할 일 앱 아이콘 뱃지(Badging API) 헬퍼 (Phase 5a)
// 뱃지 정의: 마감 도래 미완료 = done=false AND due_date <= 오늘(기기 로컬)
import { createClient } from '@/lib/supabase-browser'
import { canManageFinance } from '@/lib/members'

// 완료/추가/삭제 등 변경 직후 호출하면 BadgeSync 가 듣고 뱃지를 갱신한다.
export const BADGE_EVENT = 'mfh:badge-refresh'

// 기기 로컬 자정 기준 오늘 (YYYY-MM-DD). 서버(UTC) 대신 클라이언트에서 계산해 타임존 어긋남을 막는다.
function todayLocalISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 마감 도래 미완료 개수. 비로그인·오류 시 null(뱃지 변경 안 함).
export async function fetchDueCount(): Promise<number | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { count, error } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('done', false)
    .not('due_date', 'is', null)
    .lte('due_date', todayLocalISO())
  if (error) return null
  if (!canManageFinance(user.id)) return count ?? 0
  // 회계 승인대기 — 실패(권한 등)는 0 으로(할 일 뱃지는 살린다).
  const [card, rec] = await Promise.all([
    supabase.from('card_tx_inbox').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('acct_recurring_due').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])
  return (count ?? 0) + (card.count ?? 0) + (rec.count ?? 0)
}

// 앱 아이콘 뱃지 갱신. Badging API 미지원 기기에서는 조용히 무동작.
export async function refreshAppBadge(): Promise<void> {
  if (typeof navigator === 'undefined') return
  const nav = navigator as Navigator & {
    setAppBadge?: (count?: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
  if (!nav.setAppBadge) return
  const count = await fetchDueCount()
  if (count === null) return
  try {
    if (count > 0) await nav.setAppBadge(count)
    else await nav.clearAppBadge?.()
  } catch {
    // iOS 등 일부 환경에서의 호출 실패는 무시한다.
  }
}

// 변경 직후 뱃지 갱신을 요청한다(BadgeSync 가 수신).
export function requestBadgeRefresh(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(BADGE_EVENT))
}
