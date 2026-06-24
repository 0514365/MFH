# MFH 핸드오프 v2ca (세션 종료)

> 이전: `v2bz`(프로젝트·할일 디자인 통합 + Airbnb 정통 방향 확립). 이번 세션: **할일 모듈(상세·입력) 완성 + 보조 페이지 app-theme 통합 + 카드/네비 폴리시 + 버그 정리**. 앱 `3.2.0` 유지(디자인 통합 묶음 — [[mfh-design-pass-version-pin]]).

---

## 현재 위치 (한 줄)

할일 모듈(목록·상세·입력) 전부 프로젝트 패턴 완성 + **Photos·Facebook app-theme 통합** + 카드 본문 전체폭(할일·프로젝트)·네비 아이콘화 완료. **다음 = 캘린더·중보기도 app-theme 통합**(디자인 통합 마지막 구간) → 완료 시 버전 `3.3.0` 결정.

---

## 이번 세션 여정 (커밋 순, 모두 main 푸시 완료)

1. **할일 상세 재디자인**(`f463da4`): `tasks/[id]` 를 프로젝트 상세 패턴으로 — `app-theme`, 헤더(`icon-accent` 캐럿 + 제목/마감 중앙 + `pad` 네비), 메타칩(별점·상태·사역분류·**장소칩**)+완료 토글 우측, 순서 상위프로젝트→설명→선행후속, **선행/후속 2열 카드**(쿼리에 `predecessor_ids·successor_ids` 추가 + `.in()` 제목 조회), 푸터 알약.
2. **삭제 버튼 알약화**(`419e7f3`): 할일 상세 `DeleteButton` 밑줄텍스트→danger 알약(프로젝트와 통일).
3. **할일 입력 폼 재디자인**(`18683e3`): `TaskForm` V6 — **2카드→단일카드**, app-theme, 마룬 캡스 라벨, 순서 제목→설명→[마감일·시간]→[반복·장소]→[중요도·상태]→[상위프로젝트·사역분류]→첨부→완료토글. 반복종료일(주기 선택 시)·선행후속(프로젝트 선택 시) **조건부 펼침**. 편집모드는 반복 대신 장소 풀폭.
4. **마감시간·선행후속 버그**(`c3aaabf`): 선행/후속 **상호 배제**(한쪽 선택 시 다른쪽 후보 제외).
5. **LinkedPicker 완료 분리**(`4df9b08`): 상위프로젝트·선행·후속 select→**`LinkedPicker`**(일지와 동일) — 완료 항목 "N개 보기" 토글로 분리.
6. **마감시간 iOS 넘침**(`12c5bda`→최종 `4dd5202`): native `input[type=time]` 너비 버그 → **`components/TimeField.tsx` 신설**(DateField 패턴: native opacity-0 + 보이는 div). 빈칸 크기 일치 + 넘침 해결 + "오후 H:MM" 표시.
7. **Photos app-theme**(`9df9e05`): 월 큰 잉크 제목 + 원형 네비, 분류 헤더 17px semibold, 흰 알약 뱃지, 사진 rounded-2xl, 3열 유지(우진이 Airbnb 검증 → 3열+타이포절제 선택).
8. **Facebook app-theme**(`0ff4e20`): 주차 큰 잉크 제목(한글 포맷), 문구복사 accent 알약, 해시태그 accent, 사진 rounded-2xl.
9. **fAuthor 죽은 코드 정리**(`71d0a8f`): 프로젝트·할일 필터의 작성자(`fAuthor`)·`user_id` 잔존 전부 제거. **일지는 작성자 필터 보존**(살아있음).
10. **완료 할일 '완료' 그룹**(`e21cb06`): `taskGroupOf(dueDate, done)` — 완료된 할일이 마감 지나도 '연체' 대신 **'완료' 그룹**(맨 아래).
11. **UI 폴리시 5건**(`a88ea29`): 할일상세 상위프로젝트·선행후속 라벨 **마룬**(Description 통일) / 설명→상위프로젝트 순서 / 카드 본문 전체폭(완료 우상단 분리) / **네비 텍스트 제거·아이콘 22→28** / 일지상세 수정·삭제 **알약화**.
12. **프로젝트 카드 본문 폭**(`aa0bda3`): 11과 동일하게 `ProjectsList` 카드도 완료 토글 우상단 분리 + 본문 전체폭.

---

## 핵심 메커니즘 (다음 세션 필수 이해)

**app-theme 통합 패턴**(보조 페이지 적용 시):
- `main` 에 `app-theme` 클래스 + `import '../p/portfolio-theme.css'`(깊이 1단계 페이지 기준). PageHeader 도 `app-theme` 안에 둠 — 목록 페이지(projects/tasks)들의 표준이고 제목이 잉크가 됨.
- `.app-theme` 토큰: `--primary = 잉크 검정`(마룬 아님!), `--accent = 레드핑크(#B61821)`. 즉 `text-primary`→자동 잉크, `text-accent`→마룬. 기존 `text-primary`/`bg-primary` 를 의도에 맞게 `text-ink`/`text-accent`/`bg-accent` 로 교체.

**TimeField/DateField 패턴**([components/TimeField.tsx], [app/journal/DateField.tsx]):
- native `<input type=time|date>` 를 **`opacity-0` 으로 덮고**(탭하면 native picker), 보이는 `<div>` 가 값/placeholder 표시. iOS 의 너비 넘침·빈칸 높이 불일치를 근본 회피. 새 날짜/시간 입력은 이 패턴을 쓸 것.

**카드 본문 전체폭 패턴**(할일·프로젝트 목록 카드 동일):
- 완료 토글을 카드 `absolute right-4 top-4 z-10`(선택모드 제외)로 분리. 본문 클릭영역(`flex-1`)은 전체폭, **메타칩 줄만 `reserveDone` prop 으로 `pr-16`**(완료 자리). `TaskBody`/`ProjectBody` 가 `reserveDone?: boolean` 받음.

**LinkedPicker**([components/LinkedPicker.tsx]): 완료/미완료 분리 커스텀 드롭다운(일지·할일 공유). props: value·onChange·activeItems·doneItems·selectedLabel·placeholder·emptyLabel·doneLabel. 완료 판정 = 프로젝트 `status==='done'`, 할일 `done || status==='done'`.

**할일 기한 그룹**([lib/taskGroups.ts]): `taskGroupOf(dueDate, done?)` — done=true 면 'done' 그룹. ORDER 맨 끝에 'done'(완료). 호출부(`taskFilter.orderTaskIds`·`TasksListClient` buckets)는 `taskGroupOf(t.due_date, t.done)`.

**색 체계**(유지): 캔버스 순백 #fff · 잉크 #222 · 마룬레드 accent #B61821(`text-accent`) · 연틴트 #FAE3E4(`bg-accent-soft`) · Airbnb 회색 #717171(부제). 상태색 upcoming #F1EFE8/#444 · progress #E6F1FB/#0C447C · done #E1F5EE/#0F6E56. 별점 yellow-400. 타이포 절제(semibold 600, extrabold 지양 — 우진이 Airbnb 검증 중시 [[mfh-airbnb-authentic-design]]).

---

## 다음 세션 (예정 — 우선순위)

1. **캘린더 app-theme 통합** — Photos·Facebook 패턴 이식(main app-theme + 토큰 색). 디자인은 `mcp__visualize__show_widget` 인라인 목업으로 먼저, 우진 Airbnb 검증 거칠 것.
2. **중보기도 app-theme 통합** — 동일.
3. **일지 폼 톤 결정** — 이모지(현행) 유지 vs Airbnb 정통 통일(프로젝트·할일 폼은 이미 Airbnb 정통).
4. (디자인 통합 완료 시) **버전 3.3.0** 결정 + 핀 해제.

---

## 빌드·검증 함정 (메모리에도 있음)

- **로그인 후 페이지는 preview 캡처 불가** → projects·tasks·photos·facebook·journal 등은 `npm run build` 통과 + 우진 실기. 디자인은 `mcp__visualize__show_widget` 인라인 목업으로 먼저.
- **위젯 목업 주의**: 다크모드 렌더로 입력필드가 검게 보일 수 있음(실제 앱은 라이트 고정) → 폼 요소를 div 로 그려 흰 배경 재현. `<s>` 태그는 취소선이니 영문 라벨엔 `<em>`(text-decoration:none) 사용.
- **PWA SW 캐시**: 실기 시 "앱 완전 종료 후 재실행" 가이드 필수.
- **Dropbox dev stale**: build 로 검증([[mfh-dropbox-dev-hmr-stale]]).
- **버전**: 디자인 통합 동안 3.2.0 고정([[mfh-design-pass-version-pin]]) — 통합 완료 시 일괄 결정.
- **push 규칙**: 우진이 명시적으로 "push/푸시" 라고 할 때만. "A"·"진행" 등은 작업 승인일 뿐 push 아님(분류기가 거부) — 커밋까지 하고 push 는 따로 확인.

---

## 백로그
1. 캘린더 → 중보기도 app-theme 통합(위 1·2) — 다음 1순위.
2. 일지 폼 톤 통일 결정.
3. 디자인 통합 완료 → 버전 3.3.0.
4. 오프라인 3단계(쓰기+동기화) — v2bv 부터 이월.

---

## 워킹트리 메모 (앱 라인 무관, 그대로 둠)
- `flyers/dongsan-2026-07/` — 동산교회 전단지 작업물(앱 외).
- `scripts/measure-usage.ts`, `flyers/.../_slim_frame.py` — 임시.

*작성: 2026-06-24 세션 종료. 할일 상세·입력 폼 완성 + TimeField 신설 + Photos·Facebook app-theme + fAuthor 정리 + 완료 그룹 + 카드 본문폭·네비 아이콘화. 앱 3.2.0 유지. 커밋 `f463da4`~`aa0bda3`(13개) 전부 main 푸시. 직전 `v2bz` → `docs/archive/`. 다음 1순위 = 캘린더·중보기도 app-theme.*
