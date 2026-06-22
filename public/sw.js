// MFH-SW-V5 — 서비스워커: 앱 아이콘 뱃지 + Web Push + 오프라인 캐싱(앱셸).
// V5: 오프라인 지원(2단계 읽기). install 시 /offline 셸을 precache 하고, fetch 에서
//     ① navigation(페이지 이동) = network-first → 실패 시 캐시된 /offline 폴백(흰화면 방지)
//     ② 정적 자산(_next/static·아이콘·폰트) = cache-first(런타임 적재, 해시 파일명이라 안전)
//     ③ /api·비GET·교차출처 = 미관여(네트워크 그대로).
//   ※ V3 회귀 주의: navigate 요청은 반드시 fetch(request) 를 "그대로" 호출한다.
//     (V3 는 navigate 에 init 옵션을 줘 일부 PWA 에서 로그인/이동이 깨졌고 V4 에서 핸들러를
//      통째로 제거했다 — V5 는 init 없이 올바르게 재도입한다.)

const CACHE = 'mfh-cache-v5'
const APP_SHELL = ['/offline']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE)
        await cache.addAll(APP_SHELL)
      } catch (e) {
        // precache 실패(설치 시 오프라인 등)는 무시 — 런타임 fetch 에서 다시 채워진다.
      }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 이전 버전 캐시 정리(mfh-cache-v4 등) → 현재 CACHE 만 남긴다.
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // 교차출처(폰트 CDN 등) 미관여
  if (url.pathname.startsWith('/api/')) return // API 는 항상 네트워크(캐시 금지)

  // ① 페이지 이동: network-first → 실패하면 캐시된 /offline 셸로 폴백.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req) // ※ init 옵션 금지(V3 회귀 방지) — 요청을 그대로 전달.
        } catch (e) {
          const cached = await caches.match('/offline')
          return cached || Response.error()
        }
      })(),
    )
    return
  }

  // ② 정적 자산: cache-first(해시 파일명이라 불변 — 한 번 받으면 오프라인에서 앱이 뜬다).
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    /\.(?:css|js|woff2?|ttf|png|jpe?g|webp|svg|ico)$/.test(url.pathname)
  if (isStatic) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req)
        if (cached) return cached
        try {
          const res = await fetch(req)
          if (res && res.ok) {
            const copy = res.clone()
            const cache = await caches.open(CACHE)
            await cache.put(req, copy)
          }
          return res
        } catch (e) {
          return Response.error()
        }
      })(),
    )
    return
  }
  // 그 외(동적 데이터 등): 미관여 — 브라우저 기본 동작.
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
