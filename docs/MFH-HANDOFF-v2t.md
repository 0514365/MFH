# MFH 핸드오프 — v2-t (2026-05-31)

> Claude Code 경량 핸드오프(A 방식). 코드·git 으로 확인 가능한 것은 제외. repo 밖 상태(Supabase)·의사결정 맥락·다음 작업·열린 결정만.
> 상세 사양 = `MFH-CONTEXT.md` + `MFH-PORTFOLIO-DESIGN.md`. 직전 = `MFH-HANDOFF-v2s.md`.

---

## 0. 한 줄 요약

대형 세션: ① 캘린더 **iOS 목록형 재디자인**(점+주간 막대+목록) + 구독 ICS 피드(할 일만) → ② **2인 멤버 공유 모델**(김우진·서진아, 멤버 읽기/본인 쓰기 RLS + 작성자 배지 + 본인만 수정) → ③ 포트폴리오 편집 소유자 한정 → ④ **중보기도**(공개 방문자 폼 + 멤버 메시지함) → ⑤ **일지↔중보기도 연계**. patch71~75 전부 실행·배포 완료.

---

## 1. repo 밖 상태 (코드로 추적 안 됨 — 꼭 기록)

### Supabase — 이번 세션 실행한 SQL (전부 콘솔 실행 완료)
- **patch71** 구독형 ICS 피드: `calendar_feeds`(user_id PK·token) + RPC `ensure/regenerate_calendar_token`(INVOKER) + `get_calendar_feed(token)`(DEFINER).
- **patch72** `get_calendar_feed` 교체 → **할 일만** 반환(프로젝트 제외).
- **patch73** ⭐ **멤버 공유 모델**: `app_members`(user_id PK·display_name) + `is_member(uid)`(DEFINER) + journal_entries·projects·tasks·insights·year_themes RLS 를 **멤버 읽기 / 본인 쓰기**로 전환.
- **patch74** `intercessions`(중보기도): 멤버 읽기 / anon 작성(길이검증) / 멤버 수정·삭제.
- **patch75** `journal_entries.intercession_id` FK(on delete set null).

### Supabase 데이터 현재값
- **`app_members` 2행**:
  - `6920f3d8-d132-4859-a73f-12b6ce2210c8` = **김우진** (honduras0691@gmail.com) — **포트폴리오 소유자**.
  - `5564d6ee-170c-433a-85e6-62724c3f4b49` = **서진아** (honduras8282@gmail.com).
- 두 계정 모두 Supabase Auth 에 존재(서진아 이번 세션 생성). 같은 DB 공유.
- 기존 데이터는 전부 김우진 소유. `letters` 26건·영상 5건 미등록(이월).
- `year_themes` 2026 = 이사야 43:19 / God Will Make a Way / 주님이 길을 내십니다 (v2s 그대로).

### 권한 모델 (구현된 규칙)
- **읽기**: 멤버(둘)는 일지·프로젝트·할일·인사이트 **전부 열람**.
- **쓰기/수정/삭제**: **본인 것만**(RLS + UI 가드 이중). 남의 항목 편집 URL 직접 진입 시 상세로 redirect.
- **남의 프로젝트에 할 일 추가 가능**(task.user_id=본인, project_id=상대). 일지 연계 드롭다운에 상대 항목 표시(작성자 라벨 `· 이름`).
- **인사이트**: 두 사람 데이터 자동 종합(insights API 가 user_id 필터 없이 RLS 의존).
- **포트폴리오**: 편집(`/portfolio`)은 **김우진만**(`PORTFOLIO_OWNER_ID` 상수 가드). 그 외는 `/p/mfh` 로 redirect.
- **작성자 표시**: `lib/members.ts` getMembersMap + `components/AuthorBadge.tsx`. 목록·상세에 `김우진/서진아` 배지.

### 로컬/배포
- Node v24, `npx tsc --noEmit` + `npm run build` 통과 습관 유지. main push → Vercel auto-build.
- `SITE_URL`·공개 slug = `mfh-snowy.vercel.app/p/mfh` 하드코딩 유지. ICS 호스트는 `window.location.host` 동적.

---

## 2. 이번 세션(v2-t) 한 일

**캘린더**
- 구독 ICS 피드 신설(`lib/ics.ts`·`app/api/calendar/[token]/route.ts`·`CalendarSubscribe.tsx`). 종일 이벤트 통일(타임존 회피). 아이폰 구독 검증 성공. 이후 **할 일만** 전송(patch72).
- **iOS 목록형 재디자인**(`CalendarView.tsx` 전면 재작성, 957→~430줄): 월 그리드=할 일 상태색 **점만**, 그 아래 **선택 주(일~토) 프로젝트 막대 띠**(제목+기간), 하단 **선택 날짜 할 일 목록**(프로젝트 제외). 드래그·주뷰 제거.

**멤버 공유(1단계)**
- patch73 + `lib/members.ts`·`AuthorBadge` + journal/projects/tasks 의 목록·상세·편집에 작성자 배지·본인만 수정 가드. JournalForm 연계 드롭다운 상대 항목 라벨.
- 포트폴리오 편집 소유자 가드(`app/portfolio/page.tsx`).

**중보기도(2단계)**
- patch74 + 공개페이지 하단 네비 숨김(`BottomNav` `/p`) + `PrayerCta`(하단 바) + `/p/[slug]/prayer`(방문자 폼, anon insert) + `/intercessions`(멤버 메시지함: 읽음·삭제) + 홈 "중보기도" 카드(안읽음 배지).

**일지 연계(3단계)**
- patch75 + 메시지함 "일지 쓰기" → `/journal/new?intercession=id` + JournalForm 연계 배너·저장 + 일지 상세 연계 표시.

### 교훈
- **RLS 전환은 트랜잭션 + 멤버 INSERT 선행**: 멤버 0명 상태로 RLS 켜면 본인도 잠김 → patch73 은 begin/commit + 멤버 등록을 맨 앞. placeholder uuid 미교체 시 FK 위반으로 전체 롤백(안전).
- **정책명 모를 때 동적 drop**(DO 블록 + pg_policies)으로 멱등 재작성.
- **anon insert + 멤버 select**: insert 정책 with check(길이검증)만, select 는 is_member. supabase-js `.insert()` 단독은 representation 반환 안 해 anon select 정책과 무관.
- **테이블 의존 코드는 patch 선실행 후 push**(홈 카드 count·일지 intercession_id 저장).

---

## 3. 다음 작업 후보

| # | 후보 | 비고 |
|---|---|---|
| A | 영상 5건 등록 | 이월. 유튜브 URL·카테고리 받으면 CSV 일괄 |
| B | 중보기도 후속 | 스팸 강화(rate limit·승인제·hCaptcha) / 방문자 이메일(선택) / 답례 메시지 / 공개 푸터에 중보기도 진입 위치 조정 |
| C | 멤버 공유 후속 | 프로젝트 상세 안 **남의 할일 완료 토글** 가드(현재 미가드, RLS 가 막아 실패할 수 있음) / 작성자별 색 구분 / 작성자 필터 |
| D | 공개페이지 방문자 수 카운팅 | 이월(Supabase 카운터 vs Vercel) |
| E | 다크모드 / 방명록(중보기도로 일부 대체됨) | 이월 |

---

## 4. 열린 결정사항

- [ ] **service_role 키 회수**(이월 — 코드 미사용).
- [ ] **카카오 OG 캐시 초기화**(이월).
- [ ] 중보기도 **스팸 방지 강화**(현재 길이검증만) — 악용 시 rate limit/승인제.
- [ ] 프로젝트 상세 내 **남의 할일 완료 토글** UI 가드(§3-C).
- [ ] 캘린더 구독 피드: 완료 항목 제외 옵션 / 일지 포함 여부.
- [ ] 호수 2512 중복 라벨 / 편지 표지 비율 / 인앱 뷰어 / 선교사 개별사진 컬럼 정리 / tasks.status CHECK / 성경출처 한글vs영문 — 이월.

---

## 5. 다음 세션 시작 문구(예시)

> "안녕 Claude. MFH 이어서. `docs/MFH-HANDOFF-v2t.md` 기준. 영상 5건 등록 / 중보기도 스팸강화 / 방문자 카운팅 중에서."
