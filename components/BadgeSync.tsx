'use client'

// MFH-BADGE-SYNC-V1 — 서비스워커 등록 + 할 일 앱 아이콘 뱃지 동기화 (Phase 5a)
// 전역(layout)에 1회 마운트되어, 앱 진입·복귀·변경 요청 시 마감 도래 미완료 수를 아이콘 뱃지에 반영한다.
import { useEffect } from 'react'
import { BADGE_EVENT, refreshAppBadge } from '@/lib/badge'

export default function BadgeSync() {
  useEffect(() => {
    // 서비스워커 등록(PWA 신뢰성 + 향후 백그라운드 푸시 토대). 실패는 무시.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const run = () => {
      void refreshAppBadge()
    }
    // ① 최초 진입
    run()
    // ② 앱 복귀(홈 → 앱) 시
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)
    // ③ 완료/추가/삭제 등 변경 직후 명시 요청 시
    window.addEventListener(BADGE_EVENT, run)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(BADGE_EVENT, run)
    }
  }, [])

  return null
}
