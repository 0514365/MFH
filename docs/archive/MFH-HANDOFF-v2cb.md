# MFH 핸드오프 v2cb (세션 종료)

> 이전: `v2ca`(할일 모듈 완성 + Photos·Facebook app-theme + 카드/네비 폴리시). 이번 세션: **캘린더·중보기도 app-theme 통합(디자인 통합 마지막 구간) + 캘린더 헤더 중앙 정렬 + 홈 하트 아이콘 수정**. 앱 `3.2.0` 유지 — 우진 결정 "여기까지 3.2.0 포함"([[mfh-design-pass-version-pin]]).

---

## 현재 위치 (한 줄)

앱 전역 **디자인 통합 전 구간 완료**(일지·프로젝트·할일·Photos·Facebook·**캘린더·중보기도**). 일지 폼은 현행(이모지) 유지 **확정**(추가 작업 없음 — [[mfh-airbnb-authentic-design]]). 버전 `3.2.0` 유지(3.3.0 승격은 우진이 보류). **다음 = 새 기능 구간(백로그: 오프라인 3단계 등) 또는 우진 지시.**

---

## 이번 세션 여정 (커밋 순, 모두 main 푸시 완료)

1. **캘린더 app-theme 통합**(`8607764`): `app/calendar/page.tsx` 에 `import '../p/portfolio-theme.css'` + `<main className="app-theme …">`. `CalendarView` 색 9곳 — 월 제목 잉크 확대, 네비 `‹ ›` 원형, **오늘=레드 원(`bg-accent`)**, **선택=잉크 링(`ring-ink`)**, **토요일 회색화**(일요일만 `text-accent`, 기존 토요일 파랑 `text-on-status-progress` 제거), 분류칩 연회색(`bg-surface-subtle`+`text-muted`). 상태 점·막대·뱃지는 전역 토큰 상속으로 그대로. `CalendarSubscribe` 는 코드 무수정(토큰 자동 상속).
2. **중보기도 app-theme 통합**(`69a3465`): `app/intercessions/page.tsx` app-theme. `IntercessionsList` — 카드를 **프로젝트·할일 목록과 동일 soft shadow**(`rounded-2xl border border-line bg-surface p-4 shadow-[0_4px_18px_-6px_rgba(34,34,34,0.16)]` — [[mfh-list-card-shadow-pattern]]), **안읽음 표시는 좌측 레드 점 + 카운트만**(기존 `border-primary` 마룬 테두리 제거), 액션 밑줄텍스트→**테두리 알약**(일지쓰기=잉크, 읽음=회색, 삭제=레드 `border-accent`).
3. **캘린더 헤더 중앙 정렬**(`0500213`): `page.tsx` 에서 **PageHeader·부제 제거**(+`pt-4`). `CalendarView` 헤더를 **3분할 grid `grid-cols-[1fr_auto_1fr]`** — 좌측끝 **오늘**, 중앙 **`‹ 2026년 6월 ›`**(화살표가 년월 양옆, 제목 `text-2xl` 고정·`whitespace-nowrap`), 우측끝 **필터**.
4. **홈 하트 아이콘 수정**(`1b575be`): 홈 중보기도 타일의 `HeartIcon` path 가 비대칭·부정확(중앙 계곡 치우침·봉우리 납작)이라 확대 시 찌그러져 보임 → **표준 Lucide outline 하트 path** 로 교체(`width/height/viewBox/stroke` 동일, path 한 줄만).

---

## 핵심 메커니즘 (다음 세션 필수 이해)

**app-theme 통합 패턴**(v2ca 핸드오프에 상세, 요약):
- `main` 에 `app-theme` + `import '../p/portfolio-theme.css'`. `.app-theme` 토큰: `--primary=잉크(#222, 마룬 아님)`, `--accent=레드(#B61821)`. 기존 `text-primary`/`bg-primary`/`ring-primary` 는 app-theme 안에서 **자동 잉크화**되지만, 의도가 강조(레드)면 `text-accent`/`bg-accent`/`ring-? ` 로 명시 교체. 상태색(`status-*`/`on-status-*`)은 `.app-theme` 스코프에 없어 **전역(:root)에서 상속** → 그대로 작동.
- 색 클래스 토큰(`tailwind.config.ts`): `ink=var(--text)`, `accent=var(--accent)`, `muted/faint`, `surface-subtle`, `line`. → `bg-ink/ring-ink/border-ink/text-ink`, `bg-accent/border-accent` 모두 사용 가능.

**캘린더 헤더 중앙 정렬**([app/calendar/CalendarView.tsx]): `grid grid-cols-[1fr_auto_1fr] items-center` — 좌(`justify-self-start`)·중앙(`justify-self-center`)·우(`justify-self-end`). 중앙 그룹이 정확히 중앙에 오고 좌우는 남는 폭 균분. PageHeader 없는 페이지라 `main` 에 `pt-4` 로 상단 여백 보강.

**인라인 SVG 아이콘**([app/page.tsx] `HeartIcon`·`FacebookIcon`): `ModuleIcon`(디자인시스템, `components/ModuleIcon.tsx`)에 없는 아이콘만 인라인. 인라인 path 는 **표준 라이브러리(Lucide/Feather) path 를 쓸 것** — 손으로 만든 좌표는 비대칭·왜곡 위험(이번 하트 사례).

**색 체계**(유지): 캔버스 #fff · 잉크 #222 · 마룬레드 accent #B61821(`text-accent`) · 연틴트 #FAE3E4(`bg-accent-soft`) · 회색 부제 #717171. 상태색 upcoming #F1EFE8/#444 · progress #E6F1FB/#0C447C · done #E1F5EE/#0F6E56. 타이포 절제(semibold 600, extrabold 지양 — [[mfh-airbnb-authentic-design]]).

---

## 다음 세션 (예정 — 우선순위)

1. **디자인 통합은 종료** — 7개 모듈 전부 완료. 추가 디자인 요청 없으면 새 기능 구간으로.
2. **오프라인 3단계(쓰기+동기화)** — v2bv 부터 이월된 백로그 최상위.
3. **버전 3.3.0** — 우진이 이번엔 3.2.0 유지 결정. 추후 의미 있는 묶음 완료 시 재제안([[mfh-design-pass-version-pin]]).

---

## 빌드·검증 함정 (메모리에도 있음)

- **로그인 후 페이지는 preview 캡처 불가** → calendar·intercessions·홈(`/`) 등은 `npm run build` 통과 + 우진 실기. 디자인은 `mcp__visualize__show_widget` 인라인 목업으로 먼저(이번 세션 캘린더·중보기도·하트 다 목업 선검증).
- **위젯 목업 주의**: 다크모드 렌더 → 폰 프레임 안은 실제 앱 색(흰 배경·잉크) 하드코딩으로 재현. 라벨엔 취소선(`<s>`) 대신 `<em>`.
- **PWA SW 캐시**: 실기 시 "앱 완전 종료 후 재실행" 가이드 필수.
- **Dropbox dev stale**: build 로 검증([[mfh-dropbox-dev-hmr-stale]]).
- **push 규칙**: 우진이 명시적으로 "push/푸시" 라고 할 때만. "A"·"진행"·"적용" 등은 작업 승인일 뿐 push 아님.

---

## 백로그
1. 오프라인 3단계(쓰기+동기화) — v2bv 부터 이월(최상위).
2. (보류) 버전 3.3.0 승격 — 3.2.0 유지 중.
3. 후원자·이메일(v3 이후) — 빌드 단계 로드맵상.

---

## 워킹트리 메모 (앱 라인 무관, 그대로 둠)
- `flyers/dongsan-2026-07/` — 동산교회 전단지 작업물(앱 외). `_slim_frame.py` 포함.
- `scripts/measure-usage.ts` — 임시.

*작성: 2026-06-24 세션 종료. 캘린더·중보기도 app-theme 통합으로 디자인 통합 전 구간 완료 + 캘린더 헤더 중앙 정렬 + 홈 하트 아이콘 수정. 앱 3.2.0 유지(우진 "여기까지 3.2.0 포함"). 커밋 `8607764`·`69a3465`·`0500213`·`1b575be`(4개) 전부 main 푸시. 직전 `v2ca` → `docs/archive/`. 다음 = 새 기능 구간(오프라인 3단계 등) 또는 우진 지시.*
