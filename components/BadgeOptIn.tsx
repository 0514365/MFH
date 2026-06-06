'use client'

// MFH-BADGE-OPTIN-V1 — iOS 할 일 아이콘 뱃지 권한 옵트인 (Phase 5a 보완)
// iOS는 알림 권한이 granted 여야 setAppBadge 가 홈화면 아이콘에 표시된다(WebKit).
// 권한 요청은 사용자 제스처(버튼 클릭) 안에서만 가능하므로 "켜기" 버튼을 제공한다.
// 권한 granted/미지원이면 배너를 숨기고, denied 면 설정 안내를 보여준다.
import { useEffect, useState } from 'react'
import { refreshAppBadge } from '@/lib/badge'

type Perm = 'unsupported' | 'default' | 'granted' | 'denied'

export default function BadgeOptIn() {
  const [perm, setPerm] = useState<Perm>('unsupported')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // SSR/미지원 기기(iOS Safari 탭 등)에서는 'unsupported' 그대로 → 배너 숨김(hydration 안전).
    if (typeof navigator === 'undefined') return
    if (!('setAppBadge' in navigator) || typeof Notification === 'undefined') return
    setPerm(Notification.permission)
  }, [])

  if (perm === 'unsupported' || perm === 'granted') return null

  async function enable() {
    if (busy || typeof Notification === 'undefined') return
    setBusy(true)
    try {
      const result = await Notification.requestPermission()
      setPerm(result)
      if (result === 'granted') await refreshAppBadge()
    } catch {
      // 권한 요청 실패는 무시.
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-5 rounded-2xl border border-line bg-surface px-4 py-3">
      {perm === 'denied' ? (
        <p className="text-sm leading-relaxed text-ink">
          아이폰 <span className="font-semibold">설정 &gt; 알림 &gt; MFH</span>에서 알림을 허용하면 앱 아이콘에
          마감 도래 할 일 수가 표시됩니다.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm leading-relaxed text-ink">
            앱 아이콘에 <span className="font-semibold">마감 도래 할 일 수</span>를 표시할까요?
          </p>
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            뱃지 켜기
          </button>
        </div>
      )}
    </div>
  )
}
