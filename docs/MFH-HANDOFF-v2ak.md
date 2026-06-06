# MFH 핸드오프 v2ak

> 이전: `v2aj`(Phase 4a 비서 + 인사이트 카드 UX + LENS 파싱 수정). 이번: **Phase 5a — 할 일 앱 아이콘 뱃지(포그라운드)** 완료·배포. **서비스워커 최초 도입.**

---

## 현재 위치 (한 줄)

Phase 5a **할 일 앱 아이콘 뱃지(포그라운드) 완료·배포**. PWA에 **서비스워커 첫 도입** + Badging API로 "마감 도래 미완료" 수를 아이콘 뱃지에 표시. 다음은 **Phase 5b(백그라운드 Web Push)** 또는 Phase 4b.

---

## 이번 세션 변경

### Phase 5a — 할 일 앱 아이콘 뱃지 (포그라운드)

**뱃지 정의**: 마감 도래 미완료 = `done=false AND due_date IS NOT NULL AND due_date <= 오늘(기기 로컬)`. 0이면 뱃지 제거.

| 파일 | 신규/수정 | 내용 |
|---|---|---|
| `public/sw.js` | 신규 | 최소 서비스워커(`skipWaiting`+`clients.claim`, fetch 미가로채기). 5b용 `push` 핸들러는 주석 자리만 |
| `lib/badge.ts` | 신규 | `fetchDueCount`(마감≤오늘·미완료, `count:'exact'`+`head:true`로 경량) · `refreshAppBadge`(미지원·비로그인 no-op) · `requestBadgeRefresh`(커스텀 이벤트) · `BADGE_EVENT` |
| `components/BadgeSync.tsx` | 신규(client) | SW 등록 + (마운트·`visibilitychange` 복귀·`BADGE_EVENT`) 때 `setAppBadge/clearAppBadge`. layout 전역 1회 마운트 |
| `app/layout.tsx` | 수정 | `<BadgeSync/>` 추가 |
| `app/tasks/TaskCheck.tsx` | 수정 | 단건 완료 토글 성공 후 `requestBadgeRefresh()` |
| `app/tasks/TasksListClient.tsx` | 수정 | 일괄 완료/삭제(`runBulk`·`runDelete`) 후 `requestBadgeRefresh()` |

### 설계 포인트

- **타임존**: 기기 로컬 자정 기준 `today`(YYYY-MM-DD)를 클라이언트에서 계산 → 서버(UTC) 어긋남 없음.
- **갱신 트리거**: ① 앱 진입 ② 홈→앱 복귀(visibilitychange) ③ 완료/일괄/삭제 직후 커스텀 이벤트. `router.refresh()`는 서버 컴포넌트만 리렌더라 클라이언트 전역 BadgeSync는 리마운트 안 됨 → 커스텀 이벤트 필요.
- **미지원 기기**: `'setAppBadge' in navigator` 없으면 조용히 no-op. try/catch로 호출 실패도 무시.
- **비용 0**: AI·푸시·DB/SQL 변경 전혀 없음. 카운트 쿼리만(head:true 경량, RLS로 본인 것).

### 검증

- ✅ `npx tsc --noEmit` 통과 · ✅ `npm run build` 통과(전 라우트 정상).
- 로컬 미리보기 검증 스킵: Badging API/SW는 *설치된 PWA + 로그인 상태*(특히 iOS 홈화면)에서만 관찰 가능 → localhost 일반 탭 검증 불가. 실기기 확인이 표준.

### Phase 5a 보완 — iOS 뱃지 권한 옵트인 (배포 후 발견·해결)

**증상**: iOS 홈화면 PWA에서 아이콘에 숫자 미표시. **원인**: iOS는 W3C 표준과 달리 **알림 권한이 granted 여야** `setAppBadge`가 홈화면에 표시된다(WebKit). 권한 요청은 사용자 제스처(버튼 클릭) 안에서만 가능 → 자동 요청 불가, "켜기" 버튼 필수. **데스크톱·안드로이드는 권한 없이도 표시** → 이 옵트인은 iOS 전용 대응.

| 파일 | 신규/수정 | 내용 |
|---|---|---|
| `components/BadgeOptIn.tsx` | 신규(client) | 권한 상태 배너: `default`→"뱃지 켜기" 버튼(클릭→`Notification.requestPermission()`→granted 시 즉시 `refreshAppBadge()`), `granted`/미지원→배너 숨김, `denied`→"설정 > 알림" 안내. 초기값 `unsupported`로 hydration 안전 |
| `app/tasks/page.tsx` | 수정 | 헤더 아래 `<BadgeOptIn/>` 배치 |

---

## 우진 액션 (배포 후 iOS 실기기 확인)

1. iOS에서 앱을 **홈화면에 추가**(이미 있으면 재설치 권장 — SW 최초 등록 반영).
2. 할 일 페이지의 **"뱃지 켜기"** 배너를 누르고 **알림 허용**(iOS 필수 — 권한 없으면 숫자 안 뜸).
3. 마감일이 오늘이거나 지난 미완료 할 일을 만들면 → 아이콘에 숫자. 완료 처리 후 나갔다 보면 감소, 0이면 사라짐.
4. ✅ **iOS 권한 필요는 확정·해결됨**(WebKit 제약). 권한 허용 후 즉시 표시.

---

## 미결 과제 (우선순위)

| 순위 | 과제 | 상태 |
|---|---|---|
| 1 | **Phase 5b — 백그라운드 뱃지(Web Push)** — 앱이 닫혀 있어도 매일 아침 푸시로 뱃지 갱신. VAPID 키(Vercel env)·`push_subscriptions` 테이블+RLS(patch)·구독 등록 API/UI·발송 API·Vercel cron·SW `push` 핸들러. iOS 16.4+ PWA + 알림 권한 필요 | 대기 |
| 2 | **Phase 4b — L1 무료 규칙 신호** — 마감임박·정체·고중요도 미완을 데이터만으로 계산해 비서 카드 상단 칩으로(AI·비용 0) | 대기 |
| 최하위 | 선교편지 5-에이전트 팀에 피드백 분석 반영 | 보류(우진 지시: 제일 마지막) |

---

## 운영 메모

- **서비스워커 최초 도입**(`public/sw.js`). 현재는 뱃지 토대용·fetch 미가로채기(오프라인 캐싱 없음). 5b에서 `push` 핸들러 추가.
- 뱃지는 **설치된 PWA**에서만 보임. iOS는 16.4+ 홈화면 추가 PWA 한정. 데스크톱 Mac Safari는 뱃지 미지원(Chrome/Edge는 지원).
- 슬래시 3종: `/insight-update`(7도메인·매일) · `/caption-update`(캡션·수동) · `/assistant-update`(비서·수동).

---

## 관련 커밋

- `feat: app icon badge for due tasks (Phase 5a)` — 코드 6파일
- `docs: handoff v2ak — Phase 5a app icon badge` — 이 문서
- `fix: iOS badge opt-in via notification permission (Phase 5a)` — BadgeOptIn 배너
- `docs: handoff v2ak — add iOS badge opt-in` — 이 보강

*작성: 2026-06-06 세션 (Phase 5a 할 일 앱 아이콘 뱃지).*
