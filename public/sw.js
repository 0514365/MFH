// MFH-SW-V1 — 최소 서비스워커 (Phase 5a: 할 일 앱 아이콘 뱃지)
// 현재는 PWA 신뢰성 + 향후 백그라운드 푸시(5b)의 토대 역할만 한다.
// fetch 핸들러를 두지 않아 네트워크는 브라우저 기본 동작을 따른다(오프라인 캐싱 없음).

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Phase 5b 예정: 앱이 닫혀 있을 때도 push 이벤트로 뱃지/알림을 갱신한다.
// self.addEventListener('push', (event) => {
//   event.waitUntil((async () => {
//     const data = event.data ? event.data.json() : {}
//     if (typeof data.badge === 'number' && self.navigator.setAppBadge) {
//       data.badge > 0 ? self.navigator.setAppBadge(data.badge) : self.navigator.clearAppBadge()
//     }
//   })())
// })
