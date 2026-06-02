# MFH 핸드오프 — v2-aa (2026-06-02)

> Claude Code 경량 핸드오프(A 방식). 코드·git 으로 확인 가능한 것은 제외. repo 밖 상태(Supabase·드롭박스·API키)·의사결정 맥락·다음 작업·열린 결정 위주.
> 상세 사양 = `MFH-CONTEXT` + `MFH-INSIGHTS-REDESIGN.md` + `MFH-PORTFOLIO-DESIGN.rtfd`. 직전 = `MFH-HANDOFF-v2z.md`.

---

## 0. 한 줄 요약

**(1) 공개 페이지 관리자 복귀 동선 + (2) 사역 영상 인라인 수정.**
① 로그인한 멤버가 공개 포트폴리오(`/p/*`)를 보다가 앱으로 못 돌아오던 문제(앱 껐다 켜기) 해결 → 신설 `OwnerBar`(상단 sticky 마룬 바). **일반 방문자엔 숨김**, 로그인 멤버엔 `← MFH 홈`, **편집 링크는 소유자(우진)만**. (push `f92a359`, 실기기 검증 성공.)
② 등록된 영상의 제목/URL/카테고리/년도를 화면에서 바로 못 고치던 문제 → `VideoEditor` 에 항목별 인라인 "수정" 폼 추가(push `15f211f`). SQL 변경 없음.

---

## 1. repo 밖 상태 (코드로 추적 안 됨)

### Supabase
- **이번 세션 SQL 변경 없음.** 스키마 그대로(직전 v2z 의 patch79-insight-in-letter 까지 반영됨). patch78-clear-insights 는 여전히 미실행(선택).

### API 키 (Vercel 환경변수)
- 변동 없음. `ANTHROPIC_API_KEY` 로컬 `.env.local` 비어 있음(AI 경로 로컬 검증 불가). web_search 죽은 경로 보존 상태 유지.

### 드롭박스 / 배포·git
- 커밋(이번 세션, **push 완료**): `f92a359` feat: owner nav bar on public pages · `15f211f` feat: inline edit for portfolio videos.
- 검증: 매 작업 `npx tsc --noEmit` exit 0 / `npm run build` 통과 후 push. OwnerBar 는 **우진 배포본 실기기 검증 성공**(우진=홈+편집 / 진아=홈만 / 비로그인=숨김 3케이스).
- ※ 이 핸드오프(v2aa) 는 두 작업을 함께 담아 `15f211f` 직후 별도 docs 커밋으로 push.

---

## 2. 이번 세션(v2-aa) 한 일

**문제:** 김우진/서진아가 로그인 상태로 공개 페이지(`/p/[slug]`)에 들어가면 홈/메뉴로 돌아올 링크가 전혀 없음(BottomNav 도 `/p` 에서 숨김) → 앱 강제 종료 후 재진입.

**해결 — `OwnerBar` 신설:**
- `components/OwnerBar.tsx`(MFH-OWNER-BAR-V1): **동기** 서버 컴포넌트, `userId: string | null` prop.
  - `userId` 없으면 `return null` → **일반 방문자에겐 아무것도 안 보임(공개 페이지 그대로 깔끔).**
  - 로그인 멤버: 상단 **sticky(top-0, z-50) 마룬(bg-primary) 바** + `← MFH 홈`(`/`) + `관리자 미리보기` 라벨(≥480px).
  - `포트폴리오 편집`(`/portfolio`) 링크는 **`userId === PORTFOLIO_OWNER_ID`(우진)일 때만**. 진아 등 다른 멤버는 홈 링크만.
- 공개 3페이지에 삽입(각 페이지가 `supabase.auth.getUser()` 로 userId 조달):
  - `app/p/[slug]/page.tsx` — 메인(user 는 이미 조회 중이라 그대로 전달).
  - `app/p/[slug]/videos/page.tsx` — getUser 추가.
  - `app/p/[slug]/prayer/page.tsx` — V2: 동기→**async** 전환 + createClient/getUser 추가.

### 의사결정 맥락
- **표시 방식 = 상단 sticky 바**(플로팅 FAB·헤더 작은 아이콘 대안 중) → "일반인과 우리 구분"이 요구 핵심이라 발견성·구분 명확한 띠 채택.
- **표시 대상 = 로그인한 누구나**(우진+진아 둘 다 홈 복귀 가능). 편집만 소유자 게이트.
- **진아 편집 차단은 이중**: ① OwnerBar 가 편집 링크를 진아에게 숨김(이번) ② `/portfolio` 라우트 가드가 기존부터 비소유자를 `/p/mfh` 로 redirect(`PORTFOLIO_OWNER_ID` 검사, 기존 구현).
- **타입 안전**: async 서버 컴포넌트를 자식으로 쓸 때의 JSX 타입 마찰을 피하려 OwnerBar 를 동기+prop 으로 설계(각 page 가 getUser).

### 사역 영상 인라인 수정 (`app/portfolio/VideoEditor.tsx` V4→V5)
- 문제: 등록된 영상의 제목/URL/카테고리/년도를 화면에서 바로 못 고침(CSV 내보내기→수정→가져오기 우회만 가능).
- 해결: 리스트 항목마다 **`수정` 버튼**(썸네일 버튼 옆) → 인라인 폼(카테고리·년도·제목·URL) → `저장` 시 `portfolio_videos` update + 로컬 state 갱신 + `router.refresh()`.
- 기존 인프라 재사용: `VideoPatch` 타입, `update().eq('id')` 패턴(썸네일·순서변경이 이미 사용), 토글 펼침 UI. **SQL/RLS 변경 없음**(기존 update 정책 그대로).
- 수정 폼과 썸네일 폼은 상호 배타(한 번에 하나만 열림). 검증 = 추가 폼과 동일(제목·URL 필수, http(s)).

---

## 3. 다음 작업 후보

| # | 후보 | 비고 |
|---|---|---|
| A | **번역 (v3 잔여)** | 범위 결정 먼저(① 편지 번역 / ② 공개페이지 다국어 / ③ 앱 UI 다국어). 편지 번역(Anthropic API)이 최소 출발 |
| B | **캘린더 디자인 개선** | v2s 이월(미착수) — 상단 컨트롤 정리 / 셀 가독성 / 마룬 톤. `app/calendar/CalendarView.tsx` |
| C | **F 이월** | 영상 5건 YouTube 등록 / 중보 스팸 강화(rate limit·승인제) / 방문자 카운팅 / **service_role 키 회수** |
| D | **홈 Portfolio 카드 — 진아 분기**(신규, 이번에 발견) | 진아가 홈 `Portfolio` 카드를 누르면 `/portfolio`→공개페이지로 redirect(약간 의아한 UX). 진아껜 카드를 "공개 페이지 보기"로 바꾸거나 라벨 조정 고려 |
| E | letter 단독 AI 생성(선택) | 부활 시 web_search 실동작 검증부터(미검증) |

## 4. 열린 결정사항

- [ ] (신규) 홈 Portfolio 카드를 진아에게 어떻게 보일지(편집 진입 막혀 있으므로 "공개 페이지 보기"가 자연스러움) — 후보 D.
- [ ] web search tool 실동작(미검증) — letter 단독생성 부활 시에만 필요.
- [ ] 번역 범위 미정(A). 캘린더 디자인(B) 미착수.
- [ ] (이월) import API 에러 상세 노출 / service_role 키 회수.

## 5. 다음 세션 시작 문구(예시)

> "안녕 Claude. MFH 이어서. `docs/MFH-HANDOFF-v2aa.md` 기준. 공개 페이지 관리자 복귀 바(OwnerBar)·사역 영상 인라인 수정 완료. 이번엔 **번역**(범위 정하기) 또는 **캘린더 디자인 개선**, 또는 **홈 Portfolio 카드 진아 분기**(후보 D) 가죠."
