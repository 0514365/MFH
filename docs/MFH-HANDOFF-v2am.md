# MFH 핸드오프 v2am

> 이전: `v2al`(Phase 5b-1 Web Push 인프라, 검증 대기). 이번: **5b-1 실기기 도달 검증 성공 + 5b-2 cron 자동화 → Phase 5b 완료**. Phase 5(할 일 뱃지) 전체 마무리.

---

## 현재 위치 (한 줄)

**Phase 5 (할 일 앱 아이콘 뱃지) 전체 완료.** 5a(포그라운드 뱃지+iOS 권한 옵트인) + 5b(백그라운드 Web Push: 매일 아침 cron). iOS 실기기 알림 도달 검증 완료(total3/sent3). 다음은 **Phase 4b(L1 무료 규칙 신호)**.

---

## 이번 세션 변경

### 5b-1 검증 성공
- 수동 발송 결과 `{"ok":true,"today":"2026-06-06","total":3,"sent":3,"skipped":0,"removed":0}` → 구독 3기기 전부 발송, iPhone 알림 즉시 도착.

### 트러블슈팅(배포 후 발견·해결) — 교훈
| 증상 | 원인 | 해결 |
|---|---|---|
| curl 401 `unauthorized` | `CRON_SECRET` env 미설정(다른 env는 OK) | Production scope 등록 + **재배포**(env 추가만으론 기존 배포 미반영). 진단용 `GET ?debug=1`(env 존재·길이 boolean) 추가해 확인 |
| curl 빈 500(content-length 0) | `run()`이 try/catch 없이 throw → 빈 500 | `runSafe()`로 감싸 에러를 JSON `detail`로 반환(cron 견고성 + 진단) |
| `detail: Vapid subject is not a valid URL. honduras0691@gmail.com` | `VAPID_SUBJECT`에 이메일만 등록(web-push는 `mailto:`/`https:` 필수) | 코드에서 이메일이면 `mailto:` 자동 보정 |

### 5b-2 cron 자동화
| 파일 | 변경 |
|---|---|
| `vercel.json` | 신규: crons `"0 13 * * *"`(UTC 13:00 = **온두라스 07:00**) → `/api/push/send`. Vercel이 호출 시 `CRON_SECRET` Bearer 자동 첨부 |
| `app/api/push/send/route.ts` | 진단용 `?debug` 분기 **제거**(정리). `runSafe`(에러 JSON)·subject 보정은 유지 |
| `components/BadgeOptIn.tsx` | 배너 문구에 "**매일 아침 마감 알림**" 명시(권한 받을 때 정직) |

- 검증: `npx tsc --noEmit` · `npm run build` 통과.

---

## 우진 액션
- ✅ 환경변수 5개 등록 완료(VAPID public/private, CRON_SECRET, SERVICE_ROLE, SUBJECT는 코드 보정으로 이메일도 OK).
- ✅ patch84 실행 완료. 실기기 도달 검증 완료.
- ⏳ **다음 확인**: 배포 후 Vercel **Cron 탭**에 작업 등록 표시. **다음 온두라스 07:00**에 자동 발송(마감 도래 있을 때만) 도착 확인.

---

## 미결 과제 (우선순위)

| 순위 | 과제 | 상태 |
|---|---|---|
| 1 | **Phase 4b — L1 무료 규칙 신호** — 마감임박·정체·고중요도 미완을 데이터만 칩으로(비서 카드 상단, 비용0) | 대기 |
| 별도 | Next.js/PostCSS audit 취약점(next@16 breaking) — 별도 업그레이드 검토 | 백로그 |
| 최하위 | 선교편지 5-에이전트 팀 피드백 반영 | 보류 |

---

## 운영 메모

- **Phase 5 완료 = SW + Badging API(5a) + Web Push cron(5b).** 매일 온두라스 07:00 "오늘 마감 N건" 알림(마감 0건 스킵) + 아이콘 뱃지.
- iOS Web Push: 16.4+ 홈화면 PWA + 알림 권한 필수. **silent push 불가**(매 push 알림 표시 강제). [[primary-device-ios]].
- service role 키 사용은 `lib/supabase-admin.ts`(서버 전용)뿐. cron 발송에만.
- 푸시 환경변수: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`·`VAPID_PRIVATE_KEY`·`VAPID_SUBJECT`(mailto/https, 이메일이면 코드 보정)·`CRON_SECRET`·`SUPABASE_SERVICE_ROLE_KEY`. **env 변경 후 재배포 필수.**
- 수동 발송(테스트): `curl -X POST .../api/push/send -H "Authorization: Bearer <CRON_SECRET>"`.

---

## 관련 커밋(이번 세션 Phase 5)

- 5a: `feat: app icon badge ...` · `fix: iOS badge opt-in ...`
- 5b-1: `feat: web push infra ...` + 트러블슈팅(`chore: debug ...`, `fix: wrap ... try/catch`, `fix: normalize VAPID subject ...`)
- 5b-2: `feat: daily cron for due-task push + cleanup debug (Phase 5b-2)`
- docs: `docs: handoff v2am — Phase 5b complete`

*작성: 2026-06-06 세션 (Phase 5 할 일 뱃지 완료).*
