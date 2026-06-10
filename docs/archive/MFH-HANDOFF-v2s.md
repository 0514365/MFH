# MFH 핸드오프 — v2-s (2026-05-30)

> Claude Code 경량 핸드오프(A 방식). 코드·git 으로 확인 가능한 마커/파일/패치 이력은 제외(코드가 진실의 원천). 여기엔 **코드만으로 안 드러나는 것**만: repo 밖 상태(Supabase) · 의사결정 맥락 · 다음 작업 · 열린 결정.
> 상세 사양은 `MFH-CONTEXT.md` + `MFH-PORTFOLIO-DESIGN.md`. 직전 = `MFH-HANDOFF-v2r.md`.

---

## 0. 한 줄 요약

**구독형 ICS 캘린더 피드** 구현·배포·실기기 검증 완료(아이폰 "캘린더 구독"에 webcal URL 등록 → 프로젝트·할 일 일정 자동 동기화, 성공 확인). 원래 들어왔던 "캘린더 **디자인** 개선" 은 방향 질문 단계에서 ICS 연동으로 선회 → **디자인 개선은 미착수(다음 작업 후보로 이월)**.

---

## 1. repo 밖 상태 (코드로 추적 안 됨)

### Supabase — 이번 세션 실행한 SQL 패치 (사용자 콘솔 실행 완료)
- **patch71** `supabase/patch71-calendar-feed.sql` — 구독형 캘린더 피드 일체:
  - `calendar_feeds` 테이블(user_id PK, token uuid, created_at) + 소유자 RLS(select/insert/update).
  - RPC `ensure_calendar_token()` (SECURITY **INVOKER**, 로그인 본인 토큰 조회/없으면 발급).
  - RPC `regenerate_calendar_token()` (INVOKER, 토큰 재발급 = 기존 폐기).
  - RPC `get_calendar_feed(p_token uuid)` (SECURITY **DEFINER**, search_path 고정, 토큰→user_id 검증 후 그 사람 projects+tasks 반환). grant: anon, authenticated.
  - **검증됨**: 아이폰에서 구독 → 일정 표시 성공.

### Supabase 데이터 현재값 (v2r 대비 변동 없음)
- `portfolio.donation_info` = `우리은행 1002-349-524757 (김우진)`.
- `year_themes` 2026 행: verse `이사야 43:19` / theme_en `God Will Make a Way` / theme `주님이 길을 내십니다` / quote `내가 광야에 길을, 사막에 강을 내리니` / goals 3개.
- `letters` 26건. **영상 5건 여전히 미등록**(v2r §3-1 그대로 — 유튜브 URL·카테고리 받으면 CSV 일괄).
- `calendar_feeds`: 우진 본인 토큰 1행 발급됨(구독 성공 시점).

### 로컬 환경
- Node v24.x. `npx tsc --noEmit` + `npm run build` 로컬 검증 정상(EXIT=0). push 전 통과 습관 유지.

### 공유 링크 OG / SITE_URL
- v2r 그대로. `SITE_URL` = `https://mfh-snowy.vercel.app` 하드코딩(`app/p/[slug]/page.tsx`). 커스텀 도메인 시 교체.
- ICS 구독 URL 의 host 는 **클라이언트 `window.location.host`** 로 동적 생성(`CalendarSubscribe.tsx`) → 도메인 바뀌어도 자동 추종. 단 이미 구독한 기존 webcal URL 은 옛 호스트로 남음(재구독 필요).

---

## 2. 이번 세션(v2-s) 한 일

**구독형 ICS 캘린더 피드 (신규 기능)**
- 설계 결정: 토큰=신규 `calendar_feeds` 테이블 / RLS 우회=**SECURITY DEFINER RPC**(service_role 키 코드 미사용 — 열린결정 "키 회수" 와 충돌 안 함) / 이벤트=**전부 종일(all-day)**(타임존 버그 차단, 할 일 시각은 제목에 `[오전 9:00]` 표기) / ICS=순수 JS(의존성 0) / UI=`/calendar` 하단 접이식.
- 신규 파일:
  - `lib/ics.ts` — VCALENDAR 빌더(종일 이벤트, 75-octet 폴딩, 텍스트 이스케이프, DTEND exclusive=+1일). `buildICS(events, {calName, dtstamp})`.
  - `app/api/calendar/[token]/route.ts` — GET → `get_calendar_feed` RPC → `text/calendar; charset=utf-8`, `Cache-Control: no-store`. 잘못된 토큰=빈 캘린더. runtime nodejs.
  - `app/calendar/CalendarSubscribe.tsx` — "아이폰 캘린더에 추가" 접이식. mount 시 `ensure_calendar_token` 자동 호출 → webcal 링크/https 복사/재발급. 토큰 유출 경고 문구.
- `app/calendar/page.tsx` — `<CalendarSubscribe />` 범례 아래 삽입.
- git: `feat(calendar): add subscribable ICS feed ...` (commit 3e4e885), main push 완료 → Vercel 배포.

### 교훈
- **로그인 없는 비밀-토큰 피드 = SECURITY DEFINER RPC + search_path 고정 + 토큰 unique index**. service_role 키를 코드에 안 들여도 RLS 우회 조회 가능(CLAUDE.md §5 의 "INVOKER+auth.uid()" 는 로그인 경로용, 토큰 피드는 DEFINER 가 정석).
- **종일 이벤트로 통일하면 타임존 정의를 통째로 회피**(온두라스/한국 TZ 결정 불필요). 시각은 SUMMARY 텍스트로.
- iOS 구독 캘린더는 **주기적 갱신**(15분~수시간) — 앱 변경 즉시 반영 아님(정상).

---

## 3. 다음 작업 후보

| # | 후보 | 비고 |
|---|---|---|
| **A** | **캘린더 디자인 개선** (이번 세션 원래 의도, 미착수) | 후보 방향: ① 상단 컨트롤 3줄(필터/월·주+오늘/‹제목›) → 한 줄 정리 ② 월간 셀 가독성(높이·여백·오늘/주말/선택 강조) ③ 막대·카드 색·라운드·상태 표현 ④ 브랜드 마룬 톤 업그레이드. `app/calendar/CalendarView.tsx`(957줄, 메인 UI) + `lib/palette.ts` |
| B | 영상 5건 등록 | v2r §3-1 그대로. 유튜브 URL 5개 + 카테고리 받으면 CSV 일괄(`/portfolio` → 사역 영상 → CSV 가져오기) |
| C | 공개페이지 방문자 수 카운팅 | Supabase 카운터 + SECURITY DEFINER RPC + 비콘 + localStorage dedupe, 관리에서만 표시 (대안 Vercel Analytics) |
| D | 다크모드 | palette dark 토큰 + Tailwind dark variant |
| E | 포트폴리오 방명록 | guestbook + 승인제 + rate limit |

### ICS 피드 후속(선택)
- 완료 항목 피드 제외 옵션(현재 done 도 포함).
- 할 일 시각 이벤트화(현재 종일+제목표기) — 원하면 TZID 정의 후.
- 일지(journal) 도 피드에 포함할지.

---

## 4. 열린 결정사항 (v2r 이월 + 갱신)

- [ ] **service_role 키 회수** (이월 — ICS 는 코드에서 안 썼으므로 회수해도 무방. import 끝났으니 Reset 권장).
- [ ] **카카오 OG 캐시 초기화** (이월 — `https://developers.kakao.com/tool/clear/og` 에 `/p/mfh`).
- [ ] 방문자 카운팅 방식 확정(§3-C): A(Supabase) vs B(Vercel), 표시 위치, 순방문 범위.
- [ ] 호수 2512 중복 라벨 / 편지 표지 비율 잘림 / 편지·영상 인앱 뷰어 / 선교사 개별 사진 DB 컬럼 잔존 / 다크모드 / `tasks.status` CHECK / 성경출처 한글vs영문 — 전부 이월.

---

## 5. 다음 세션 시작 문구(예시)

> "안녕 Claude. MFH 이어서. `docs/MFH-HANDOFF-v2s.md` 기준. **캘린더 디자인 개선**(상단 컨트롤 정리 / 월간 셀 가독성 / 막대·카드 스타일) 들어가자. 또는 영상 5건 등록부터."
