// MFH-SW-V3 — 서비스워커 (뱃지 + Web Push + 네비게이션 최신화)
// V3: HTML 네비게이션을 network-first(no-store)로 처리해 PWA 가 옛 페이지를
//     잡는 캐시 문제를 막는다(새 배포 즉시 반영). 정적 자산은 브라우저 기본.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// HTML 페이지(navigate) 요청은 항상 네트워크에서 최신으로 — 캐시 무시.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(
        () => caches.match(event.request) || Response.error(),
      ),
    )
  }
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

      await self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'mfh-due',
        data: { url: '/tasks' },
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
