// MFH-SW-V4 — 서비스워커 (뱃지 + Web Push). 캐시/네비게이션 가로채기 없음.
// V4: V3의 navigation network-first fetch 핸들러 제거 — navigate 모드 요청에
//     init 옵션을 주면 일부 환경(PWA)에서 오류가 나 로그인/페이지 이동이 깨졌다.
//     SW 는 캐시를 만지지 않고(브라우저 기본), PWA 갱신은 앱 레벨로 처리한다.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// iOS 필수: 모든 push 마다 알림을 표시해야 한다(silent 금지 — 미표시 시 Safari 가 구독 취소).
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let data = {}
      try {
        data = event.data ? event.data.json() : {}
      } catch (e) {
        data = {}
      }
      const title = data.title || 'MFH'
      const body = data.body || ''
      const count = typeof data.badge === 'number' ? data.badge : 0
      // payload 가 url/tag 를 주면 사용(QT 알림=/qt, mfh-qt). 없으면 기존 할일 알림 기본값.
      const url = typeof data.url === 'string' ? data.url : '/tasks'
      const tag = typeof data.tag === 'string' ? data.tag : 'mfh-due'

      await self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag,
        data: { url },
      })

      if ('setAppBadge' in self.navigator) {
        try {
          if (count > 0) await self.navigator.setAppBadge(count)
          else await self.navigator.clearAppBadge()
        } catch (e) {
          // 일부 환경의 호출 실패는 무시
        }
      }
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/tasks'
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const c of all) {
        if ('focus' in c) {
          c.focus()
          return
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(url)
    })(),
  )
})
