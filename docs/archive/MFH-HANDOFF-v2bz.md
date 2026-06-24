# MFH 핸드오프 v2bz (세션 종료)

> 이전: `v2by`(일지 모듈 재디자인 + 상단 여백 정리). 이번 세션: **앱 전역 디자인 통합 대규모 진전** — 프로젝트 목록·상세·입력 폼 재디자인, To-Do 드래그앤드롭(@dnd-kit), 작성자(author) 전면 제거, 할일 목록 프로젝트 카드화, **Airbnb 정통 디자인 방향 확립**. 앱 `3.2.0` 유지(디자인 통합 묶음 — [[mfh-design-pass-version-pin]]).

---

## 현재 위치 (한 줄)

프로젝트 모듈(목록·상세·입력) + **할일 목록**까지 새 지침 완료. **다음 = 할일 상세(`tasks/[id]`) + 할일 입력 폼(`TaskForm`)** 을 프로젝트 상세·입력 패턴으로 재디자인(아직 옛 톤).

---

## 이번 세션 여정 (커밋 순, 모두 main 푸시 완료)

1. **달력 상단 여백**(`051af63`): `py-8`→`pb-8`(전역 정리 누락분).
2. **프로젝트 목록**(`391a711`~`e816016`): `.app-theme` 통합 + 카드 soft shadow → 별표를 Status 위/뒤 실험 끝에 **Status 칩 앞 인라인 12px**(`ImportanceStars size="md"`) → 완료 토글을 메타칩 줄 우측으로(별표 단독줄 제거).
3. **프로젝트 상세**(`d648da3`~`706c2b4`): `.app-theme` 통합(마룬→잉크 자동) → 헤더 여러 차례 재구성 끝에 **제목+날짜(`( YY.MM.DD )`) 중앙 그룹** + 좌 `‹목록`(마룬 아이콘만 `icon-accent`) + 우 세로 네비(1/7 위 + 큰 `[‹][›]` 40px, `DetailNav variant="pad"`). DESCRIPTION·PROGRESS **마룬레드**(`text-accent`), 진행률 링 **마룬레드**(`Progress.tsx` accent), 개요 17·진행 19px, 할일추가·수정·삭제 **뱃지화**, 우선순위("보통") 메타칩에서 제거.
4. **To-Do 드래그앤드롭**(`b32f578`): `@dnd-kit` 설치 → `ProjectTaskList` ↑↓ → 좌측 그립(⋮⋮) DnD(모바일 롱프레스 200ms, sort_order 0..n 일괄저장), **선행/후속 문구 삭제**.
5. **작성자(author) 전면 제거**(`b06a9b9`): 프로젝트·할일의 입력 폼 `AuthorSelect`, 목록·상세 `AuthorBadge`, 필터 작성자 칩, 표시용 `membersMap`·`getMembersMap` 제거(8파일). **`user_id`·`canEditEntry`(소유권/RLS)는 보존**. ⚠ `fAuthor` 필터 로직(`lib/projectFilter.ts`·`taskFilter.ts` + 컴포넌트 상태)은 **빈값으로 비활성만** — 죽은 코드 잔존(추후 정리).
6. **상단 여백**(`7dc7c77`): qt·photos·facebook·honduras·intercessions `py-8`→`pb-8`(portfolio는 이미 정리됨).
7. **프로젝트 입력 폼**(`0242db4`): `ProjectForm` 전체 재작성 — **app-theme + 1차 시안(영문 캡스 라벨) + Airbnb 절제**. 2카드→1카드, 순서 **제목→설명→[시작·마감]→[중요도·상태]→사역분류→첨부**, 설명 **auto-grow**(`[field-sizing:content]`), 라벨=한글 medium 잉크 + 영문캡스 마룬.
8. **할일 목록 프로젝트화**(`9de9330`~`946f64a`): `tasks/page` app-theme, **`TaskCheck` 초록→마룬 사각**(공통 — 할일 상세·프로젝트 상세 To-do 모두 적용), 카드=프로젝트 레이아웃(흰+shadow / 좌측 긴급도밴드 / `★-Status-장소`+완료 우측 / 제목 / 설명 / 하단 `Due date | 연결 프로젝트`), 기한 그룹 헤더 **17px 볼드 잉크**, 사역분류 카드에서 제외, 장소 위치 여러 차례 조정 끝에 **메타칩 줄(Status 뒤)**.

---

## 핵심 메커니즘 (다음 세션 = 할일 상세·입력 필수 이해)

**Airbnb 정통 디자인 방향**(이번 세션 확립 — 우진이 "Airbnb 맞나" 2회 확인):
- app-theme = portfolio-theme.css의 **Stayly/Airbnb 토큰** 이식(색·radius·타이포·그림자). marun accent = 원래 Airbnb 레드핑크 #ff385c 커스텀.
- **입력 폼**: 이모지 없음 · 라벨 절제(medium) · 큰 입력 필드 · accent는 CTA·강조만 · 영문캡스 라벨은 Stayly `type-uppercase` 톤(허용).
- ⚠ **일지 폼(`JournalForm`)은 이모지+bold 라벨** — Airbnb 정통과 다름. 프로젝트 입력 폼은 Airbnb 정통으로 갔으므로 **일지 폼과 톤 불일치**. 차후 통일 결정 필요.

**프로젝트 = 카드/페이지 레이아웃 기준**:
- 카드 = 흰 `bg-surface` + `shadow-[0_4px_18px_-6px_rgba(34,34,34,0.16)]` + 좌측 밴드 + `★-Status-(메타)` 메타칩 줄 + 완료(라벨 `text-accent` 볼드 13px + 토글 마룬 24px) 우측 + 제목 + 설명 + 하단 `Due date(마룬) | 우측정보`.
- **완료 체크 = 마룬 사각**(`border-accent bg-accent rounded-md`), 미완료 `border-[#e6c9cb]`. `ProjectStatusToggle`·`TaskCheck` 동일 톤.
- 상세 헤더 = `‹목록`(BackButton `variant="icon-accent"`) + 제목/날짜 중앙 그룹 + 세로 네비(`DetailNav variant="pad"`). DESCRIPTION/PROGRESS 라벨 = `text-accent`.

**색 체계**(유지): 캔버스 순백 #fff · 잉크 #222 · 마룬레드 #B61821(`text-accent`) · 연틴트 #FAE3E4(`bg-accent-soft`) · 상태색(기능, app-theme 무관) upcoming #F1EFE8/#444 · progress #E6F1FB/#0C447C · done #E1F5EE/#0F6E56.

---

## 다음 세션 (예정 — 우선순위)

1. **할일 상세(`tasks/[id]/page.tsx`)** 재디자인 — 프로젝트 상세 패턴 이식(현재 옛 상단바 `‹ To-Do` + minimal 네비). 헤더 그룹/세로네비, DESCRIPTION/PROGRESS류 마룬, 뱃지화 등.
2. **할일 입력 폼(`TaskForm`)** — 프로젝트 입력 폼(Airbnb 1차) 패턴 이식. 단 TaskForm은 반복·선행/후속·프로젝트연계 등 필드 많음(주의).
3. **fAuthor 죽은 코드 정리** — `lib/projectFilter.ts`·`taskFilter.ts`의 `fAuthor` 필드 + 컴포넌트 잔존 상태 완전 제거.
4. **일지 폼 톤 결정** — 이모지(현행) 유지 vs Airbnb 정통 통일.
5. (차후) 캘린더·사진·중보기도·페이스북 app-theme 통합, 디자인 통합 완료 시 **버전 3.3.0** 결정.

---

## 빌드·검증 함정 (메모리에도 있음)

- **로그인 후 페이지는 preview 캡처 불가** → /projects·/tasks 등은 `npm run build` 통과 + 우진 실기. 디자인은 `mcp__visualize__show_widget` 인라인 목업으로 먼저.
- **PWA SW 캐시**: 실기 시 "앱 완전 종료 후 재실행" 가이드 필수.
- **Dropbox dev stale**: build 로 검증([[mfh-dropbox-dev-hmr-stale]]).
- **`[field-sizing:content]`**: 일지·프로젝트 폼 auto-grow에 사용(최신 CSS, iOS 17.4+/Chrome 123+). 일지 폼이 이미 채택해 통일.
- **버전**: 디자인 통합 동안 3.2.0 고정([[mfh-design-pass-version-pin]]) — 통합 완료 시 일괄 결정.

---

## 백로그
1. 할일 상세·입력 폼(위 1·2) — 다음 세션 1순위.
2. fAuthor 죽은 코드 정리.
3. 일지 폼 톤 통일 결정.
4. 캘린더 → 사진 → 중보기도 → 페이스북 app-theme 통합.
5. 오프라인 3단계(쓰기+동기화) — v2bv 부터 이월.

---

## 워킹트리 메모 (앱 라인 무관, 그대로 둠)
- `flyers/dongsan-2026-07/` — 동산교회 전단지 작업물(앱 외).
- `scripts/measure-usage.ts`, `flyers/.../​_slim_frame.py` — 임시.

*작성: 2026-06-23 세션 종료. 앱 전역 디자인 통합 대규모 진전 — 프로젝트 목록·상세·입력 + To-Do 드래그앤드롭 + 작성자 전면 제거 + 할일 목록 프로젝트화 + Airbnb 정통 방향 확립. 앱 3.2.0 유지. 커밋 `051af63`~`946f64a`(20여 개) 전부 main 푸시·실기 확인. 직전 `v2by` → `docs/archive/`. 다음 1순위 = 할일 상세·입력 폼.*
