# MFH 핸드오프 v2al

> 이전: `v2ak`(Phase 5a 할 일 앱 아이콘 뱃지 + iOS 권한 옵트인). 이번: **Phase 5b-1 — Web Push 인프라 구축·배포**(실기기 도달 검증 대기). VAPID·구독 테이블·SW push 핸들러·구독/발송 API·service role 도입.

---

## 현재 위치 (한 줄)

Phase 5b-1 **Web Push 인프라 배포 완료, iOS 실기기 도달 검증 대기**. 검증되면 **5b-2(Vercel cron 매일 아침 자동 발송)**. 미검증이면 도달 디버깅.

---

## 이번 세션 변경 (5b-1)

**전제(확정)**: iOS는 **push 마다 visible notification 표시가 강제**(silent 불가, 미표시 시 Safari가 구독 취소). → 5b는 "**매일 아침 알림 1개 + 뱃지 갱신**". 우진 결정: **매일 아침(마감 있을 때만) · 온두라스 07:00 · 5b-1 먼저**.

| 파일 | 신규/수정 | 내용 |
|---|---|---|
| `supabase/patch84-push-subscriptions.sql` | 신규 | `push_subscriptions`(user_id·endpoint·p256dh·auth, unique(user_id,endpoint)) + RLS(본인만) |
| `lib/supabase-admin.ts` | 신규 | service role 클라이언트(서버 전용, RLS 우회). cron 발송이 전체 사용자 조회에 사용 |
| `lib/push-client.ts` | 신규(client) | `subscribePush()`: VAPID 구독 → `POST /api/push/subscribe` 저장. 미지원·미설정·실패 시 조용히 false |
| `app/api/push/subscribe/route.ts` | 신규 | 인증 사용자 구독 upsert(onConflict user_id,endpoint) |
| `app/api/push/send/route.ts` | 신규 | `CRON_SECRET`(Bearer) 보호. service role로 전체 구독 조회 → 사용자별 마감도래(온두라스 today) 계산 → count>0만 발송(0건 스킵) → 410/404 구독 정리 |
| `public/sw.js` | 수정(V2) | `push`: `showNotification`(iOS 필수) + `setAppBadge`. `notificationclick`: `/tasks` 포커스/오픈 |
| `components/BadgeSync.tsx` | 수정 | 권한 granted면 마운트 시 `subscribePush()` 자동 구독 보장 |
| `components/BadgeOptIn.tsx` | 수정 | "뱃지 켜기" 권한 허용 직후 `subscribePush()` |

- 의존성: `web-push`(+ `@types/web-push`) 추가. `package-lock.json` 추적 시작.
- 검증: `npx tsc --noEmit` · `npm run build` 통과(`/api/push/send`·`/api/push/subscribe` 등록 확인).
- 발송 페이로드: `{ title:'오늘의 할 일', body:'마감 도래 N건이 있습니다.', badge:N }`.

---

## 환경변수 (우진 Vercel 등록 완료)

| 이름 | 용도 |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 클라 구독용 공개키(빌드타임 주입) |
| `VAPID_PRIVATE_KEY` | 서버 발송 서명(비밀) |
| `CRON_SECRET` | 발송 API 보호(Vercel cron이 Bearer 자동 첨부) |
| `SUPABASE_SERVICE_ROLE_KEY` | service role(서버 전용, 비밀) |
| `VAPID_SUBJECT` (선택) | 발신 식별 mailto/URL. 기본값 `mailto:noreply@mfh.app` |

- patch84 Supabase 실행 완료.

---

## 우진 액션 — 5b-1 실기기 도달 검증

1. 배포 후 앱에서 **"뱃지 켜기"**(권한 허용 → 구독 등록). 마감 지난 미완료 할 일 1개 생성.
2. Mac 터미널 수동 발송:
   `curl -X POST "https://<앱URL>/api/push/send" -H "Authorization: Bearer <CRON_SECRET>"`
   - 응답 예: `{ ok:true, today, total, sent, skipped, removed }`. `sent>=1`이면 발송됨.
3. iPhone에 **알림 + 아이콘 뱃지** 도착 확인 → 5b 핵심 검증. 도착하면 5b-2로.
4. 안 오면: 응답 JSON(sent/skipped/removed) + iOS 알림 설정 확인. (구독 0이면 total=0)

---

## 미결 과제 (우선순위)

| 순위 | 과제 | 상태 |
|---|---|---|
| 1 | **Phase 5b-2 — cron 자동화** — `vercel.json` crons `0 13 * * *`(온두라스 07:00)→`/api/push/send`. + 권한 배너 문구를 "알림 동반"으로 보강 | 5b-1 검증 후 |
| 2 | **Phase 4b — L1 무료 규칙 신호** — 마감임박·정체·고중요도 미완을 데이터만 칩으로(비용0) | 대기 |
| 별도 | Next.js/PostCSS audit 취약점(next@16 breaking) — 5b와 무관, 별도 업그레이드 검토 | 백로그 |
| 최하위 | 선교편지 5-에이전트 팀 피드백 반영 | 보류 |

---

## 운영 메모

- **service role 키 최초 도입**(`lib/supabase-admin.ts`). 서버 전용, cron 발송에만. 클라이언트 import 금지.
- iOS Web Push: 16.4+ 홈화면 PWA + 알림 권한 필수. silent push 불가(매 push 알림 표시). [[primary-device-ios]] 참고.
- Vercel Hobby cron은 **하루 1회 빈도·지정시각 ±편차** — 매일 아침 1회는 가능.
- 비용 0(web-push·VAPID·cron 무료, AI 없음).

---

## 관련 커밋

- `feat: web push infra for due-task badge (Phase 5b-1)` — 코드 + web-push 의존성
- `docs: handoff v2al — Phase 5b-1 web push infra` — 이 문서

*작성: 2026-06-06 세션 (Phase 5b-1 Web Push 인프라).*
