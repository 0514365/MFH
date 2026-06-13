# MFH 핸드오프 v2bh (세션 종료)

> 이전: `v2bg`(Variant 시안 기반 앱 전반 디자인 리프레시 — 홈·일지). 이번 세션: **Variant 협업으로 프로젝트·할일 상세/입력폼 + 인사이트 홈 리프레시.** 모두 push 완료.

---

## 현재 위치 (한 줄)

**탭바 4모듈(홈·일지·프로젝트·할일) + 인사이트 홈까지 새 디자인 시스템 적용 완료.** 남은 건 인사이트 상세, 그 외 모듈(동향·사진·캘린더·중보기도), 포트폴리오(보류).

## 이번 세션 작업 (모두 push)

작업 방식: **Variant(variant.ai)에서 화면별 시안(HTML) 받아 → 기능 100% 보존하며 비주얼만 이식 → `tsc`+`build` 검증 → `show_widget` 미리보기 → 우진 확인 후 커밋/푸시.**

| 화면 | 커밋 | 핵심 |
|---|---|---|
| 프로젝트 상세 | `dd0e2e8` | 미니멀 상단바 + 메타칩(상태·우선순위·분류·별점·작성자) + 설명 섹션 + 진행 요약 카드(진행링+체크리스트) + 중앙 푸터 |
| 프로젝트 폼 | `6dbd43d` | 미니멀 중앙 헤더 + 2카드(내용/속성·일정) + 한글+영문 마이크로라벨 + SVG 별점(만점3) + 영문캡스 SAVE |
| 헤더 겹침 fix | `bf39a5e` | `BackButton` text variant: label 없으면 캐럿만(폼 헤더 제목 겹침 방지). 프로젝트 폼만 `label=""` |
| 할일 상세 | `91b4866` | 미니멀 상단바 + 메타칩 + 완료체크+제목+마감(연체 red) + 장소/상위프로젝트 카드/메모 섹션 + 푸터(수정·복제·삭제) |
| 할일 폼 | `ee06404` | Var5 2카드(내용/속성·일정) + 반복 배너 + 완료 토글 스위치 + 영문캡스 SAVE |
| 인사이트 홈 | `147303d` | 연주제 칩 + 렌즈 정사각 그리드(기도·균형·열매·편지)+Overall 가로 + 분야별. **사진모아보기 삭제, 보관함 최하단 이동** |
| 인사이트 분야별 fix | `e2d3615` | 일지·프로젝트 카드 라벨 잘림(일/프) → 세로 스택(가로 양끝→세로) |
| Fruit 배지 삭제 | `581a336` | Fruit 카드 "최근 감사·응답 N건" 배지 제거(`homeFruit` 집계도 정리) |

## 디자인 시스템 (v2bg 계승 + 이번 추가)

- 색·타이포·노이즈·**Tailwind opacity 모디파이어 함정**(토큰이 `var(--x)`=hex라 `text-primary/60` 안 먹힘 → `opacity-*` 유틸 또는 흰색 알파)은 v2bg 그대로.
- **상세 패턴**(일지·프로젝트·할일 공통): sticky 미니멀 상단바(‹ 라벨 + `n/total` minimal) + 행분리 헤더(메타칩+제목 26px) + `border-t` 섹션 + 중앙 푸터(수정/삭제).
- **폼 패턴**(일지·프로젝트·할일 공통): 미니멀 중앙 헤더(캐럿 + 중앙 `NEW/EDIT …` font-display 18px) + 24px 카드 묶음(`rounded-3xl border-line shadow-sm`) + `FieldLabel`(한글 muted 13px + 영문캡스 9px) + SVG 별점(채움 `#D4AF37`/빈 line, 만점 `IMPORTANCE_MAX=3`) + 영문캡스 SAVE(`bg-accent py-4`). 작성자(`AuthorSelect`)는 카드 위 단독(편집·마스터만).
- **`BackButton`**: variant="text"에서 `label` 없으면 캐럿만(aria-label 폴백). 프로젝트 폼 헤더가 사용(제목 겹침 방지). 일지 폼은 `label="Log"`(짧아 안 겹침) 유지.
- **별점 만점**: `IMPORTANCE_MAX=3` — 시안의 5칸 별은 항상 3칸으로 보정.
- **할일 고유**: 완료 토글↔상태 연동(`onToggleDone`/`onChangeStatus`), 마감일+시간, 반복(주기·종료일 — new only) 박스, 반복 시리즈 배너(maroon-tint)+범위 모달(`RecurrenceScopeModal`), 상위 프로젝트 카드, 복제. 삭제 라벨은 "삭제"로 통일.
- **인사이트 홈**: 렌즈 카드(maroon-tint 타일+영문 라벨) 2열 그리드 + Overall `col-span-2`(maroon-tint) + 분야별(subtle 타일 — 일지·프로젝트 **세로 스택**/할일 가로 `col-span-2`). 보관함은 최하단 별도 메뉴. **상세 뷰(LensDetail)는 미반영(구버전)**.

## 환경/검증 메모

- **dev preview(`preview_start`)는 Dropbox/CloudStorage 경로 이슈로 안 뜸** → 검증은 `npx tsc --noEmit` + `npm run build`, 시각 확인은 `show_widget` 미리보기. 실기기는 배포(push→Vercel) 후.
- `show_widget` 미리보기는 **Tailwind CDN 차단(CSP)** → 인라인 `style` + MFH hex로 앱 화면 재현(폰트는 fonts.googleapis/jsdelivr 허용).
- 기능 보존 원칙: 필터·정렬·네비·검증·저장·완료토글·반복·권한·삭제 로직 손대지 않고 렌더(JSX/className)만 교체.

## 미해결 / 확인 대기

- **인사이트 홈 상단**: 스크롤 시 연주제 칩이 sticky `PageHeader` 위(상태바 영역)로 흐릿하게 비친다는 우진 실기기 스샷. 분야별 라벨 잘림은 수정 완료. **최상단까지 스크롤했을 때도** 겹치는지 우진 재확인 대기 — 겹치면 `PageHeader`의 safe-area-top(상태바) 처리 필요(공용 컴포넌트라 영향 범위 주의).

## 다음 세션 백로그 (디자인 리프레시 잔여)

1. **인사이트 상세(2단계)** — 렌즈별 집계(분류 비중 막대 / 감사·응답 타임라인) + 인사이트 카드(별점·메모·편지·보관·삭제), 미니멀 상단바. `LensDetail`·`DomainInsightBody`·`InsightCard`(`app/insights/InsightsClient.tsx`) 리스킨. **합본 프롬프트 작성 시 상세용 SCREEN 별도 필요.**
2. **온두라스 동향 · 사진(`/photos`) · 캘린더 · 중보기도** 화면.
3. **포트폴리오 공개 페이지**(`/p/[slug]`) — **보류(우진: 차후 재검토)**.

## 백로그 (이월)

1. **선교편지 실제 발송 호** 제작(미세조정 반영).
2. 인사이트 시각 미세조정 / 스케줄 `honduras-news-0600` first-run 확인.
3. (보류) C3 baseline SQL · C4 postcss · Next 16.

*작성: 2026-06-13 세션 종료. 변경 파일: `app/projects/[id]/page.tsx`·`app/projects/[id]/DeleteButton.tsx`·`app/projects/ProjectForm.tsx`·`app/tasks/[id]/page.tsx`·`app/tasks/[id]/DeleteButton.tsx`·`app/tasks/TaskForm.tsx`·`app/insights/page.tsx`·`app/insights/InsightsClient.tsx`·`components/BackButton.tsx`. 커밋 8건(`dd0e2e8`~`581a336`) 모두 push. DB 변경 없음. 직전 핸드오프 v2bg → `docs/archive/`.*
